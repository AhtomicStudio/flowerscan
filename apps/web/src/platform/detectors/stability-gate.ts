// Stability gate (docs/06 §2): accept a value only after it has been seen in 2 of the last 3 frames. A frame
// with nothing in it still counts as a frame, so a one-frame misread can never pass.
import type { DetectedCode } from "./protocol";

export const GATE_WINDOW = 3;
export const GATE_REQUIRED = 2;

/** One key per (format, value): an EAN-13 and a QR with the same digits are different codes. */
export function codeKey(code: Pick<DetectedCode, "format" | "value">): string {
  return `${code.format}\u0000${code.value}`;
}

export class StabilityGate {
  private readonly frames: Map<string, DetectedCode>[] = [];

  constructor(
    private readonly window = GATE_WINDOW,
    private readonly required = GATE_REQUIRED,
  ) {}

  /**
   * Adds one frame's codes and returns every code that is now stable, each with its most recent box. A
   * code repeated inside one frame counts once.
   */
  push(codes: readonly DetectedCode[]): DetectedCode[] {
    const frame = new Map<string, DetectedCode>();
    for (const code of codes) frame.set(codeKey(code), code);
    this.frames.push(frame);
    if (this.frames.length > this.window) this.frames.shift();

    const stable: DetectedCode[] = [];
    const counted = new Set<string>();
    // Newest frame first, so the box we return is the latest one.
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const current = this.frames[i];
      if (current === undefined) continue;
      for (const [key, code] of current) {
        if (counted.has(key)) continue;
        counted.add(key);
        const seen = this.frames.filter((f) => f.has(key)).length;
        if (seen >= this.required) stable.push(code);
      }
    }
    return stable;
  }

  reset(): void {
    this.frames.length = 0;
  }
}
