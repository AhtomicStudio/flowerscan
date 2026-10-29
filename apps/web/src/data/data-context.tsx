// Loads the strain data once (after the age gate) and shares it. Screens read it with useStrainData().
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { type Fetcher, loadStrainData, type StrainData } from "./load-data";

export type DataState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: Error }
  | { readonly status: "ready"; readonly data: StrainData };

interface DataContextValue {
  readonly state: DataState;
  readonly retry: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const browserFetch: Fetcher = (url, init) => fetch(url, init);

export function DataProvider({
  children,
  fetcher = browserFetch,
}: {
  children: ReactNode;
  fetcher?: Fetcher | undefined;
}) {
  const [state, setState] = useState<DataState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // `attempt` re-runs the load on Retry.
    void attempt;
    let live = true;
    setState({ status: "loading" });
    loadStrainData(fetcher).then(
      (data) => {
        if (live) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (!live) return;
        console.error(error);
        setState({
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => {
      live = false;
    };
  }, [fetcher, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return <DataContext.Provider value={{ state, retry }}>{children}</DataContext.Provider>;
}

export function useStrainData(): DataContextValue {
  const value = useContext(DataContext);
  if (value === null) throw new Error("useStrainData needs a DataProvider");
  return value;
}
