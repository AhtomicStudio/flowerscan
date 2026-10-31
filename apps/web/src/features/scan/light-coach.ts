// "More light" coaching (docs/design/screens/scanner.md, Coaching): shown after the frame has been dark
// for a while, and held at least 1.5 s so it can be read. One message at a time.

/** Mean luma (0–255) below which a frame counts as dark, and above which it counts as bright again. */
export const DARK_LUMA = 45;
export const BRIGHT_LUMA = 65;
/** Dark this long before the hint shows; shown at least this long once it does. */
export const COACH_AFTER_MS = 1500;
export const COACH_HOLD_MS = 1500;

export class LightCoach {
  private darkSince: number | null = null;
  private shownAt: number | null = null;

  /** Feed one measurement; returns whether the hint should show now. */
  observe(luma: number | null, now: number): boolean {
    if (luma === null) return this.shownAt !== null;
    if (luma < DARK_LUMA) this.darkSince ??= now;
    else if (luma > BRIGHT_LUMA) this.darkSince = null;

    if (this.shownAt === null) {
      if (this.darkSince !== null && now - this.darkSince >= COACH_AFTER_MS) this.shownAt = now;
    } else if (this.darkSince === null && now - this.shownAt >= COACH_HOLD_MS) {
      this.shownAt = null;
    }
    return this.shownAt !== null;
  }

  reset(): void {
    this.darkSince = null;
    this.shownAt = null;
  }
}
