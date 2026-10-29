import { useEffect, useState } from "react";

/** Root font size at or above 150% of 16 px (docs/design "Large text and small screens"). */
const LARGE_TEXT_PX = 24;

function isLargeText(): boolean {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return false;
  const size = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size >= LARGE_TEXT_PX;
}

/** True while the user's text size is ≥ 150%. Re-checked on resize (zoom changes fire it). */
export function useLargeText(): boolean {
  const [large, setLarge] = useState(isLargeText);
  useEffect(() => {
    const update = () => setLarge(isLargeText());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return large;
}
