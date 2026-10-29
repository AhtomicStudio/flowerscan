// App shell: live region → age gate → data → routes. Nothing behind the gate mounts, so no data loads
// before "I'm 21 or older" (docs/design/screens/age-gate.md).
import { useMemo, useRef } from "react";
import { DataProvider } from "../data/data-context";
import type { Fetcher } from "../data/load-data";
import { AboutScreen } from "../features/about/AboutScreen";
import { ResultScreen } from "../features/result/ResultScreen";
import { SearchScreen } from "../features/search/SearchScreen";
import { Icon } from "../ui/icons";
import { LiveRegionProvider } from "../ui/live-region";
import { useFocusOnMount } from "../ui/use-focus-on-mount";
import { AgeGate } from "./AgeGate";
import { type Clock, deviceStore, type KeyValueStore } from "./age-gate";
import { NOT_FOUND_COPY } from "./copy";
import { matchRoute, returnToSearch, useLocationVersion } from "./router";

const systemClock: Clock = () => new Date();

export interface AppProps {
  /** Injected for tests. Defaults: localStorage (memory fallback), the system clock, window.fetch. */
  store?: KeyValueStore | undefined;
  clock?: Clock | undefined;
  fetcher?: Fetcher | undefined;
}

export function App({ store, clock = systemClock, fetcher }: AppProps) {
  const gateStore = useMemo(() => store ?? deviceStore(), [store]);
  return (
    <LiveRegionProvider>
      <AgeGate store={gateStore} clock={clock}>
        <DataProvider fetcher={fetcher}>
          <Routes />
        </DataProvider>
      </AgeGate>
    </LiveRegionProvider>
  );
}

function Routes() {
  useLocationVersion();
  const route = matchRoute(window.location.pathname);
  switch (route.name) {
    case "search":
      return <SearchScreen />;
    case "result":
      return <ResultScreen id={route.id} />;
    case "about":
      return <AboutScreen />;
    case "not-found":
      return <NotFound />;
  }
}

function NotFound() {
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnMount(heading);
  return (
    <main className="mx-auto min-h-dvh max-w-[640px] px-5 pt-[calc(env(safe-area-inset-top)+72px)] pb-8 text-center">
      <span className="inline-block text-(--color-text-3)">
        <Icon name="help" size={48} strokeWidth={1.5} />
      </span>
      <h1 ref={heading} tabIndex={-1} className="mt-3 mb-1.5 font-bold text-headline">
        {NOT_FOUND_COPY.title}
      </h1>
      <p className="mb-5 text-(--color-text-2)">{NOT_FOUND_COPY.body}</p>
      <button
        type="button"
        onClick={() => returnToSearch({ reset: true })}
        className="pressable min-h-[52px] w-full rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent)"
      >
        {NOT_FOUND_COPY.action}
      </button>
    </main>
  );
}
