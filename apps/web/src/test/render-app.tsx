import { render } from "@testing-library/react";
import { App } from "../app/App";
import { AGE_CONFIRMED_KEY, type KeyValueStore, memoryStore } from "../app/age-gate";
import { type FakeFetch, fakeFetch } from "./fixtures";

export const NOW = new Date("2026-10-29T12:00:00Z");

export interface RenderOptions {
  path?: string;
  /** Pass the age gate already (default true). */
  confirmed?: boolean;
  store?: KeyValueStore;
  fetch?: FakeFetch;
  now?: () => Date;
}

/** Renders the whole app at `path` with injected storage, clock and fixture data. */
export function renderApp(options: RenderOptions = {}) {
  window.history.replaceState(null, "", options.path ?? "/");
  const store = options.store ?? memoryStore();
  if (options.confirmed ?? true) store.setItem(AGE_CONFIRMED_KEY, NOW.toISOString());
  const fetch = options.fetch ?? fakeFetch();
  const utils = render(
    <App store={store} clock={options.now ?? (() => NOW)} fetcher={fetch.fetcher} />,
  );
  return { ...utils, store, fetch };
}
