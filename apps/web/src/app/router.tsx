// A tiny history-based router (no dependency): three routes, push/replace, back, and links.
import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from "react";

/** What we keep in history.state for in-app entries. */
export interface NavState {
  /** How many entries back the search screen is (0 on search itself). Absent on direct visits. */
  readonly depth?: number;
  /** Where the result flood starts, as fractions of the viewport (the tapped row). */
  readonly flood?: { readonly x: number; readonly y: number };
}

export type Route =
  | { readonly name: "search" }
  | { readonly name: "result"; readonly id: string }
  | { readonly name: "about" }
  | { readonly name: "not-found" };

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "search" };
  if (path === "/about") return { name: "about" };
  const strain = /^\/s\/([^/]+)$/.exec(path);
  if (strain?.[1] !== undefined) {
    try {
      return { name: "result", id: decodeURIComponent(strain[1]) };
    } catch {
      return { name: "not-found" };
    }
  }
  return { name: "not-found" };
}

export const strainPath = (id: string) => `/s/${encodeURIComponent(id)}`;

const NAVIGATE_EVENT = "flowerscan:navigate";
let version = 0;

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    version += 1;
    onChange();
  };
  window.addEventListener("popstate", handler);
  window.addEventListener(NAVIGATE_EVENT, handler);
  return () => {
    window.removeEventListener("popstate", handler);
    window.removeEventListener(NAVIGATE_EVENT, handler);
  };
}

/** Re-renders on every navigation. Read the URL and state with currentLocation(). */
export function useLocationVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}

export function currentNavState(): NavState {
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null) return {};
  const { depth, flood } = state as Record<string, unknown>;
  const out: { depth?: number; flood?: { x: number; y: number } } = {};
  if (typeof depth === "number" && Number.isInteger(depth) && depth >= 0) out.depth = depth;
  if (typeof flood === "object" && flood !== null) {
    const { x, y } = flood as Record<string, unknown>;
    if (typeof x === "number" && typeof y === "number") out.flood = { x, y };
  }
  return out;
}

export function navigate(to: string, options: { replace?: boolean; state?: NavState } = {}): void {
  const state = options.state ?? {};
  if (options.replace) window.history.replaceState(state, "", to);
  else {
    window.history.pushState(state, "", to);
    window.scrollTo(0, 0);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** The depth a new entry pushed from the current one should get, or undefined if search isn't behind us. */
export function nextDepth(): number | undefined {
  const { depth } = currentNavState();
  if (matchRoute(window.location.pathname).name === "search") return 1;
  return depth === undefined ? undefined : depth + 1;
}

let searchReset = false;

/** True once after returnToSearch({ reset: true }): the search screen clears its query. */
export function consumeSearchReset(): boolean {
  const reset = searchReset;
  searchReset = false;
  return reset;
}

/**
 * Returns to the search screen: back through history when search is behind us in this tab, otherwise
 * replaces this entry with "/". `reset` empties the field ("Search another").
 */
export function returnToSearch({ reset = false }: { reset?: boolean } = {}): void {
  searchReset = reset;
  const { depth } = currentNavState();
  if (depth !== undefined && depth > 0) window.history.go(-depth);
  else navigate("/", { replace: true, state: { depth: 0 } });
}

/** Back one entry when it's ours, otherwise to search. */
export function goBack(): void {
  const { depth } = currentNavState();
  if (depth !== undefined && depth > 0) window.history.back();
  else navigate("/", { replace: true, state: { depth: 0 } });
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  /** Extra state for the new entry (depth is filled in). */
  navState?: (event: MouseEvent<HTMLAnchorElement>) => NavState;
};

/** An <a> that navigates in-app on a plain click and works as a normal link otherwise. */
export function Link({ href, navState, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        const depth = nextDepth();
        const extra = navState?.(event) ?? {};
        navigate(href, { state: depth === undefined ? extra : { ...extra, depth } });
      }}
      {...rest}
    />
  );
}
