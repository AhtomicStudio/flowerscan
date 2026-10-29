// Age gate state (docs/design/screens/age-gate.md, D8). The clock and storage are injected.

/** The one place the minimum age lives (docs/09: 21+ in the US; other markets read it from config later). */
export const MIN_AGE = 21;

/** Leave keeps the app closed on this device for this long (D8). */
export const DECLINE_BLOCK_MS = 24 * 60 * 60 * 1000;

/** Settings field names from docs/04, namespaced in localStorage until the settings store exists (T-015). */
export const AGE_CONFIRMED_KEY = "flowerscan.age_confirmed_at";
export const AGE_DECLINED_KEY = "flowerscan.age_declined_at";

export type Clock = () => Date;

/** What the gate needs from storage. localStorage fits; a Map-backed fallback covers private modes. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type GateStatus = "ask" | "confirmed" | "blocked";

function parseTime(value: string | null): number | null {
  if (value === null) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/** Blocked while 0 ≤ now − declined < 24 h; otherwise confirmed if confirmed; otherwise ask. */
export function gateStatus(store: KeyValueStore, now: Date): GateStatus {
  const declined = parseTime(store.getItem(AGE_DECLINED_KEY));
  if (declined !== null) {
    const elapsed = now.getTime() - declined;
    if (elapsed >= 0 && elapsed < DECLINE_BLOCK_MS) return "blocked";
  }
  if (declined === null && parseTime(store.getItem(AGE_CONFIRMED_KEY)) !== null) return "confirmed";
  return "ask";
}

/** "I'm 21 or older": remember it and clear any old Leave. */
export function confirmAge(store: KeyValueStore, now: Date): void {
  store.setItem(AGE_CONFIRMED_KEY, now.toISOString());
  store.removeItem(AGE_DECLINED_KEY);
}

/** "Leave": block for 24 hours and forget any earlier confirmation. */
export function declineAge(store: KeyValueStore, now: Date): void {
  store.setItem(AGE_DECLINED_KEY, now.toISOString());
  store.removeItem(AGE_CONFIRMED_KEY);
}

/** In-memory store: the answer lasts for this session only, and the gate asks again next visit. */
export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/**
 * localStorage when it works, else memory. Each call is guarded, so a storage that throws mid-session
 * (quota, privacy mode) falls back to memory without an error the user can't act on.
 */
export function deviceStore(): KeyValueStore {
  const memory = memoryStore();
  let local: Storage | null = null;
  try {
    local = window.localStorage;
    const probe = "flowerscan.probe";
    local.setItem(probe, "1");
    local.removeItem(probe);
  } catch {
    local = null;
  }
  if (local === null) return memory;
  const storage = local;
  return {
    getItem: (key) => {
      try {
        return storage.getItem(key) ?? memory.getItem(key);
      } catch {
        return memory.getItem(key);
      }
    },
    setItem: (key, value) => {
      memory.setItem(key, value);
      try {
        storage.setItem(key, value);
      } catch {
        // Memory keeps it for this session.
      }
    },
    removeItem: (key) => {
      memory.removeItem(key);
      try {
        storage.removeItem(key);
      } catch {
        // Already gone from memory.
      }
    },
  };
}
