// What the reviewer reads for each note (T-029). Plain text, deterministic. Pure.
import {
  ALGO_VERSION,
  isSupported,
  type Lineage,
  type PrecheckClaimStatus,
} from "@flowerscan/core";
import type { ParentView, PrecheckState, ReviewItem } from "./queue";

export const KEYS_LINE = "[y] approve  [s] skip  [f] flag  [o] open sources  [q] quit";

const STATUS_MARK: Readonly<Record<PrecheckClaimStatus, string>> = {
  confirmed: "OK  ",
  not_found: "??  ",
  contradicted: "XX  ",
  unreachable: "--  ",
  excluded_source: "EX  ",
};

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const list = (values: readonly string[] | null | undefined) =>
  values === null || values === undefined || values.length === 0 ? "none" : values.join(", ");

function parentText(parent: ParentView): string {
  if (parent.name === null) return parent.id === "unknown" ? "unknown (undisclosed)" : parent.id;
  return parent.kind === "cross"
    ? `${parent.name} (${parent.id}, unnamed cross)`
    : `${parent.name} (${parent.id})`;
}

/** The computed result in one line: label, sublabel, value, confidence and method. */
export function lineageText(lineage: Lineage): string {
  if (lineage.label === "unknown")
    return `unknown (no value), confidence none, method ${lineage.method}`;
  const sub = lineage.sublabel === null ? "" : ` (${lineage.sublabel})`;
  return `${lineage.label}${sub}, ${lineage.sativa_pct}% sativa, confidence ${lineage.confidence_level} (${lineage.confidence.toFixed(2)}), method ${lineage.method}`;
}

function precheckLines(precheck: PrecheckState): string[] {
  if (precheck.state === "none") return ["Pre-check: none (no data/review/precheck record yet)"];
  if (precheck.state === "invalid") {
    return [
      `Pre-check: INVALID record ${precheck.file} (treated as none)`,
      ...precheck.problems.map((problem) => `  ${problem}`),
    ];
  }
  const { record } = precheck;
  const stale =
    precheck.state === "stale"
      ? " | STALE: the note changed after this check, so it may not describe the current note"
      : "";
  const out = [
    `Pre-check: ${record.verdict.toUpperCase()} (${record.checker}, ${record.checked_at})${stale}`,
  ];
  for (const claim of record.claims) {
    const value = Array.isArray(claim.value) ? claim.value.join(", ") : String(claim.value);
    out.push(
      `  ${STATUS_MARK[claim.status]}${claim.field}: ${value} | ${claim.status} | ${claim.source}`,
    );
    if (claim.note !== undefined && claim.note !== null) out.push(`      ${claim.note}`);
  }
  if (record.claims.length === 0) out.push("  (no claims)");
  out.push(`  Summary: ${record.summary}`);
  return out;
}

function impactLine(item: ReviewItem): string {
  const { verification } = item.note;
  const effect =
    verification === "unverified"
      ? "approving ships this note"
      : verification === "disputed"
        ? "it already ships as disputed; approving records your review and keeps it disputed"
        : "it already ships as verified; approving records a new review";
  const ancestors =
    item.unverifiedAncestors === 0
      ? ""
      : `. ${plural(item.unverifiedAncestors, "ancestor is", "ancestors are")} still unverified (shipped results treat them as unknown)`;
  return `Impact: ${plural(item.descendants, "descendant")}; ${effect}${ancestors}.`;
}

export interface CardContext {
  /** 1-based position in the queue, and the queue length. */
  readonly position: number;
  readonly total: number;
  /** Why approving would fail right now (empty when it would succeed). */
  readonly approveProblems: readonly string[];
}

/** The review card for one note. */
export function renderCard(item: ReviewItem, context: CardContext): string {
  const { note } = item;
  const out: string[] = [
    `=== ${context.position}/${context.total}  ${note.name}  (${note.id})`,
    `Kind: ${note.kind} | Verification: ${note.verification}${item.reviewed ? ` | Reviewed by ${note.reviewed_by} on ${note.reviewed_at}` : ""}`,
    `File: ${item.file}`,
    `Reported type: ${note.reported_type}`,
  ];
  if (note.kind === "landrace") {
    out.push(
      `Base value (base_sativa_pct): ${note.base_sativa_pct ?? "none"} | Region: ${note.region ?? "none"}`,
    );
  }
  if (item.parents.length === 0) out.push("Parents: none (landrace: lineage stops here)");
  else {
    const weights =
      note.parent_weights === undefined || note.parent_weights === null
        ? "equal weights"
        : `weights ${note.parent_weights.join(" / ")}`;
    const derivation =
      note.parents.length >= 2 ? "cross" : (note.derivation ?? "none (undisclosed)");
    out.push(`Parents: ${item.parents.map(parentText).join("  x  ")}`);
    out.push(`  ${weights}, derivation ${derivation}`);
  }
  out.push(
    `Computed (ALGO_VERSION ${ALGO_VERSION}, whole vault incl. unverified): ${lineageText(item.lineage)}`,
  );
  const effectsNote =
    (note.effects ?? []).length > 0 && !isSupported(note.sources, "effects")
      ? " (no source supports effects: the build strips them)"
      : "";
  out.push(`Effects: ${list(note.effects)}${effectsNote}`);
  out.push(`Aliases: ${list(note.aliases)}`);
  if (note.breeder !== undefined && note.breeder !== null) out.push(`Breeder: ${note.breeder}`);
  const sources = note.sources ?? [];
  out.push(`Sources (${sources.length}):`);
  if (sources.length === 0) out.push("  none");
  sources.forEach((source, i) => {
    out.push(`  ${i + 1}. ${source.title}`);
    out.push(`     ${source.url ?? source.ref ?? ""}`);
    out.push(`     supports: ${list(source.supports)} | retrieved ${source.retrieved}`);
  });
  out.push(...precheckLines(item.precheck));
  out.push(impactLine(item));
  if (context.approveProblems.length > 0) {
    out.push("Can't approve as is:");
    for (const problem of context.approveProblems) out.push(`  ${problem}`);
  }
  return out.join("\n");
}

export interface SessionTally {
  readonly reviewer: string;
  readonly approved: readonly string[];
  readonly flagged: readonly string[];
  readonly skipped: readonly string[];
  readonly failed: readonly string[];
  /** Notes left without a decision (quit early, or a cancelled batch). */
  readonly notSeen: number;
}

/** The summary printed on quit or at the end of the queue. */
export function renderSessionSummary(tally: SessionTally): string {
  const out = [
    `Session for ${tally.reviewer}: ${tally.approved.length} approved, ${tally.flagged.length} flagged, ${tally.skipped.length} skipped${tally.failed.length > 0 ? `, ${tally.failed.length} failed` : ""}, ${tally.notSeen} left.`,
  ];
  if (tally.approved.length > 0) out.push(`  Approved: ${tally.approved.join(", ")}`);
  if (tally.flagged.length > 0) out.push(`  Flagged: ${tally.flagged.join(", ")}`);
  if (tally.failed.length > 0) out.push(`  Failed (nothing written): ${tally.failed.join(", ")}`);
  if (tally.approved.length > 0) out.push("Next: pnpm vault:check, then commit the vault changes.");
  return out.join("\n");
}
