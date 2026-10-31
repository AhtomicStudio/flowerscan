// Same-code cooldown (docs/design/screens/scanner.md, D6): after a result or sheet that came from a code
// closes, that code is ignored until it has been out of view for 1.5 s. Other codes detect normally.

export const COOLDOWN_MS = 1500;

export class CodeCooldown {
  /** key → when it was last seen (or when the cooldown started / resumed). */
  private readonly muted = new Map<string, number>();

  constructor(private readonly outOfViewMs = COOLDOWN_MS) {}

  /** Starts ignoring `key`, counting from `now`. */
  mute(key: string, now: number): void {
    this.muted.set(key, now);
  }

  /**
   * The scanner was paused (sheet, result, hidden tab) and is live again: time spent away doesn't count as
   * "out of view", so every cooldown restarts from `now`.
   */
  resume(now: number): void {
    for (const key of this.muted.keys()) this.muted.set(key, now);
  }

  /** One live frame: muted codes in view stay muted; ones gone for 1.5 s are released. */
  observe(keysInView: ReadonlySet<string>, now: number): void {
    for (const [key, lastSeen] of this.muted) {
      if (keysInView.has(key)) this.muted.set(key, now);
      else if (now - lastSeen >= this.outOfViewMs) this.muted.delete(key);
    }
  }

  isMuted(key: string): boolean {
    return this.muted.has(key);
  }

  clear(): void {
    this.muted.clear();
  }
}
