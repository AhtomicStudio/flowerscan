import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import { goBack } from "../../app/router";
import { useStrainData } from "../../data/data-context";
import type { ShippedTerm } from "../../data/load-data";
import { BetaNotice } from "../../ui/BetaNotice";
import { ClassPill } from "../../ui/ClassPill";
import { SkeletonRows } from "../../ui/DataStatus";
import { Icon } from "../../ui/icons";
import { ABOUT_COPY, type AboutSection } from "./copy";

const SECTIONS = Object.keys(ABOUT_COPY.toc) as AboutSection[];

function scrollToSection(id: string, smooth: boolean): boolean {
  const target = document.getElementById(id);
  if (target === null) return false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView?.({ block: "start", behavior: smooth && !reduce ? "smooth" : "auto" });
  target.focus({ preventScroll: true });
  return true;
}

/** `/about`: how it works, what it can't tell you, our data, tags, privacy, responsible use. */
export function AboutScreen() {
  const { state } = useStrainData();
  const heading = useRef<HTMLHeadingElement>(null);
  const data = state.status === "ready" ? state.data : null;

  // Deep links (/about#classification) land on their section; otherwise focus the page heading.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash === "" || !scrollToSection(hash, false))
      heading.current?.focus({ preventScroll: true });
  }, []);

  const onToc = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    scrollToSection(id, true);
  };

  const effects = data?.termList.filter((t) => t.facet === "effect" && t.status === "active") ?? [];
  const upsides = effects.filter((t) => t.polarity !== "negative");
  const downsides = effects.filter((t) => t.polarity === "negative");

  return (
    <main className="mx-auto min-h-dvh max-w-[640px] px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+40px)] text-(--color-text-2) max-[359px]:px-4">
      <div className="-ml-2 mb-2 flex min-h-12 items-center">
        <button
          type="button"
          onClick={goBack}
          aria-label={ABOUT_COPY.back}
          className="pressable grid size-12 place-items-center rounded-full text-(--color-text)"
        >
          <Icon name="back" />
        </button>
      </div>
      <h1 ref={heading} tabIndex={-1} className="display mt-3 mb-1 text-(--color-text) text-title">
        {ABOUT_COPY.title}
      </h1>
      {data?.isBeta && <BetaNotice className="mt-3" />}
      <nav aria-label={ABOUT_COPY.tocLabel} className="mt-3">
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {SECTIONS.map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(event) => onToc(event, id)}
                className="inline-flex min-h-12 items-center rounded-(--radius-pill) bg-(--color-surface-2) px-3.5 font-semibold text-footnote text-(--color-text) no-underline"
              >
                {ABOUT_COPY.toc[id]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="classification" title={ABOUT_COPY.classification.heading}>
        <p>{ABOUT_COPY.classification.intro}</p>
        <p>{ABOUT_COPY.classification.noNumber}</p>
        <table className="my-2 mb-4 w-full border-collapse text-footnote">
          <caption className="sr-only">{ABOUT_COPY.classification.labelsLabel}</caption>
          <tbody>
            {(["indica", "hybrid", "sativa"] as const).map((label) => (
              <tr key={label} className="border-(--color-border) border-b">
                <td className="w-[1%] py-2 align-top whitespace-nowrap">
                  <ClassPill label={label} />
                </td>
                <td className="py-2 pl-3">{ABOUT_COPY.classification.labels[label]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="list-disc pl-5">
          {ABOUT_COPY.classification.terms.map(([term, text]) => (
            <li key={term} className="mb-1">
              <b className="text-(--color-text)">{term}:</b> {text}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="limits" title={ABOUT_COPY.limits.heading}>
        <p>
          <b className="text-(--color-text)">{ABOUT_COPY.limits.lead}</b>
        </p>
        {ABOUT_COPY.limits.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Section>

      <Section id="sources" title={ABOUT_COPY.sources.heading}>
        <p>{ABOUT_COPY.sources.body}</p>
        {data?.isBeta && <p>{ABOUT_COPY.sources.beta}</p>}
        <p>
          <b className="text-(--color-text)">{ABOUT_COPY.sources.noAds}</b>
        </p>
        {data !== null && (
          <p className="num font-medium text-caption text-(--color-text-3)">
            {ABOUT_COPY.sources.version(
              data.manifest.data_version,
              data.manifest.built_at.slice(0, 10),
            )}
          </p>
        )}
      </Section>

      <Section id="tags" title={ABOUT_COPY.tags.heading}>
        <p>{ABOUT_COPY.tags.intro}</p>
        {data === null ? (
          <SkeletonRows count={3} />
        ) : (
          <>
            <TermList terms={upsides} />
            {downsides.length > 0 && (
              <>
                <p className="mt-3">{ABOUT_COPY.tags.downsides}</p>
                <TermList terms={downsides} />
              </>
            )}
          </>
        )}
      </Section>

      <Section id="privacy" title={ABOUT_COPY.privacy.heading}>
        {ABOUT_COPY.privacy.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Section>

      <Section id="responsible-use" title={ABOUT_COPY.responsible.heading}>
        <p>{ABOUT_COPY.responsible.body}</p>
      </Section>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="[&_p]:mb-3">
      <h2
        id={id}
        tabIndex={-1}
        className="mt-8 mb-2 scroll-mt-4 font-semibold text-headline text-(--color-text)"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function TermList({ terms }: { terms: readonly ShippedTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <ul className="list-disc pl-5">
      {terms.map((term) => (
        <li key={term.slug} className="mb-1">
          <b className="text-(--color-text)">{term.label}:</b> {term.description}
        </li>
      ))}
    </ul>
  );
}
