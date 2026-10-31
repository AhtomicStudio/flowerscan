// A CameraService for tests: scripted permission, failures, torch and frames. Never touches a real device.
import {
  type CameraCapabilities,
  CameraError,
  type CameraFailure,
  type CameraPermission,
  type CameraService,
  type CameraState,
  type FrameRegion,
  type FrameSize,
  type GrabbedFrame,
  type GrabOptions,
  runFrameStream,
  type StreamClock,
} from "./camera-service";

/** A stand-in ImageBitmap (jsdom has none). `closed` records close(), `detached` a transfer. */
export interface FakeBitmap {
  width: number;
  height: number;
  closed: boolean;
  close(): void;
}

export function fakeBitmap(width: number, height: number): ImageBitmap & FakeBitmap {
  const bitmap: FakeBitmap = {
    width,
    height,
    closed: false,
    close() {
      bitmap.closed = true;
    },
  };
  return bitmap as unknown as ImageBitmap & FakeBitmap;
}

export interface FakeCameraOptions {
  supported?: boolean;
  permission?: CameraPermission;
  /** The next start() rejects with this failure (then succeeds unless set again). */
  startFailure?: CameraFailure | null;
  torch?: boolean;
  size?: FrameSize;
  clock?: StreamClock;
}

export class FakeCamera implements CameraService {
  supported: boolean;
  permissionState: CameraPermission;
  startFailure: CameraFailure | null;
  torch: boolean;
  torchOn = false;
  size: FrameSize;
  readonly calls: string[] = [];
  readonly grabs: GrabOptions[] = [];
  readonly bitmaps: (ImageBitmap & FakeBitmap)[] = [];
  /** Resolve a pending start() by hand (set `holdStart` first). */
  holdStart = false;
  private pendingStart: (() => void) | null = null;
  private current: CameraState = "stopped";
  private readonly ended = new Set<() => void>();
  private readonly clock: StreamClock | undefined;

  constructor(options: FakeCameraOptions = {}) {
    this.supported = options.supported ?? true;
    this.permissionState = options.permission ?? "granted";
    this.startFailure = options.startFailure ?? null;
    this.torch = options.torch ?? false;
    this.size = options.size ?? { width: 1080, height: 1920 };
    this.clock = options.clock;
  }

  isSupported(): boolean {
    return this.supported;
  }

  async permission(): Promise<CameraPermission> {
    this.calls.push("permission");
    return this.permissionState;
  }

  async start(_video: HTMLVideoElement): Promise<void> {
    this.calls.push("start");
    if (!this.supported) throw new CameraError("unsupported");
    if (this.startFailure !== null) {
      const failure = this.startFailure;
      this.startFailure = null;
      if (failure === "denied") this.permissionState = "denied";
      throw new CameraError(failure);
    }
    if (this.holdStart) {
      await new Promise<void>((resolve) => {
        this.pendingStart = resolve;
      });
    }
    this.permissionState = "granted";
    this.current = "live";
  }

  /** Finishes a held start(). */
  releaseStart(): void {
    this.holdStart = false;
    this.pendingStart?.();
    this.pendingStart = null;
  }

  stop(): void {
    this.calls.push("stop");
    this.current = "stopped";
    this.torchOn = false;
  }

  pause(): void {
    if (this.current !== "live") return;
    this.calls.push("pause");
    this.current = "paused";
  }

  async resume(): Promise<void> {
    this.calls.push("resume");
    if (this.current === "stopped") throw new CameraError("busy", "the stream is gone");
    this.current = "live";
  }

  state(): CameraState {
    return this.current;
  }

  capabilities(): CameraCapabilities {
    return { torch: this.torch && this.current !== "stopped" };
  }

  async setTorch(on: boolean): Promise<void> {
    this.calls.push(`torch:${on}`);
    this.torchOn = on;
  }

  frameSize(): FrameSize | null {
    return this.current === "stopped" ? null : this.size;
  }

  async grabFrame(options: GrabOptions = {}): Promise<GrabbedFrame> {
    if (this.current !== "live") throw new Error("no camera frame available");
    this.grabs.push(options);
    const region: FrameRegion = options.region ?? {
      x: 0,
      y: 0,
      width: this.size.width,
      height: this.size.height,
    };
    const longest = Math.max(region.width, region.height);
    const scale =
      options.maxSide !== undefined && longest > options.maxSide ? options.maxSide / longest : 1;
    const frame = fakeBitmap(Math.round(region.width * scale), Math.round(region.height * scale));
    this.bitmaps.push(frame);
    return { frame, region };
  }

  frameStream(
    options: Parameters<CameraService["frameStream"]>[0],
    onFrame: Parameters<CameraService["frameStream"]>[1],
  ): Promise<void> {
    return runFrameStream((o) => this.grabFrame(o), options, onFrame, this.clock);
  }

  onEnded(listener: () => void): () => void {
    this.ended.add(listener);
    return () => this.ended.delete(listener);
  }

  /** Simulates the browser ending the track (camera unplugged, permission revoked). */
  endTrack(): void {
    this.current = "stopped";
    for (const listener of this.ended) listener();
  }
}
