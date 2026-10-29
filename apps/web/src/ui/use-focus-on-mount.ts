import { type RefObject, useEffect } from "react";

/**
 * Moves focus to `ref` when the screen mounts (route change focus management, SC 2.4.3). Headings get
 * tabIndex={-1} so they can take focus without becoming tab stops.
 */
export function useFocusOnMount(ref: RefObject<HTMLElement | null>, key?: unknown): void {
  useEffect(() => {
    // `key` re-runs the focus when the same screen shows new content (another strain).
    void key;
    ref.current?.focus({ preventScroll: true });
  }, [ref, key]);
}
