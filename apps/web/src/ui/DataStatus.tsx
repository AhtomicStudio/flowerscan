import { useEffect, useState } from "react";
import { DATA_COPY } from "./copy";
import { Icon } from "./icons";

/** True once `ms` have passed since mount. Skeletons wait 300 ms so fast loads don't flash (docs/design). */
export function useDelayed(ms: number): boolean {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPassed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return passed;
}

/** `count` skeleton rows shaped like list rows, shown only after 300 ms. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  const show = useDelayed(300);
  if (!show) return null;
  return (
    <div aria-hidden="true" className="grid gap-3" data-testid="skeleton">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}

/** The data failed to load: says what happened and what to do, with Retry. */
export function DataError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-(--radius-md) bg-(--color-surface-2) p-4"
    >
      <p className="flex items-center gap-2 font-semibold text-(--color-text)">
        <Icon name="alert" size={20} className="text-(--color-danger)" />
        {DATA_COPY.errorTitle}
      </p>
      <p className="text-footnote text-(--color-text-2)">{DATA_COPY.errorBody}</p>
      <button
        type="button"
        onClick={onRetry}
        className="pressable min-h-[52px] rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent)"
      >
        {DATA_COPY.retry}
      </button>
    </div>
  );
}
