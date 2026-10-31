// Live detection (docs/06 §2): frames at about 10 fps → worker → stability gate → cooldown filter → the
// scanner's onStable. One frame in flight at a time, so frames are dropped while the worker is busy.
import type { CameraService, FrameRegion } from "../../platform/camera/camera-service";
import type { CodeDetector } from "../../platform/detectors/code-detector";
import type { DetectedCode, DetectorEngine } from "../../platform/detectors/protocol";
import { codeKey, GATE_WINDOW, StabilityGate } from "../../platform/detectors/stability-gate";
import type { CodeCooldown } from "./code-cooldown";
import { bitmapBoxToFrame } from "./geometry";

export const DETECT_FPS = 10;
/** Longest side of a detection frame. Enough for UPC bars at arm's length, light on the polyfill. */
export const DETECT_MAX_SIDE = 1280;
/** Measure brightness every Nth frame (the "More light" hint doesn't need more). */
export const LIGHT_EVERY = 3;

export interface FrameStats {
  readonly engine: DetectorEngine;
  /** Decode time in the worker. */
  readonly decodeMs: number;
  /** Grab → result, main-thread view. */
  readonly roundTripMs: number;
  readonly luma: number | null;
}

export interface StableMeta {
  /** ms from the first frame the winner was decoded in to now (the "detect after in view" budget). */
  readonly sinceFirstSeen: (key: string) => number | null;
}

export interface DetectionLoopDeps {
  readonly camera: CameraService;
  readonly detector: CodeDetector;
  readonly cooldown: CodeCooldown;
  readonly now: () => number;
  /** Where to look, in frame px (the visible part of the video). */
  readonly region: () => FrameRegion | null;
  readonly fps?: number;
  /**
   * Called with the codes that are stable and not muted. Resolve true to stop the loop (lock-on), false
   * to keep looking (every code turned out to be a misread).
   */
  readonly onStable: (codes: readonly DetectedCode[], meta: StableMeta) => Promise<boolean>;
  readonly onFrame?: (stats: FrameStats) => void;
}

/** Runs until `signal` aborts or onStable accepts. Never throws: a failed frame is skipped. */
export async function runDetectionLoop(
  deps: DetectionLoopDeps,
  signal: AbortSignal,
): Promise<void> {
  const gate = new StabilityGate();
  /** key → when it was first decoded, and the last frame it was in (forgotten after a gate window). */
  const firstSeen = new Map<string, { at: number; frame: number }>();
  const stop = new AbortController();
  const abort = () => stop.abort();
  signal.addEventListener("abort", abort, { once: true });
  let frameIndex = 0;
  try {
    await deps.camera.frameStream(
      {
        fps: deps.fps ?? DETECT_FPS,
        signal: stop.signal,
        region: deps.region,
        maxSide: DETECT_MAX_SIDE,
      },
      async ({ frame, region }) => {
        const grabbedAt = deps.now();
        // Read the size before the transfer detaches the bitmap.
        const size = { width: frame.width, height: frame.height };
        const measureLight = frameIndex % LIGHT_EVERY === 0;
        frameIndex += 1;
        let result: Awaited<ReturnType<CodeDetector["detect"]>>;
        try {
          result = await deps.detector.detect(frame, { measureLight });
        } catch {
          return;
        }
        if (stop.signal.aborted) return;
        const now = deps.now();
        deps.onFrame?.({
          engine: result.engine,
          decodeMs: result.ms,
          roundTripMs: now - grabbedAt,
          luma: result.luma,
        });
        const codes = result.codes.map((code) => ({
          ...code,
          box: bitmapBoxToFrame(code.box, region, size),
        }));
        const keys = new Set(codes.map(codeKey));
        for (const key of keys) {
          firstSeen.set(key, { at: firstSeen.get(key)?.at ?? grabbedAt, frame: frameIndex });
        }
        for (const [key, seen] of firstSeen) {
          if (frameIndex - seen.frame >= GATE_WINDOW) firstSeen.delete(key);
        }
        deps.cooldown.observe(keys, now);
        const stable = gate.push(codes).filter((code) => !deps.cooldown.isMuted(codeKey(code)));
        if (stable.length === 0) return;
        const accepted = await deps.onStable(stable, {
          sinceFirstSeen: (key) => {
            const seen = firstSeen.get(key);
            return seen === undefined ? null : deps.now() - seen.at;
          },
        });
        if (accepted) stop.abort();
      },
    );
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
