// build-report.md (not shipped) and the console summary. Deterministic: no clock, no machine paths.
import { NODE_KINDS, type StrainRecord, VERIFICATIONS } from "@flowerscan/core";
import type { EmittedBuild } from "./emit";
import {
  type CompileResult,
  ERROR_CODES,
  type ErrorCode,
  type Issue,
  WARNING_CODES,
  type WarningCode,
} from "./types";

/** The parts of a shipped record the classification diff compares. */
export interface ClassificationSnapshot {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly sublabel: string | null;
  readonly sativa_pct: number | null;
  readonly confidence_level: string;
  readonly method: string;
  readonly algo_version: number;
}

export interface PreviousBuild {
  readonly hash: string;
  readonly data_version: string;
  readonly records: readonly ClassificationSnapshot[];
}

export interface ClassificationDiff {
  readonly previous: { readonly hash: string; readonly data_version: string } | null;
  readonly added: readonly ClassificationSnapshot[];
  readonly removed: readonly ClassificationSnapshot[];
  readonly changed: readonly {
    readonly before: ClassificationSnapshot;
    readonly after: ClassificationSnapshot;
  }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads the snapshots out of a previous `strains.json`. Returns null if it doesn't look like one. */
export function snapshotsFrom(value: unknown): ClassificationSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const snapshots: ClassificationSnapshot[] = [];
  for (const record of value) {
    if (!isRecord(record) || !isRecord(record.lineage)) return null;
    const { id, name, lineage } = record;
    const { label, sublabel, sativa_pct, confidence_level, method, algo_version } = lineage;
    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      typeof label !== "string" ||
      (sublabel !== null && typeof sublabel !== "string") ||
      (sativa_pct !== null && typeof sativa_pct !== "number") ||
      typeof confidence_level !== "string" ||
      typeof method !== "string" ||
      typeof algo_version !== "number"
    ) {
      return null;
    }
    snapshots.push({
      id,
      name,
      label,
      sublabel,
      sativa_pct,
      confidence_level,
      method,
      algo_version,
    });
  }
  return snapshots;
}

export function snapshotOf(record: StrainRecord): ClassificationSnapshot {
  const { lineage } = record;
  return {
    id: record.id,
    name: record.name,
    label: lineage.label,
    sublabel: lineage.sublabel,
    sativa_pct: lineage.sativa_pct,
    confidence_level: lineage.confidence_level,
    method: lineage.method,
    algo_version: lineage.algo_version,
  };
}

const COMPARED = [
  "label",
  "sublabel",
  "sativa_pct",
  "confidence_level",
  "method",
  "algo_version",
] as const;

/** Added, removed and changed classifications, each sorted by id. */
export function diffClassifications(
  previous: PreviousBuild | null,
  next: readonly StrainRecord[],
): ClassificationDiff {
  const after = new Map(next.map((record) => [record.id, snapshotOf(record)]));
  const before = new Map((previous?.records ?? []).map((record) => [record.id, record]));
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {
    previous:
      previous === null ? null : { hash: previous.hash, data_version: previous.data_version },
    added: [...after.values()].filter((record) => !before.has(record.id)).sort(byId),
    removed: [...before.values()].filter((record) => !after.has(record.id)).sort(byId),
    changed: [...after.values()]
      .flatMap((now) => {
        const was = before.get(now.id);
        if (was === undefined || COMPARED.every((key) => was[key] === now[key])) return [];
        return [{ before: was, after: now }];
      })
      .sort((a, b) => byId(a.after, b.after)),
  };
}

function describe(snapshot: ClassificationSnapshot): string {
  const sub = snapshot.sublabel === null ? "" : ` (${snapshot.sublabel})`;
  const pct = snapshot.sativa_pct === null ? "no value" : `sativa_pct ${snapshot.sativa_pct}`;
  return `${snapshot.label}${sub}, ${pct}, ${snapshot.confidence_level}, ${snapshot.method}, algo v${snapshot.algo_version}`;
}

interface Grouped {
  readonly code: string;
  readonly title: string;
  readonly issues: readonly Issue[];
}

function group(issues: readonly Issue[], severity: Issue["severity"]): Grouped[] {
  const codes = severity === "error" ? ERROR_CODES : WARNING_CODES;
  return Object.entries(codes).flatMap(([code, title]) => {
    const matching = issues.filter(
      (issue) => issue.severity === severity && issue.code === (code as ErrorCode | WarningCode),
    );
    return matching.length === 0 ? [] : [{ code, title, issues: matching }];
  });
}

const where = (issue: Issue) =>
  issue.field === null ? issue.file : `${issue.file}: ${issue.field}`;
const count = (issues: readonly Issue[], severity: Issue["severity"]) =>
  issues.filter((issue) => issue.severity === severity).length;
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export interface ReportContext {
  readonly command: "check" | "build";
  readonly result: CompileResult;
  readonly build: EmittedBuild | null;
  readonly diff: ClassificationDiff | null;
}

function policyLine(result: CompileResult): string {
  return result.includeUnverified
    ? "every status (`--include-unverified`: dev build, never deploy)"
    : "`verified` + `disputed` (unverified notes don't ship)";
}

