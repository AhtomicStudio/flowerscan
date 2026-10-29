import type { MouseEvent } from "react";
import type { NavState } from "../app/router";

/**
 * Where the result flood should start: the tap point, or the center of the activated element for keyboard
 * clicks (which report 0, 0). Fractions of the viewport, so it survives a resize.
 */
export function floodFrom(event: MouseEvent<HTMLElement>): NavState {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  let x = event.clientX;
  let y = event.clientY;
  if (event.detail === 0 || (x === 0 && y === 0)) {
    const rect = event.currentTarget.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return { flood: { x: clamp(x / width), y: clamp(y / height) } };
}
