import { type ReactNode, useRef, useState } from "react";
import { useFocusOnMount } from "../ui/use-focus-on-mount";
import {
  type Clock,
  confirmAge,
  declineAge,
  type GateStatus,
  gateStatus,
  type KeyValueStore,
} from "./age-gate";
import { APP_NAME, EXIT_COPY, GATE_COPY } from "./copy";

function Wordmark() {
  return (
    <p className="display text-center text-[1.5rem] tracking-[0.01em]" aria-hidden="true">
      {APP_NAME}
    </p>
  );
}

/** Renders `children` only after "I'm 21 or older". Nothing behind it mounts (or loads) before that. */
export function AgeGate({
  store,
  clock,
  children,
}: {
  store: KeyValueStore;
  clock: Clock;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<GateStatus>(() => gateStatus(store, clock()));

  if (status === "confirmed") return <>{children}</>;
  if (status === "blocked") return <ExitScreen />;
  return (
    <GateScreen
      onConfirm={() => {
        confirmAge(store, clock());
        setStatus("confirmed");
      }}
      onLeave={() => {
        declineAge(store, clock());
        setStatus("blocked");
      }}
    />
  );
}

function GateScreen({ onConfirm, onLeave }: { onConfirm: () => void; onLeave: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnMount(heading);
  return (
    <main
      aria-labelledby="age-title"
      className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+48px)] pb-[calc(env(safe-area-inset-bottom)+24px)]"
    >
      <Wordmark />
      <div className="min-h-12 flex-1" />
      <h1
        id="age-title"
        ref={heading}
        tabIndex={-1}
        className="display text-[2.25rem] leading-[1.1]"
      >
        {GATE_COPY.title}
      </h1>
      <p className="mt-2 mb-7 text-footnote text-(--color-text-2)">{GATE_COPY.body}</p>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="pressable min-h-[52px] w-full rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent)"
        >
          {GATE_COPY.confirm}
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="pressable min-h-[52px] w-full rounded-(--radius-md) bg-(--color-surface-2) px-5 font-semibold text-(--color-text) shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
        >
          {GATE_COPY.leave}
        </button>
      </div>
      <p className="mt-4 text-center font-medium text-caption text-(--color-text-3)">
        {GATE_COPY.caption}
      </p>
    </main>
  );
}

function ExitScreen() {
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnMount(heading);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+48px)] pb-[calc(env(safe-area-inset-bottom)+24px)] text-center">
      <Wordmark />
      <div className="flex-1" />
      <h1 ref={heading} tabIndex={-1} className="display text-title">
        {EXIT_COPY.title}
      </h1>
      <p className="mt-2 text-footnote text-(--color-text-2)">{EXIT_COPY.body}</p>
      <div className="flex-1" />
    </main>
  );
}
