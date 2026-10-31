// CameraService on getUserMedia (docs/06 §1). Rear camera, ideal 1920×1080, no audio.
import {
  type CameraCapabilities,
  CameraError,
  type CameraPermission,
  type CameraService,
  type CameraState,
  type FrameRegion,
  type FrameSize,
  failureFromError,
  type GrabbedFrame,
  type GrabOptions,
  runFrameStream,
} from "./camera-service";

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
};

/** Second try if a device can't meet even the ideal constraints (OverconstrainedError on some webcams). */
const FALLBACK_CONSTRAINTS: MediaStreamConstraints = { audio: false, video: true };

export interface BrowserCameraEnv {
  readonly navigator: Navigator;
  readonly isSecureContext: boolean;
  readonly document: Document;
}

function defaultEnv(): BrowserCameraEnv {
  return { navigator, isSecureContext: window.isSecureContext, document };
}

/** A track's capabilities, read loosely: `torch` isn't in the DOM typings yet. */
function readCapabilities(track: MediaStreamTrack | null): Record<string, unknown> {
  if (track === null || typeof track.getCapabilities !== "function") return {};
  try {
    return track.getCapabilities() as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

function waitForFrames(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => {
      if (video.videoWidth === 0) return;
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new CameraError("busy", "video element failed to play the stream"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("playing", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("playing", done);
    video.addEventListener("error", fail);
  });
}

export function createBrowserCamera(env: BrowserCameraEnv = defaultEnv()): CameraService {
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let state: CameraState = "stopped";
  let canvas: HTMLCanvasElement | null = null;
  let cropResizeWorks = true;
  /** Bumped by every start() and stop(): a start that resolves after a newer call drops its stream. */
  let generation = 0;
  const endedListeners = new Set<() => void>();

  const track = (): MediaStreamTrack | null => stream?.getVideoTracks()[0] ?? null;

  const onTrackEnded = () => {
    release();
    for (const listener of endedListeners) listener();
  };

  function release() {
    const current = stream;
    stream = null;
    state = "stopped";
    if (current !== null) {
      for (const t of current.getTracks()) {
        t.removeEventListener("ended", onTrackEnded);
        t.stop();
      }
    }
    if (video !== null) {
      video.pause();
      video.srcObject = null;
    }
  }

  async function open(): Promise<MediaStream> {
    const media = env.navigator.mediaDevices;
    try {
      return await media.getUserMedia(CONSTRAINTS);
    } catch (error) {
      if ((error as { name?: unknown } | null)?.name === "OverconstrainedError") {
        try {
          return await media.getUserMedia(FALLBACK_CONSTRAINTS);
        } catch (second) {
          throw new CameraError(failureFromError(second), String(second));
        }
      }
      throw new CameraError(failureFromError(error), String(error));
    }
  }

  function regionOrFull(region: FrameRegion | null | undefined): FrameRegion {
    const width = video?.videoWidth ?? 0;
    const height = video?.videoHeight ?? 0;
    if (region === null || region === undefined) return { x: 0, y: 0, width, height };
    const x = Math.max(0, Math.min(width - 1, Math.round(region.x)));
    const y = Math.max(0, Math.min(height - 1, Math.round(region.y)));
    return {
      x,
      y,
      width: Math.max(1, Math.min(width - x, Math.round(region.width))),
      height: Math.max(1, Math.min(height - y, Math.round(region.height))),
    };
  }

  async function grabFrame(options: GrabOptions = {}): Promise<GrabbedFrame> {
    const source = video;
    if (source === null || state !== "live" || source.readyState < 2 || source.videoWidth === 0) {
      throw new Error("no camera frame available");
    }
    const region = regionOrFull(options.region);
    const longest = Math.max(region.width, region.height);
    const scale =
      options.maxSide !== undefined && longest > options.maxSide ? options.maxSide / longest : 1;
    const width = Math.max(1, Math.round(region.width * scale));
    const height = Math.max(1, Math.round(region.height * scale));
    if (cropResizeWorks) {
      try {
        const frame = await createImageBitmap(
          source,
          region.x,
          region.y,
          region.width,
          region.height,
          scale < 1 ? { resizeWidth: width, resizeHeight: height, resizeQuality: "medium" } : {},
        );
        return { frame, region };
      } catch {
        // Some engines reject crop + resize from a video. Fall back to a canvas from now on.
        cropResizeWorks = false;
      }
    }
    canvas ??= env.document.createElement("canvas");
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("2D canvas unavailable");
    context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, width, height);
    return { frame: await createImageBitmap(canvas), region };
  }

  const isSupported = () =>
    env.isSecureContext && typeof env.navigator.mediaDevices?.getUserMedia === "function";

  async function resume(): Promise<void> {
    const current = track();
    if (stream === null || video === null || current === null || current.readyState === "ended") {
      release();
      throw new CameraError("busy", "the stream is gone");
    }
    for (const t of stream.getVideoTracks()) t.enabled = true;
    await video.play();
    state = "live";
  }

  return {
    isSupported,

    async permission(): Promise<CameraPermission> {
      try {
        const status = await env.navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        return status.state;
      } catch {
        return "unknown";
      }
    },

    async start(target) {
      if (!isSupported()) throw new CameraError("unsupported");
      if (stream !== null && video === target && state !== "stopped") {
        await resume();
        return;
      }
      release();
      video = target;
      const mine = ++generation;
      const opened = await open();
      if (mine !== generation) {
        // A newer start() or a stop() came in while the browser was opening the camera.
        for (const t of opened.getTracks()) t.stop();
        throw new CameraError("busy", "superseded");
      }
      stream = opened;
      for (const t of opened.getTracks()) t.addEventListener("ended", onTrackEnded);
      target.muted = true;
      target.playsInline = true;
      target.setAttribute("playsinline", "");
      target.srcObject = opened;
      try {
        await target.play();
        await waitForFrames(target);
      } catch (error) {
        if (mine === generation) release();
        throw error instanceof CameraError ? error : new CameraError("busy", String(error));
      }
      if (mine !== generation) throw new CameraError("busy", "superseded");
      state = "live";
    },

    stop() {
      generation += 1;
      release();
    },

    pause() {
      if (stream === null || state !== "live") return;
      video?.pause();
      for (const t of stream.getVideoTracks()) t.enabled = false;
      state = "paused";
    },

    resume,

    state: () => state,

    capabilities(): CameraCapabilities {
      const caps = readCapabilities(track());
      return { torch: caps.torch === true || Array.isArray(caps.torch) };
    },

    async setTorch(on) {
      const current = track();
      if (current === null) return;
      const constraint = { torch: on } as unknown as MediaTrackConstraintSet;
      await current.applyConstraints({ advanced: [constraint] });
    },

    frameSize(): FrameSize | null {
      if (video === null || video.videoWidth === 0) return null;
      return { width: video.videoWidth, height: video.videoHeight };
    },

    grabFrame,

    frameStream: (options, onFrame) => runFrameStream(grabFrame, options, onFrame),

    onEnded(listener) {
      endedListeners.add(listener);
      return () => endedListeners.delete(listener);
    },
  };
}
