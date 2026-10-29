import type { StrainRecord } from "@flowerscan/core";
import { type CSSProperties, type Ref, useId, useState } from "react";
import { Link } from "../../app/router";
import type { StrainData } from "../../data/load-data";
import { RESPONSIBLE_FOOTER } from "../../ui/copy";
import { Icon } from "../../ui/icons";
import { ESTIMATE_NOTE, RESULT_COPY } from "./copy";
import { FamilyTree } from "./FamilyTree";
import {
  basisFor,
  disputedCount,
  effectsFor,
  isEstimate,
  leanFor,
  parentsSummary,
  reportedTypeWord,
  TAG_COLLAPSE_AFTER,
  whatThisIs,
} from "./result-model";

/** The details below the fold: basis line, effects, How we know. Theme surfaces, not the flood. */
export function ResultDetails({
  record,
  data,
  headingRef,
  footerInPanel,
}: {
  record: StrainRecord;
  data: StrainData;
  headingRef: Ref<HTMLHeadingElement>;
  /** At large text sizes the footer line moves here from the bar. */
  footerInPanel: boolean;
}) {
  const basis = basisFor(record);
  return (
    <section
      aria-labelledby="details-heading"
      className="on-theme min-h-full rounded-t-(--radius-lg) bg-(--color-surface-1) pt-1 pb-7 text-(--color-text)"
      data-testid="details"
    >
      <h2
        id="details-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mx-5 mt-5 font-bold text-headline"
      >
        {RESULT_COPY.details}
      </h2>
      <p className="mx-5 mt-4 text-footnote text-(--color-text-2)" data-testid="basis-line">
        {basis.term !== null && <b className="text-(--color-text)">{basis.term}: </b>}
        {basis.text}
      </p>
      <Effects record={record} data={data} />
      <HowWeKnow record={record} data={data} />
      {footerInPanel && (
        <p className="mx-5 mt-7 text-center text-footnote text-(--color-text-2)">
          {RESPONSIBLE_FOOTER}
        </p>
      )}
    </section>
  );
}

function Effects({ record, data }: { record: StrainRecord; data: StrainData }) {
  const { chips, negatives } = effectsFor(record, data.terms);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  // Zero effect tags: no section, no heading (docs/08 TagList).
  if (chips.length === 0 && negatives.length === 0) return null;
  const hidden = chips.length - TAG_COLLAPSE_AFTER;
  const shown = expanded || hidden <= 0 ? chips : chips.slice(0, TAG_COLLAPSE_AFTER);
  return (
    <section aria-label={RESULT_COPY.effectsLabel} className="mx-5 mt-6" data-testid="effects">
      {chips.length > 0 && (
        <>
          <h3 className="mb-1 font-bold text-headline">{RESULT_COPY.commonlyReported}</h3>
          <ul id={listId} className="mt-2.5 flex list-none flex-wrap gap-2 p-0">
            {shown.map((term, i) => (
              <li
                key={term.slug}
                className="tag-chip inline-flex min-h-9 items-center rounded-(--radius-sm) bg-(--color-surface-3) px-3 py-1.5 font-medium text-footnote text-(--color-text) leading-[1.3]"
                style={{ "--i": Math.min(i, 9) } as CSSProperties}
              >
                {term.label}
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              aria-controls={listId}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="min-h-12 px-2 font-semibold text-(--color-accent-text) text-footnote"
            >
              {expanded ? RESULT_COPY.showFewer : RESULT_COPY.more(hidden)}
            </button>
          )}
        </>
      )}
      {negatives.length > 0 && (
        <p className={`${chips.length > 0 ? "mt-2.5" : ""} text-footnote text-(--color-text-2)`}>
          {chips.length > 0 ? RESULT_COPY.alsoReported : RESULT_COPY.commonlyReported}:{" "}
          {negatives.map((term) => term.label.toLowerCase()).join(", ")}.
        </p>
      )}
    </section>
  );
}

function HowWeKnow({ record, data }: { record: StrainRecord; data: StrainData }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const disputed = disputedCount(record, data.byId);
  const summary = [
    parentsSummary(record, data.byId),
    RESULT_COPY.sources(record.source_count),
    disputed > 0 ? RESULT_COPY.disputedCount(disputed) : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
  const lean = leanFor(record);
  const reported = reportedTypeWord(record);
  const breeder = record.breeder_id === null ? undefined : data.breeders.get(record.breeder_id);

  return (
    <section className="mx-5 mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-16 w-full items-center gap-3 rounded-(--radius-md) bg-(--color-surface-2) px-4 py-2.5 text-left"
      >
        <span>
          <b className="block">{RESULT_COPY.howWeKnow}</b>
          <small className="block text-footnote text-(--color-text-2)">{summary}</small>
        </span>
        <span className="chevron ml-auto text-(--color-text-2)">
          <Icon name="chevron" />
        </span>
      </button>
      <div id={panelId} hidden={!open} className="px-1 pt-4 text-footnote text-(--color-text-2)">
        {lean !== null && (
          <p className="mb-3" data-testid="lean-line">
            <b className="text-(--color-text)">{lean.lead}</b> ({lean.term}).
          </p>
        )}
        <p className="mb-3">
          {whatThisIs(record)}
          {isEstimate(record) && ` ${ESTIMATE_NOTE}`}
        </p>
        <div className="mb-3 text-body">
          {record.parents.length > 0 ? (
            <FamilyTree record={record} byId={data.byId} />
          ) : (
            <p className="font-bold text-footnote text-(--color-text)">
              {record.kind === "landrace" ? RESULT_COPY.landraceEnds : RESULT_COPY.noTreeYet}
            </p>
          )}
        </div>
        {reported !== null && (
          <p className="mb-3">
            {RESULT_COPY.reportedType}: <b className="text-(--color-text)">{reported}</b>.
          </p>
        )}
        {breeder !== undefined && (
          <p className="mb-3">
            {RESULT_COPY.breeder}: <b className="text-(--color-text)">{breeder}</b>.
          </p>
        )}
        <p>
          {RESULT_COPY.basedOn(record.source_count)}{" "}
          <Link href="/about#classification" className="font-semibold text-(--color-accent-text)">
            {RESULT_COPY.howClassificationWorks}
          </Link>
        </p>
      </div>
    </section>
  );
}
