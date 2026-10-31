// The sheets over the frozen scanner: code dead ends (flows §4b), "Which one?" and no match (flows §3–4,
// basic versions until T-014), and the read errors (flows §2b). Copy from docs/design.
import type { RankedMatch } from "@flowerscan/core";
import { type FormEvent, useState } from "react";
import type { StrainData } from "../../data/load-data";
import { ClassPill } from "../../ui/ClassPill";
import { Icon } from "../../ui/icons";
import { formatBarcode, hostOf, SHEET_COPY, shortCode } from "./copy";
import type { ReadFailure } from "./read-label";
import { ScanIcon } from "./ScanIcon";
import { PrimaryButton, SecondaryButton, Sheet } from "./Sheet";
import type { CodeSheetModel } from "./scan-session";

export interface CodeSheetProps {
  sheet: CodeSheetModel;
  onClose: () => void;
  onScanLabel: () => void;
  onSearch: () => void;
  onOpenLink: (url: string) => void;
}

export function CodeSheet({ sheet, onClose, onScanLabel, onSearch, onOpenLink }: CodeSheetProps) {
  let title: string;
  let body: string;
  let value: string;
  switch (sheet.kind) {
    case "unknown-barcode":
      title = SHEET_COPY.unknownBarcode.title;
      body = sheet.learnable
        ? SHEET_COPY.unknownBarcode.body
        : SHEET_COPY.unknownBarcode.bodyNotLearnable;
      value = SHEET_COPY.unknownBarcode.value(formatBarcode(sheet.value, sheet.format));
      break;
    case "tracking":
      title = SHEET_COPY.tracking.title;
      body = SHEET_COPY.tracking.body;
      value = SHEET_COPY.tracking.value(shortCode(sheet.value));
      break;
    case "coa":
      title = SHEET_COPY.coa.title;
      body = SHEET_COPY.coa.body;
      value = SHEET_COPY.coa.value(hostOf(sheet.url));
      break;
    case "traceability":
      title = SHEET_COPY.traceability.title;
      body = SHEET_COPY.traceability.body;
      value = SHEET_COPY.traceability.value(hostOf(sheet.url));
      break;
  }
  const link = sheet.kind === "coa" || sheet.kind === "traceability" ? sheet.url : null;
  return (
    <Sheet title={title} onClose={onClose} testId="code-sheet">
      <p className="text-footnote text-(--color-text-2)">{body}</p>
      <p className="num mt-2.5 mb-[18px] text-caption text-(--color-text-3) [overflow-wrap:anywhere]">
        {value}
      </p>
      <div className="flex flex-col gap-3">
        <PrimaryButton onClick={onScanLabel}>
          <ScanIcon name="scan" size={20} />
          {SHEET_COPY.scanTheLabel}
        </PrimaryButton>
        <SecondaryButton onClick={onSearch}>{SHEET_COPY.searchByName}</SecondaryButton>
        {link !== null && (
          <button
            type="button"
            onClick={() => onOpenLink(link)}
            className="inline-flex min-h-12 items-center justify-center gap-1.5 self-center px-3 font-semibold text-(--color-accent-text)"
          >
            <ScanIcon name="external" size={18} />
            {SHEET_COPY.openLink}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** "Strain A #4": the trailing number set apart so near-identical names differ visibly (P5). */
function NameWithNumber({ name }: { name: string }) {
  const parts = /^(.*?)(\s#\d+)$/.exec(name);
  if (parts === null) return <>{name}</>;
  return (
    <>
      {parts[1]}
      <span className="display text-[1.15em]">{parts[2]}</span>
    </>
  );
}

export interface ChooseSheetProps {
  read: string;
  candidates: readonly RankedMatch[];
  cross: boolean;
  data: StrainData;
  /** A barcode is waiting to learn from this pick (shows the remember line). */
  remembering: boolean;
  onPick: (strainId: string) => void;
  onNone: () => void;
  onClose: () => void;
}

export function ChooseSheet({
  read,
  candidates,
  cross,
  data,
  remembering,
  onPick,
  onNone,
  onClose,
}: ChooseSheetProps) {
  const title = cross ? SHEET_COPY.cross.title : SHEET_COPY.which.title;
  return (
    <Sheet title={title} onClose={onClose} testId="choose-sheet">
      <p className="mb-4 text-footnote text-(--color-text-2)">
        {cross ? SHEET_COPY.cross.body(read) : SHEET_COPY.which.body(read)}
      </p>
      <ul className="m-0 grid list-none gap-3 p-0">
        {candidates.map((candidate) => {
          const record = data.byId.get(candidate.strain_id);
          if (record === undefined) return null;
          const breeder =
            record.breeder_id === null ? undefined : data.breeders.get(record.breeder_id);
          return (
            <li key={candidate.strain_id}>
              <button
                type="button"
                onClick={() => onPick(record.id)}
                className="pressable flex min-h-16 w-full items-center gap-3 rounded-(--radius-md) bg-(--color-surface-2) px-3.5 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold [overflow-wrap:anywhere]">
                    <NameWithNumber name={record.name} />
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-footnote text-(--color-text-2)">
                    {cross && <span>{SHEET_COPY.cross.parent}</span>}
                    {!cross && breeder !== undefined && <span>{breeder}</span>}
                    <ClassPill label={record.lineage.label} />
                  </span>
                </span>
                <span className="text-(--color-text-2)">
                  <Icon name="chevron" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex">
        <SecondaryButton onClick={onNone}>{SHEET_COPY.which.none}</SecondaryButton>
      </div>
      {remembering && !cross && (
        <p className="mt-3 text-caption text-(--color-text-3)">{SHEET_COPY.which.remember}</p>
      )}
    </Sheet>
  );
}

export interface NoMatchSheetProps {
  read: string;
  onSearch: (text: string) => void;
  onTryAgain: () => void;
  onClose: () => void;
}

export function NoMatchSheet({ read, onSearch, onTryAgain, onClose }: NoMatchSheetProps) {
  const [text, setText] = useState(read);
  const blank = read === "";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(text.trim());
  };
  return (
    <Sheet
      title={blank ? SHEET_COPY.nothingRead.title : SHEET_COPY.noMatch.title}
      onClose={onClose}
      testId="nomatch-sheet"
    >
      <p className="mb-4 text-footnote text-(--color-text-2)">
        {blank ? SHEET_COPY.nothingRead.body : SHEET_COPY.noMatch.body}
      </p>
      <form onSubmit={submit}>
        <label
          htmlFor="scan-read-text"
          className="mb-1.5 block font-semibold text-caption text-(--color-text-2)"
        >
          {SHEET_COPY.noMatch.label}
        </label>
        <input
          id="scan-read-text"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={text}
          placeholder={SHEET_COPY.noMatch.placeholder}
          onChange={(event) => setText(event.target.value)}
          className="min-h-14 w-full appearance-none rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-2) px-3.5 text-body text-(--color-text) placeholder:text-(--color-text-3)"
        />
        <div className="sheet-buttons mt-4 flex gap-3">
          {blank ? (
            <>
              <PrimaryButton onClick={onTryAgain}>{SHEET_COPY.noMatch.tryAgain}</PrimaryButton>
              <SecondaryButton onClick={() => onSearch(text.trim())}>
                {SHEET_COPY.noMatch.search}
              </SecondaryButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={() => onSearch(text.trim())}>
                {SHEET_COPY.noMatch.search}
              </PrimaryButton>
              <SecondaryButton onClick={onTryAgain}>{SHEET_COPY.noMatch.tryAgain}</SecondaryButton>
            </>
          )}
        </div>
      </form>
    </Sheet>
  );
}

export interface ReadErrorSheetProps {
  reason: ReadFailure;
  onTryAgain: () => void;
  onSearch: () => void;
  onClose: () => void;
}

/** Read failed, offline without OCR, download failed, and the interim "not ready yet". */
export function ReadErrorSheet({ reason, onTryAgain, onSearch, onClose }: ReadErrorSheetProps) {
  const { title, body } =
    reason === "failed"
      ? SHEET_COPY.readFailed
      : reason === "offline"
        ? SHEET_COPY.offline
        : reason === "download-failed"
          ? SHEET_COPY.downloadFailed
          : SHEET_COPY.unavailable;
  const retry = reason === "failed" || reason === "download-failed";
  return (
    <Sheet title={title} onClose={onClose} testId="read-error-sheet">
      <p
        className="mb-[18px] text-footnote text-(--color-text-2)"
        role={reason === "failed" ? "alert" : undefined}
      >
        {body}
      </p>
      <div className="sheet-buttons flex gap-3">
        {retry ? (
          <>
            <PrimaryButton onClick={onTryAgain}>{SHEET_COPY.readFailed.tryAgain}</PrimaryButton>
            <SecondaryButton onClick={onSearch}>{SHEET_COPY.searchByName}</SecondaryButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={onSearch}>{SHEET_COPY.searchByName}</PrimaryButton>
            <SecondaryButton onClick={onClose}>{SHEET_COPY.offline.ok}</SecondaryButton>
          </>
        )}
      </div>
    </Sheet>
  );
}
