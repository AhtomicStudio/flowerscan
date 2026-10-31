// Haptic tick on lock-on (docs/08): 10 ms, only where navigator.vibrate exists (Android Chromium; iOS Safari
// has none), and only after the user's first tap (sticky activation). Settings can turn it off (T-017).

export interface Haptics {
  tick(): void;
}

export interface HapticsEnv {
  readonly vibrate?: ((pattern: number | number[]) => boolean) | undefined;
  /** navigator.userActivation.hasBeenActive; undefined where the API is missing. */
  readonly hasBeenActive?: (() => boolean | undefined) | undefined;
  readonly enabled?: (() => boolean) | undefined;
}

export const LOCK_ON_VIBRATE_MS = 10;

function browserEnv(): HapticsEnv {
  const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  return {
    vibrate: typeof nav.vibrate === "function" ? (pattern) => nav.vibrate(pattern) : undefined,
    hasBeenActive: () => nav.userActivation?.hasBeenActive,
  };
}

export function createHaptics(env: HapticsEnv = browserEnv()): Haptics {
  return {
    tick() {
      if (env.vibrate === undefined) return;
      if (env.enabled !== undefined && !env.enabled()) return;
      // Where userActivation is missing we can't tell; vibrate() itself is ignored without activation.
      if (env.hasBeenActive?.() === false) return;
      try {
        env.vibrate(LOCK_ON_VIBRATE_MS);
      } catch {
        // Never let a haptic break a scan.
      }
    },
  };
}

/** Records ticks for tests. */
export class FakeHaptics implements Haptics {
  ticks = 0;
  tick(): void {
    this.ticks += 1;
  }
}
