// App shell: live region → age gate → data → routes. Nothing behind the gate mounts, so no data loads
// before "I'm 21 or older" (docs/design/screens/age-gate.md).
import { useMemo, useRef, useState } from "react";
import { DataProvider } from "../data/data-context";
import type { Fetcher } from "../data/load-data";
import { AboutScreen } from "../features/about/AboutScreen";
import { ResultScreen } from "../features/result/ResultScreen";
import { createScanDeps, type ScanDepsOverrides, ScanDepsProvider } from "../features/scan/deps";
import { ScannerScreen } from "../features/scan/ScannerScreen";
import { SearchScreen } from "../features/search/SearchScreen";
import { Icon } from "../ui/icons";
import { LiveRegionProvider } from "../ui/live-region";
import { useFocusOnMount } from "../ui/use-focus-on-mount";
import { AgeGate } from "./AgeGate";
import { type Clock, deviceStore, type KeyValueStore } from "./age-gate";
import { NOT_FOUND_COPY } from "./copy";
import { currentNavState, matchRoute, returnToSearch, useLocationVersion } from "./router";

const systemClock: Clock = () => new Date();

export interface AppProps {
  /** Injected for tests. Defaults: localStorage (memory fallback), the system clock, window.fetch. */
  store?: KeyValueStore | undefined;
  clock?: Clock | undefined;
  fetcher?: Fetcher | undefined;
  /** Scanner dependencies (camera, detector, barcode memory, text reading). Defaults: the browser. */
  scan?: ScanDepsOverrides | undefined;
}

export function App({ store, clock = systemClock, fetcher, scan }: AppProps) {
  const gateStore = useMemo(() => store ?? deviceStore(), [store]);
  // Created once per app: the camera, the warm detection worker and the scan session outlive routes.
  const [scanDeps] = useState(() => createScanDeps(gateStore, scan));
  return (
    <LiveRegionProvider>
      <AgeGate store={gateStore} clock={clock}>
        <DataProvider fetcher={fetcher}>
          <ScanDepsProvider deps={scanDeps}>
            <Routes />
          </ScanDepsProvider>
        </DataProvider>
      </AgeGate>
    </LiveRegionProvider>
  );
}

function Routes() {
  useLocationVersion();
  const route = matchRoute(window.location.pathname);
  // A result the scanner opened is a full-screen view over the paused scanner (D13), so Scan another is
  // instant. The scanner stays mounted (inert) underneath; everything else replaces it.
  const scannerBelow =
    route.name === "scan" || (route.name === "result" && currentNavState().fromScan === true);
  return (
    <>
      {scannerBelow && <ScannerScreen active={route.name === "scan"} />}
      <Route route={route} />
    </>
  );
}

function Route({ route }: { route: ReturnType<typeof matchRoute> }) {
  switch (route.name) {
    case "scan":
      return null;
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
