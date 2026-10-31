// A CodeDetector for tests. `next` decides what each frame "contains"; frames are closed like a transfer.
import type { CodeDetector, DetectionResult } from "./code-detector";
import type { DetectedCode, DetectorEngine } from "./protocol";

export type FrameScript = (frameIndex: number) => readonly DetectedCode[];

export class FakeDetector implements CodeDetector {
  engine: DetectorEngine;
  script: FrameScript;
  luma: number | null = 128;
  ms = 12;
  frames = 0;
  disposed = false;
  /** Make detect() reject (worker crash) while true. */
  failing = false;

  constructor(script: FrameScript = () => [], engine: DetectorEngine = "polyfill") {
    this.script = script;
    this.engine = engine;
  }

  /** Every frame contains these codes. */
  show(...codes: DetectedCode[]): void {
    this.script = () => codes;
  }

  /** Nothing in view. */
  clear(): void {
    this.script = () => [];
  }

  async ready(): Promise<DetectorEngine> {
    return this.engine;
  }

  async detect(frame: ImageBitmap): Promise<DetectionResult> {
    const index = this.frames++;
    frame.close();
    if (this.failing) throw new Error("detection worker crashed");
    return { codes: this.script(index), ms: this.ms, luma: this.luma, engine: this.engine };
  }

  dispose(): void {
    this.disposed = true;
  }
}

/** A code centered in a 1080×1920 frame unless a box is given. */
export function code(
  format: DetectedCode["format"],
  value: string,
  box: DetectedCode["box"] = { x: 390, y: 810, width: 300, height: 300 },
): DetectedCode {
  return { format, value, box };
}
