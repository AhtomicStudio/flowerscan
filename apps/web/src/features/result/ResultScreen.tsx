import type { StrainRecord } from "@flowerscan/core";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { currentNavState, goBack, returnToSearch } from "../../app/router";
import { useStrainData } from "../../data/data-context";
import type { StrainData } from "../../data/load-data";
import { BetaNotice } from "../../ui/BetaNotice";
import { CLASS_ICON, classTone } from "../../ui/ClassPill";
import { CLASS_WORD, DATA_COPY, RESPONSIBLE_FOOTER } from "../../ui/copy";
import { DataError, useDelayed } from "../../ui/DataStatus";
import { Icon } from "../../ui/icons";
import { useAnnounce } from "../../ui/live-region";
import { useFocusOnMount } from "../../ui/use-focus-on-mount";
import { useLargeText } from "../../ui/use-large-text";
import { RESULT_COPY } from "./copy";
import { ResultDetails } from "./ResultDetails";

/** `/s/:id`: the full-screen class-color answer (D13), with the details below the fold. */
export function ResultScreen({ id }: { id: string }) {
  const { state, retry } = useStrainData();
  if (state.status === "loading") return <ResultLoading />;
  if (state.status === "error") {
    return (
      <PageShell>
        <h1 className="sr-only">{DATA_COPY.errorTitle}</h1>
        <DataError onRetry={retry} />
      </PageShell>
    );
  }
  const record = state.data.byId.get(id);
  if (record === undefined) return <StrainNotFound />;
  // Keyed by id: a family-tree link to another strain replays the flood and resets the details.
  return <ResultView key={record.id} record={record} data={state.data} />;
}

function ResultView({ record, data }: { record: StrainRecord; data: StrainData }) {
  const label = record.lineage.label;
  const word = CLASS_WORD[label];
  const heading = useRef<HTMLHeadingElement>(null);
  const detailsHeading = useRef<HTMLHeadingElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const [flooded, setFlooded] = useState(false);
  const [origin] = useState(() => currentNavState().flood ?? { x: 0.5, y: 0.45 });
  const [circle, setCircle] = useState<{ left: number; top: number; size: number } | null>(null);
  const largeText = useLargeText();
  const announce = useAnnounce();

  useFocusOnMount(heading, record.id);

  useEffect(() => {
    announce(RESULT_COPY.announce(record.name, word));
  }, [announce, record.name, word]);

  // A circle big enough to cover the viewport from the tap point.
  useLayoutEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = origin.x * width;
    const y = origin.y * height;
    const radius = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) + 2;
    setCircle({ left: x - radius, top: y - radius, size: radius * 2 });
  }, [origin]);

  // theme-color follows the flood (Android status bar and browser chrome), restored on close.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const node = root.current;
    if (meta === null || node === null) return;
    const previous = meta.content;
    const color = getComputedStyle(node).getPropertyValue("--cls").trim();
    if (color !== "") meta.content = color;
    return () => {
      meta.content = previous;
    };
  }, []);

  // Escape closes, like the close button and browser back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showDetails = () => {
    const panel = detailsHeading.current?.closest("section");
    const scroll = scroller.current;
    if (!panel || !scroll) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    scroll.scrollTo({ top: panel.offsetTop, behavior: reduce ? "auto" : "smooth" });
    window.setTimeout(
      () => detailsHeading.current?.focus({ preventScroll: true }),
      reduce ? 0 : 380,
    );
  };

  return (
    <main
      ref={root}
      aria-labelledby="result-name"
      className={`result-view on-class ${classTone(label)} fixed inset-0 flex flex-col overflow-hidden text-(--color-on-class)`}
      data-flooded={flooded}
      data-class={label}
    >
      {circle !== null && (
        <div
          aria-hidden="true"
          className="flood-circle"
          style={{ left: circle.left, top: circle.top, width: circle.size, height: circle.size }}
          onAnimationEnd={() => setFlooded(true)}
        />
      )}
      <div className="result-content relative z-[1] flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ scrollPaddingBottom: 24 }}
        >
          <div className="flex min-h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+8px)] pb-1">
            <div className="-mr-3 flex justify-end">
              <button
                type="button"
                onClick={goBack}
                aria-label={RESULT_COPY.close}
                className="pressable grid size-12 place-items-center rounded-full"
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center pb-4">
              <h1
                id="result-name"
                ref={heading}
                tabIndex={-1}
                className="display text-[1.875rem] leading-[1.1] [overflow-wrap:break-word]"
              >
                {record.name}
              </h1>
              <Icon
                name={CLASS_ICON[label]}
                size={64}
                strokeWidth={2}
                className="answer-icon mt-[18px] mb-1.5"
              />
              <p
                className="answer-word display"
                data-unknown={label === "unknown"}
                data-testid="answer-word"
              >
                {word}
              </p>
            </div>
            <button
              type="button"
              onClick={showDetails}
              className="inline-flex min-h-12 items-center gap-1.5 self-center rounded-(--radius-pill) px-4 font-bold"
            >
              {RESULT_COPY.details}
              <Icon name="chevron" size={18} className="rotate-90" />
            </button>
          </div>
          <ResultDetails
            record={record}
            data={data}
            headingRef={detailsHeading}
            footerInPanel={largeText}
          />
        </div>
        <div className="flex-none bg-(--cls) px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+14px)]">
          {data.isBeta && <BetaNotice onClass className="mb-1" />}
          {!largeText && (
            <p className="mb-2 text-center font-semibold text-caption">{RESPONSIBLE_FOOTER}</p>
          )}
          <button
            type="button"
            onClick={() => returnToSearch({ reset: true })}
            className="pressable flex min-h-[52px] w-full items-center justify-center gap-2 rounded-(--radius-md) bg-(--color-on-class) px-5 font-semibold text-(--cls)"
          >
            <Icon name="search" size={18} className="max-[340px]:hidden" />
            {RESULT_COPY.searchAnother}
          </button>
        </div>
      </div>
    </main>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[640px] px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-8">
      <div className="-ml-2 mb-2 flex min-h-12 items-center">
        <button
          type="button"
          onClick={goBack}
          aria-label={RESULT_COPY.back}
          className="pressable grid size-12 place-items-center rounded-full"
        >
          <Icon name="back" />
        </button>
      </div>
      {children}
    </main>
  );
}

function ResultLoading() {
  const show = useDelayed(300);
  return (
    <main aria-busy="true" className="mx-auto min-h-dvh max-w-[640px] px-5 pt-16">
      <h1 className="sr-only">{DATA_COPY.loading}</h1>
      {show && (
        <div aria-hidden="true" data-testid="skeleton">
          <div className="skeleton h-9 w-3/5" />
          <div className="skeleton mt-5 size-16 rounded-full" />
          <div className="skeleton mt-3 h-24 w-4/5" />
        </div>
      )}
    </main>
  );
}

function StrainNotFound() {
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnMount(heading);
  return (
    <PageShell>
      <div className="px-3 pt-14 pb-6 text-center">
        <span className="inline-block text-(--color-text-3)">
          <Icon name="help" size={48} strokeWidth={1.5} />
        </span>
        <h1 ref={heading} tabIndex={-1} className="mt-3 mb-1.5 font-bold text-headline">
          {RESULT_COPY.notFoundTitle}
        </h1>
        <p className="mb-5 text-(--color-text-2)">{RESULT_COPY.notFoundBody}</p>
        <button
          type="button"
          onClick={() => returnToSearch({ reset: true })}
          className="pressable min-h-[52px] w-full rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent)"
        >
          {RESULT_COPY.searchStrains}
        </button>
      </div>
    </PageShell>
  );
}
