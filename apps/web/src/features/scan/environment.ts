// Small reads of the browser environment the scanner needs: which "turn the camera on" steps to show, and
// whether the dev timing overlay is on. Pure functions over injected strings.
import type { HOWTO } from "./copy";

export type HowToKind = keyof typeof HOWTO;

/** Picks the steps for this browser by user agent, with a generic fallback (docs/design/flows.md §5). */
export function howToKind(userAgent: string, standalone: boolean): HowToKind {
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  if (ios) {
    if (standalone) return "ios-standalone";
    // Chrome, Firefox and Edge on iOS have their own settings; only Safari gets the aA steps.
    return /CriOS|FxiOS|EdgiOS/.test(userAgent) ? "other" : "ios-safari";
  }
  const android = /Android/.test(userAgent);
  const chrome = /Chrome\//.test(userAgent) && !/EdgA|SamsungBrowser|OPR|Firefox/.test(userAgent);
  if (android && chrome) return "android-chrome";
  return "other";
}

export const DEBUG_KEY = "flowerscan.debug";

/** `?debug=perf` turns the timing overlay on for this tab (test-plan gap 10); `?debug=off` turns it off. */
export function debugEnabled(
  search: string,
  session: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
): boolean {
  const value = new URLSearchParams(search).get("debug");
  try {
    if (value === "perf") session?.setItem(DEBUG_KEY, "perf");
    if (value === "off") session?.removeItem(DEBUG_KEY);
    return value === "perf" || (value !== "off" && session?.getItem(DEBUG_KEY) === "perf");
  } catch {
    return value === "perf";
  }
}