/** The full Markdown report written to build-report.md. */
export function renderReport({ command, result, build, diff }: ReportContext): string {
  const errors = count(result.issues, "error");
  const warnings = count(result.issues, "warning");
  const out: string[] = ["# Vault build report", ""];
  out.push(`- Command: \`vault-build ${command}\``);
  out.push(`- Shipping policy: ${policyLine(result)}`);
  out.push(
    `- Result: **${errors > 0 ? "FAILED" : "OK"}**, ${plural(errors, "error")}, ${plural(warnings, "warning")}`,
  );
  if (build !== null) {
    out.push(
      `- Output: \`${build.hash}/\` (data_version \`${build.manifest.data_version}\`, built_at \`${build.manifest.built_at}\`)`,
    );
  }
  out.push(
    "",
    "## Counts",
    "",
    `| Kind | ${VERIFICATIONS.join(" | ")} | Total |`,
    `| --- |${" --- |".repeat(VERIFICATIONS.length + 1)}`,
  );
  for (const kind of NODE_KINDS) {
    const row = result.stats.nodes[kind];
    const total = VERIFICATIONS.reduce((sum, v) => sum + row[v], 0);
    out.push(`| ${kind} | ${VERIFICATIONS.map((v) => row[v]).join(" | ")} | ${total} |`);
  }
  out.push("", `Notes read: ${result.stats.notes}. Breeders: ${result.stats.breeders}.`);
  if (result.data !== null) {
    const c = result.data.counts;
    out.push(
      `Shipped: ${plural(c.strains, "strain")}, ${plural(c.landraces, "landrace")}, ${plural(c.crosses, "cross", "crosses")} (inlined), ` +
        `${plural(result.data.breeders.length, "breeder")}, ${plural(c.taxonomy_terms, "taxonomy term")}.`,
    );
  }

  for (const [severity, heading, total] of [
    ["error", "Errors", errors],
    ["warning", "Warnings", warnings],
  ] as const) {
    out.push("", `## ${heading} (${total})`, "");
    const groups = group(result.issues, severity);
    if (groups.length === 0) out.push("None.");
    for (const g of groups) {
      out.push(`### \`${g.code}\`: ${g.title} (${g.issues.length})`, "");
      for (const issue of g.issues) out.push(`- \`${where(issue)}\`: ${issue.message}`);
      out.push("");
    }
  }

  out.push("", "## Founder review: landrace base values (P10)", "");
  out.push(
    "Every landrace value needs a founder to set `verification: verified` (rubric: `data/vault/LANDRACE-RUBRIC.md`).",
    "",
  );
  if (result.landraces.length === 0) out.push("No landraces.");
  else {
    out.push(
      "| Landrace | base_sativa_pct | Sources backing it | Verification | File |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const l of result.landraces) {
      const value =
        l.base_sativa_pct === null
          ? "none (descendants fall back to reported_type)"
          : String(l.base_sativa_pct);
      out.push(
        `| ${l.name} (\`${l.id}\`) | ${value} | ${l.supporting} | ${l.verification} | \`${l.file}\` |`,
      );
    }
  }

  out.push("", "## Classification diff vs. the previous build", "");
  if (diff === null) out.push("Not computed (`vault-build check`, or the build failed).");
  else {
    out.push(
      diff.previous === null
        ? "No previous build found: every record is new."
        : `Previous build: \`${diff.previous.hash}/\` (\`${diff.previous.data_version}\`).`,
    );
    if (diff.added.length + diff.removed.length + diff.changed.length === 0)
      out.push("", "No changes.");
    for (const [title, list] of [
      ["Added", diff.added],
      ["Removed", diff.removed],
    ] as const) {
      if (list.length === 0) continue;
      out.push("", `### ${title} (${list.length})`, "");
      for (const s of list) out.push(`- ${s.name} (\`${s.id}\`): ${describe(s)}`);
    }
    if (diff.changed.length > 0) {
      out.push("", `### Changed (${diff.changed.length})`, "");
      for (const { before, after } of diff.changed) {
        out.push(`- ${after.name} (\`${after.id}\`): ${describe(before)} → ${describe(after)}`);
      }
    }
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

/** The console output: counts, then errors and warnings grouped by type. */
export function renderSummary({ command, result, build }: ReportContext): string {
  const errors = count(result.issues, "error");
  const warnings = count(result.issues, "warning");
  const n = result.stats.nodes;
  const total = (kind: keyof typeof n) => VERIFICATIONS.reduce((sum, v) => sum + n[kind][v], 0);
  const out = [
    `vault-build ${command}: ${plural(result.stats.notes, "note")} (${total("landrace")} landraces, ${total("strain")} strains, ${total("cross")} crosses, ${result.stats.breeders} breeders)`,
    `Shipping policy: ${policyLine(result).replaceAll("`", "")}`,
  ];
  for (const [severity, heading, totalCount] of [
    ["error", "Errors", errors],
    ["warning", "Warnings", warnings],
  ] as const) {
    if (totalCount === 0) continue;
    out.push("", `${heading} (${totalCount})`);
    for (const g of group(result.issues, severity)) {
      out.push(`  ${g.code} (${g.issues.length}): ${g.title}`);
      for (const issue of g.issues) out.push(`    ${where(issue)}: ${issue.message}`);
    }
  }
  const flagged = result.landraces.filter((l) => l.base_sativa_pct !== null);
  out.push("", `Founder review (P10): ${plural(flagged.length, "landrace base value")}`);
  for (const l of flagged) {
    out.push(
      `  ${l.name} (${l.id}): ${l.base_sativa_pct}, ${plural(l.supporting, "source")} backing it, ${l.verification}`,
    );
  }
  if (result.data !== null) {
    const c = result.data.counts;
    out.push(
      `Ships: ${plural(c.strains, "strain")}, ${plural(c.landraces, "landrace")}, ${plural(c.crosses, "cross", "crosses")}.`,
    );
  }
  if (build !== null) out.push(`Wrote ${build.hash}/ (${build.manifest.data_version}).`);
  out.push(
    errors > 0
      ? `FAILED: ${plural(errors, "error")}, ${plural(warnings, "warning")}.`
      : `OK: ${plural(warnings, "warning")}.`,
  );
  return out.join("\n");
}
