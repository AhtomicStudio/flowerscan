import { describe, expect, it, vi } from "vitest";
import {
  AGE_CONFIRMED_KEY,
  AGE_DECLINED_KEY,
  confirmAge,
  DECLINE_BLOCK_MS,
  declineAge,
  deviceStore,
  gateStatus,
  MIN_AGE,
  memoryStore,
} from "./age-gate";

const T0 = new Date("2026-10-29T12:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

describe("age gate state", () => {
  it("asks on a first visit", () => {
    expect(gateStatus(memoryStore(), T0)).toBe("ask");
  });

  it("remembers a confirmation", () => {
    const store = memoryStore();
    confirmAge(store, T0);
    expect(store.getItem(AGE_CONFIRMED_KEY)).toBe(T0.toISOString());
    expect(gateStatus(store, at(365 * 24 * 3600 * 1000))).toBe("confirmed");
  });

  it("blocks for 24 hours after Leave, then asks again", () => {
    const store = memoryStore();
    confirmAge(store, T0);
    declineAge(store, T0);
    expect(store.getItem(AGE_CONFIRMED_KEY)).toBeNull();
    expect(gateStatus(store, T0)).toBe("blocked");
    expect(gateStatus(store, at(DECLINE_BLOCK_MS - 1))).toBe("blocked");
    expect(gateStatus(store, at(DECLINE_BLOCK_MS))).toBe("ask");
  });

  it("asks (never unblocks to the app) when the stored Leave is in the future or unreadable", () => {
    const store = memoryStore();
    store.setItem(AGE_DECLINED_KEY, at(60_000).toISOString());
    expect(gateStatus(store, T0)).toBe("ask");
    store.setItem(AGE_DECLINED_KEY, "not a date");
    expect(gateStatus(store, T0)).toBe("ask");
  });

  it("clears an old Leave when the user confirms", () => {
    const store = memoryStore();
    declineAge(store, T0);
    confirmAge(store, at(DECLINE_BLOCK_MS + 1));
    expect(store.getItem(AGE_DECLINED_KEY)).toBeNull();
    expect(gateStatus(store, at(DECLINE_BLOCK_MS + 2))).toBe("confirmed");
  });

  it("falls back to memory when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      const store = deviceStore();
      confirmAge(store, T0);
      expect(gateStatus(store, T0)).toBe("confirmed");
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps the age in one constant", () => {
    expect(MIN_AGE).toBe(21);
  });
});
