// Stage timings against the docs/06 budgets. performance.mark names follow test-plan gap 10; the numbers
// also feed the `?debug=perf` overlay, which is how stage budgets get read on an iPhone (no remote
// inspector from Windows). Nothing here leaves the device.
import { createStore, type StoreApi } from "zustand/vanilla";
import type { DetectorEngine } from "../../platform/detectors/protocol";

export interface PerfStats {
  readonly engine: DetectorEngine | null;
  /** Tap (or boot) → first frame playing. Budget ≤ 800 ms. */
  readonly cameraReadyMs: number | null;
  /** Worker decode time of the last frame. */
  readonly decodeMs: number | null;
  /** Grab → result of the last frame, main-thread view. */
  readonly roundTripMs: number | null;
  /** Detection frames per second over the last second. Target ≥ 8. */
  readonly fps: number | null;
  /** First decode of the winning code → accepted (stability gate passed). Budget ≤ 300 ms. */
  readonly detectMs: number | null;
  /** Size of the last shutter crop, frame px. */
  readonly lastCrop: { readonly width: number; readonly height: number } | null;
  /** Shutter → text back from readLabel. Budget ≤ 1200 ms warm. */
  readonly readMs: number | null;
  /** match + decide. Budget ≤ 50 ms. */
  readonly decideMs: number | null;
  readonly luma: number | null;
}

export const EMPTY_PERF: PerfStats = {
  engine: null,
  cameraReadyMs: null,
  decodeMs: null,
  roundTripMs: null,
  fps: null,
  detectMs: null,
  lastCrop: null,
  readMs: null,
  decideMs: null,
  luma: null,
};

export function createPerfStore(): StoreApi<PerfStats> {
  return createStore<PerfStats>()(() => EMPTY_PERF);
}

export type PerfMark =
  | "camera:request"
  | "camera:ready"
  | "detect:accept"
  | "ocr:start"
  | "ocr:end"
  | "decide:end"
  | "result:visible";

export function mark(name: PerfMark): void {
  try {
    performance.mark(name);
  } catch {
    // Marks are diagnostics only.
  }
}

/** Counts frames in a sliding one-second window. */
export class FpsMeter {
  private readonly times: number[] = [];
  tick(now: number): number {
    this.times.push(now);
    while (this.times.length > 0 && now - (this.times[0] ?? now) > 1000) this.times.shift();
    return this.times.length;
  }
  reset(): void {
    this.times.length = 0;
  }
}
