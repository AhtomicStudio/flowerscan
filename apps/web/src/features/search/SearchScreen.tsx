import { type SearchResult, search } from "@flowerscan/core";
import { type FormEvent, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "../../app/copy";
import { consumeSearchReset, Link, strainPath } from "../../app/router";
import { useStrainData } from "../../data/data-context";
import type { StrainData } from "../../data/load-data";
import { BetaNotice } from "../../ui/BetaNotice";
import { ClassPill } from "../../ui/ClassPill";
import { DataError, SkeletonRows } from "../../ui/DataStatus";
import { floodFrom } from "../../ui/flood-origin";
import { Icon } from "../../ui/icons";
import { useAnnounce } from "../../ui/live-region";
import { SEARCH_COPY, SEARCH_LIMIT } from "./copy";
import { highlight } from "./highlight";

function initialQuery(): string {
  if (consumeSearchReset()) {
    window.history.replaceState(window.history.state, "", "/");
    return "";
  }
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

/** `/`: the home screen. One big field, results as you type, from core's matcher. */
export function SearchScreen() {
  const { state, retry } = useStrainData();
  const [query, setQuery] = useState(initialQuery);
  const input = useRef<HTMLInputElement>(null);
  const announce = useAnnounce();
  const trimmed = query.trim();

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  // Keep the query in the URL, so Back from a result brings it (and its results) back.
  useEffect(() => {
    const url = trimmed === "" ? "/" : `/?q=${encodeURIComponent(query)}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [query, trimmed]);

  const results = useMemo<SearchResult[] | null>(() => {
    if (state.status !== "ready" || trimmed === "") return null;
    return search(state.data.index, trimmed, { limit: SEARCH_LIMIT });
  }, [state, trimmed]);

  // The count goes to the live region, debounced so it isn't chatty.
  useEffect(() => {
    if (results === null) return;
    const timer = setTimeout(() => {
      announce(
        results.length > 0 ? SEARCH_COPY.count(results.length) : SEARCH_COPY.noResultsAnnounce,
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [results, announce]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Enter / Search on the keyboard: hide the keyboard so the results are visible.
    input.current?.blur();
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[640px] px-5 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+32px)] max-[359px]:px-4">
      <header className="-mr-2 flex min-h-12 items-center justify-between gap-3">
        <span className="display text-[1.25rem] tracking-[0.01em]">{APP_NAME}</span>
        <Link
          href="/about"
          className="pressable inline-flex min-h-12 items-center gap-1.5 rounded-(--radius-pill) px-3 font-semibold text-(--color-accent-text) text-footnote"
        >
          <Icon name="info" size={20} />
          {SEARCH_COPY.about}
        </Link>
      </header>

      {state.status === "ready" && state.data.isBeta && <BetaNotice className="mt-2" />}

      <h1 className="display mt-6 mb-3 text-[2.25rem] leading-[1.05]">{SEARCH_COPY.title}</h1>

      {/* biome-ignore lint/a11y/useSemanticElements: <search> is unknown to iOS before 17; role=search works everywhere */}
      <form role="search" onSubmit={onSubmit} className="relative">
        <label htmlFor="strain-search" className="sr-only">
          {SEARCH_COPY.label}
        </label>
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-(--color-text-2)">
          <Icon name="search" />
        </span>
        <input
          ref={input}
          id="strain-search"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={SEARCH_COPY.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query !== "") {
              event.preventDefault();
              setQuery("");
            }
          }}
          className="min-h-14 w-full appearance-none rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-2) py-3 pr-12 pl-12 text-body text-(--color-text) placeholder:text-(--color-text-3) focus-visible:outline-2 focus-visible:outline-(--color-accent) focus-visible:outline-offset-1"
        />
        {query !== "" && (
          <button
            type="button"
            aria-label={SEARCH_COPY.clear}
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
            className="absolute top-1/2 right-1 grid size-12 -translate-y-1/2 place-items-center rounded-full text-(--color-text-2)"
          >
            <Icon name="x" size={20} />
          </button>
        )}
      </form>

      <div className="mt-3">
        <Results
          state={state.status}
          data={state.status === "ready" ? state.data : null}
          query={trimmed}
          results={results}
          onRetry={retry}
        />
      </div>
    </main>
  );
}

function Results({
  state,
  data,
  query,
  results,
  onRetry,
}: {
  state: "loading" | "error" | "ready";
  data: StrainData | null;
  query: string;
  results: SearchResult[] | null;
  onRetry: () => void;
}) {
  if (state === "error") return <DataError onRetry={onRetry} />;
  if (query === "") {
    return <p className="mt-2 font-medium text-caption text-(--color-text-3)">{SEARCH_COPY.tip}</p>;
  }
  if (data === null || results === null) return <SkeletonRows />;
  if (results.length === 0) {
    return (
      <div className="px-3 pt-8 pb-6 text-center">
        <span className="inline-block text-(--color-text-3)">
          <Icon name="search" size={48} strokeWidth={1.5} />
        </span>
        <h2 className="mt-3 mb-1.5 font-bold text-headline">{SEARCH_COPY.noMatchTitle}</h2>
        <p className="text-(--color-text-2)">{SEARCH_COPY.noMatchBody(query)}</p>
      </div>
    );
  }
  return (
    <>
      <p className="num mt-1 mb-2.5 font-medium text-caption text-(--color-text-3)">
        {SEARCH_COPY.count(results.length)}
      </p>
      <ul className="m-0 grid list-none gap-3 p-0" aria-label={SEARCH_COPY.label}>
        {results.map((result) => (
          <ResultRow key={result.strain_id} result={result} data={data} query={query} />
        ))}
      </ul>
    </>
  );
}

function Marked({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((segment, i) =>
        segment.hit ? (
          <mark key={i}>{segment.text}</mark>
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

function ResultRow({
  result,
  data,
  query,
}: {
  result: SearchResult;
  data: StrainData;
  query: string;
}) {
  const record = data.byId.get(result.strain_id);
  if (record === undefined) return null;
  const alias = result.matched_key !== record.name ? result.matched_key : null;
  return (
    <li>
      <Link
        href={strainPath(record.id)}
        navState={floodFrom}
        className="pressable flex min-h-16 w-full items-center gap-3 rounded-(--radius-md) bg-(--color-surface-2) px-3.5 py-3 text-left text-(--color-text) no-underline"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold [overflow-wrap:anywhere]">
            <Marked text={record.name} query={query} />
          </span>{" "}
          <span className="mt-1 flex flex-wrap items-center gap-2 text-footnote text-(--color-text-2)">
            {alias !== null && (
              <span>
                {SEARCH_COPY.aliasPrefix} “<Marked text={alias} query={query} />”
              </span>
            )}{" "}
            {record.kind === "landrace" && <span>{SEARCH_COPY.landrace}</span>}{" "}
            <ClassPill label={record.lineage.label} />
          </span>
        </span>
        <span className="text-(--color-text-2)">
          <Icon name="chevron" />
        </span>
      </Link>
    </li>
  );
}
