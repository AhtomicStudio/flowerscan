// One app-wide polite live region (SC 4.1.3): status changes are announced without moving focus.
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

type Announce = (message: string) => void;

const AnnounceContext = createContext<Announce>(() => {});

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announce = useCallback<Announce>((next) => {
    // Clear first so repeating the same message is announced again.
    setMessage("");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(next), 60);
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" className="sr-only" data-testid="live-region">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  return useContext(AnnounceContext);
}
