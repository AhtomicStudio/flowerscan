// The camera behind one small interface (docs/06 §1). Features talk to this, never to getUserMedia directly,
// so every screen state can be tested with FakeCamera. Frames never leave the device: they go to our own
// workers only.

/** Why the camera can't run. Each one has its own panel on the scanner (docs/design/flows.md §5). */
export type CameraFailure = "denied" | "not-found" | "busy" | "unsupported";

/** `permissions.query({ name: "camera" })`, or "unknown" where the browser can't say (Firefox, old Safari). */
export type CameraPermission = "granted" | "prompt" | "denied" | "unknown";

export type CameraState = "stopped" | "live" | "paused";

export class CameraError extends Error {
  override readonly name = "CameraError";
  constructor(
    readonly failure: CameraFailure,
    message: string = failure,
  ) {
    super(message);
  }
}

/** A rectangle in video pixels (the camera frame's own coordinates). */
export interface FrameRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FrameSize {
  readonly width: number;
  readonly height: number;
}

export interface CameraCapabilities {
  /** The track reports a torch (mostly Android Chrome). The toggle is hidden otherwise. */
  readonly torch: boolean;
}

export interface GrabOptions {
  /** Crop to this region (video pixels). Default: the whole frame. */
  readonly region?: FrameRegion | null | undefined;
  /** Downscale so the longer side is at most this many pixels. Default: no downscale. */
  readonly maxSide?: number | undefined;
}

export interface GrabbedFrame {
  readonly frame: ImageBitmap;
  /** The region the bitmap covers, in video pixels (the bitmap may be smaller if downscaled). */
  readonly region: FrameRegion;
}

export interface FrameStreamOptions {
  /** Target rate. Frames are grabbed one at a time: a slow consumer lowers the rate, never queues. */
  readonly fps: number;
  readonly signal: AbortSignal;
  /** Read on every frame, so it follows resizes. null → the whole frame. */
  readonly region?: (() => FrameRegion | null) | undefined;
  readonly maxSide?: number | undefined;
}

export interface CameraService {
  /** getUserMedia exists and the page is a secure context. */
  isSupported(): boolean;
  permission(): Promise<CameraPermission>;
  /** Opens the rear camera into `video` and resolves once frames are playing. Throws CameraError. */
  start(video: HTMLVideoElement): Promise<void>;
  /** Releases the camera (the indicator light goes off). */
  stop(): void;
  /** Stops delivering frames but keeps the stream, so resume() is instant. */
  pause(): void;
  /** Resumes a paused stream. Throws CameraError if the stream is gone (call start() again). */
  resume(): Promise<void>;
  state(): CameraState;
  capabilities(): CameraCapabilities;
  setTorch(on: boolean): Promise<void>;
  /** Intrinsic frame size, or null before the first frame. */
  frameSize(): FrameSize | null;
  /** The current frame, cropped and/or downscaled. The caller owns (and closes or transfers) the bitmap. */
  grabFrame(options?: GrabOptions): Promise<GrabbedFrame>;
  /**
   * Calls `onFrame` about `fps` times a second until `signal` aborts. The next frame is grabbed only after
   * `onFrame` settles, so frames are dropped while the consumer is busy.
   */
  frameStream(
    options: FrameStreamOptions,
    onFrame: (grabbed: GrabbedFrame) => Promise<void>,
  ): Promise<void>;
  /** Called when the browser ends the track by itself (camera unplugged, permission revoked). */
  onEnded(listener: () => void): () => void;
}

/** Timing for frameStream, injectable so the loop runs under fake timers. */
export interface StreamClock {
  now(): number;
  sleep(ms: number, signal: AbortSignal): Promise<void>;
}

export const systemStreamClock: StreamClock = {
  now: () => performance.now(),
  sleep: (ms, signal) =>
    new Promise<void>((resolve) => {
      if (signal.aborted) return resolve();
      const timer = setTimeout(done, ms);
      function done() {
        signal.removeEventListener("abort", done);
        clearTimeout(timer);
        resolve();
      }
      signal.addEventListener("abort", done, { once: true });
    }),
};

/**
 * The shared frame loop: grab → consumer → wait out the rest of the interval. A failed grab (no frame yet,
 * stream paused) is skipped, not fatal.
 */
export async function runFrameStream(
  grab: (options: GrabOptions) => Promise<GrabbedFrame>,
  options: FrameStreamOptions,
  onFrame: (grabbed: GrabbedFrame) => Promise<void>,
  clock: StreamClock = systemStreamClock,
): Promise<void> {
  const interval = 1000 / Math.max(1, options.fps);
  const { signal } = options;
  while (!signal.aborted) {
    const started = clock.now();
    let grabbed: GrabbedFrame | null = null;
    try {
      grabbed = await grab({ region: options.region?.() ?? null, maxSide: options.maxSide });
    } catch {
      grabbed = null;
    }
    if (grabbed !== null) {
      if (signal.aborted) {
        grabbed.frame.close();
        break;
      }
      await onFrame(grabbed);
    }
    const wait = interval - (clock.now() - started);
    await clock.sleep(Math.max(wait, grabbed === null ? interval : 0), signal);
  }
}

/** Maps a getUserMedia rejection to the panel we show (docs/design/flows.md §5). */
export function failureFromError(error: unknown): CameraFailure {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "not-found";
    case "SecurityError":
    case "TypeError":
    case "NotSupportedError":
      return "unsupported";
    default:
      // NotReadableError, AbortError, TrackStartError and anything unexpected: "busy" offers Try again.
      return "busy";
  }
}
