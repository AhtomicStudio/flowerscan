import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom doesn't implement scrolling; the app only calls it for convenience, so no-ops are enough.
window.scrollTo = () => {};
Element.prototype.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

// Vitest runs without globals, so Testing Library can't register its own cleanup.
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});
