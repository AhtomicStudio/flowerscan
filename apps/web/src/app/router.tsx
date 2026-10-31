// A tiny history-based router (no dependency): a few routes, push/replace, back, and links.
// The scanner is home (`/`, also `/scan`); search, strain results and About are pushed on top of it.
import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from "react";

/** What we keep in history.state for in-app entries. */
export interface PackageResultState {
  readonly label: "indica" | "sativa" | "hybrid";
  readonly name: string;
}

export interface NavState {
  /** How many entries back the scanner (home) is (0 on home itself). Absent on direct visits. */
  readonly depth?: number;
  /** True when this entry was pushed in-app, so browser back stays inside the app. */
  readonly canGoBack?: boolean;
  /** Where the result flood starts, as fractions of the viewport (the tapped row, code, or shutter). */
  readonly flood?: { readonly x: number; readonly y: number };
  /** The result was opened by the scanner: it renders over the paused scanner (D13). */
  readonly fromScan?: boolean;
  /** The scan that opened this result taught barcode memory (the result says so). */
  readonly learned?: boolean;
  /** A modal sheet's own history entry (browser back closes the sheet first). */
  readonly sheet?: boolean;
  /** Fallback result read directly from the package label when the strain isn't in our database yet. */
  readonly packageResult?: PackageResultState;
}

export type Route =
  | { readonly name: "scan" }
  | { readonly name: "search" }
  | { readonly name: "result"; readonly id: string }
  | { readonly name: "about" }
  | { readonly name: "not-found" };

export const HOME_PATH = "/";
export const SEARCH_PATH = "/search";

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/scan") return { name: "scan" };
  if (path === SEARCH_PATH) return { name: "search" };
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

export const searchPath = (query?: string) =>
  query === undefined || query.trim() === ""
    ? SEARCH_PATH
    : `${SEARCH_PATH}?q=${encodeURIComponent(query)}`;

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
  const { depth, canGoBack, flood, fromScan, learned, sheet, packageResult } = state as Record<
    string,
    unknown
  >;
  const out: {
    depth?: number;
    canGoBack?: boolean;
    flood?: { x: number; y: number };
    fromScan?: boolean;
    learned?: boolean;
    sheet?: boolean;
    packageResult?: PackageResultState;
  } = {};
  if (typeof depth === "number" && Number.isInteger(depth) && depth >= 0) out.depth = depth;
  if (canGoBack === true) out.canGoBack = true;
  if (typeof flood === "object" && flood !== null) {
    const { x, y } = flood as Record<string, unknown>;
    if (typeof x === "number" && typeof y === "number") out.flood = { x, y };
  }
  if (fromScan === true) out.fromScan = true;
  if (learned === true) out.learned = true;
  if (sheet === true) out.sheet = true;
  if (typeof packageResult === "object" && packageResult !== null) {
    const { label, name } = packageResult as Record<string, unknown>;
    if (
      (label === "indica" || label === "sativa" || label === "hybrid") &&
      typeof name === "string"
    ) {
      out.packageResult = { label, name };
    }
  }
  return out;
}

export function navigate(to: string, options: { replace?: boolean; state?: NavState } = {}): void {
  const state = options.state ?? {};
  if (options.replace) window.history.replaceState(state, "", to);
  else {
    window.history.pushState({ ...state, canGoBack: true }, "", to);
    window.scrollTo(0, 0);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** The depth a new entry pushed from the current one should get, or undefined if home isn't behind us. */
export function nextDepth(): number | undefined {
  const { depth } = currentNavState();
  if (matchRoute(window.location.pathname).name === "scan") return (depth ?? 0) + 1;
  return depth === undefined ? undefined : depth + 1;
}

let searchReset = false;

/** True once after returnToSearch({ reset: true }): the search screen clears its query. */
export function consumeSearchReset(): boolean {
  const reset = searchReset;
  searchReset = false;
  return reset;
}

/** Goes back to the scanner: back through history when it's behind us in this tab, else replaces this entry. */
export function returnHome(): void {
  const { depth } = currentNavState();
  if (depth !== undefined && depth > 0) window.history.go(-depth);
  else navigate(HOME_PATH, { replace: true, state: { depth: 0 } });
}

/** Replaces this entry (a dead end like "We can't find that strain") with the search screen. */
export function returnToSearch({ reset = false }: { reset?: boolean } = {}): void {
  searchReset = reset;
  const { depth } = currentNavState();
  navigate(SEARCH_PATH, { replace: true, state: depth === undefined ? {} : { depth } });
}

/** Back one entry when it's ours, otherwise to the scanner. */
export function goBack(): void {
  const { depth, canGoBack } = currentNavState();
  if ((depth !== undefined && depth > 0) || canGoBack === true) window.history.back();
  else navigate(HOME_PATH, { replace: true, state: { depth: 0 } });
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
