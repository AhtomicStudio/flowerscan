// Potency readings from label lines (docs/06 §3, P2): each figure exactly as printed, with its
// analyte, qualifier and unit. Never computed, converted, rounded or shown.
import type { PotencyAnalyte, PotencyQualifier, PotencyUnit } from "../schema/enums";
import { type PotencyReading, PotencyReadingSchema } from "../schema/potency";
import {
  ANALYTE_LABELS,
  ANALYTE_PATTERN,
  PAIR_GAP,
  qualifierOf,
  readNumber,
  unitOf,
  VALUE_PATTERN,
  VALUELESS_DEFAULT_UNIT,
} from "./lexicon/potency";
import { consume, type WorkLine } from "./work-line";

interface Item {
  readonly kind: "label" | "value";
  readonly start: number;
  readonly end: number;
  /** Labels: the analyte, or null for one the schema can't store. */
  readonly analyte: PotencyAnalyte | null;
  /** Values only. */
  readonly qualifier: PotencyQualifier;
  readonly value: number | null;
  readonly unit: PotencyUnit | null;
}

interface Draft {
  readonly line: number;
  readonly position: number;
  readonly analyte: PotencyAnalyte | null;
  readonly qualifier: PotencyQualifier;
  readonly value: number | null;
  readonly unit: PotencyUnit | null;
  readonly raw: string;
}

/**
 * Finds potency readings on `lines` (non-boilerplate, in reading order) and masks every potency
 * label and numeric value it saw, so none of them becomes a candidate.
 *
 * - On one line, a label pairs with the value right after it (`THC 24.1%`), or, when the line
 *   starts with a value, with the value right before it (`24.1% THC`). Only separators may sit
 *   between them. Several readings side by side each stay their own reading.
 * - Stacked layouts: a line of labels only directly above (or below) a line holding the same
 *   number of values only pairs them in order (`THC  THCA  CBD` / `0.8%  27%  <LOQ`).
 */
export function extractPotency(lines: readonly WorkLine[]): PotencyReading[] {
  const itemsByLine = lines.map((line) => findItems(line.masked));
  const used = itemsByLine.map(() => new Set<number>());
  const drafts: Draft[] = [];

  lines.forEach((line, lineIndex) => {
    const items = itemsByLine[lineIndex] ?? [];
    const lineUsed = used[lineIndex] ?? new Set<number>();
    const first = items[0];
    if (first === undefined) return;
    const orders: readonly ("label-first" | "value-first")[] =
      first.kind === "label" ? ["label-first", "value-first"] : ["value-first", "label-first"];
    for (const order of orders) {
      for (let index = 0; index + 1 < items.length; index += 1) {
        const a = items[index] as Item;
        const b = items[index + 1] as Item;
        if (lineUsed.has(index) || lineUsed.has(index + 1)) continue;
        const label = order === "label-first" ? a : b;
        const value = order === "label-first" ? b : a;
        if (label.kind !== "label" || value.kind !== "value") continue;
        if (!PAIR_GAP.test(line.masked.slice(a.end, b.start))) continue;
        lineUsed.add(index).add(index + 1);
        drafts.push(draft(line, label, value, line.original.slice(a.start, b.end).trim()));
      }
    }
  });

  // Stacked layouts: consecutive lines, one all labels and the other all values, same count.
  for (let lineIndex = 0; lineIndex + 1 < lines.length; lineIndex += 1) {
    const top = lines[lineIndex] as WorkLine;
    const bottom = lines[lineIndex + 1] as WorkLine;
    if (bottom.index !== top.index + 1) continue;
    const topItems = itemsByLine[lineIndex] ?? [];
    const bottomItems = itemsByLine[lineIndex + 1] ?? [];
    if (topItems.length === 0 || topItems.length !== bottomItems.length) continue;
    if ((used[lineIndex]?.size ?? 0) > 0 || (used[lineIndex + 1]?.size ?? 0) > 0) continue;
    const topKind = onlyKind(top, topItems);
    const bottomKind = onlyKind(bottom, bottomItems);
    if (topKind === null || bottomKind === null || topKind === bottomKind) continue;
    topItems.forEach((topItem, position) => {
      const bottomItem = bottomItems[position] as Item;
      const label = topKind === "label" ? topItem : bottomItem;
      const value = topKind === "label" ? bottomItem : topItem;
      const labelLine = topKind === "label" ? top : bottom;
      const raw = `${top.original.slice(topItem.start, topItem.end).trim()}\n${bottom.original
        .slice(bottomItem.start, bottomItem.end)
        .trim()}`;
      drafts.push({ ...draft(labelLine, label, value, raw), line: top.index });
      used[lineIndex]?.add(position);
      used[lineIndex + 1]?.add(position);
    });
  }

  // Mask what was read: every label, every numeric value, and ND/LOQ values that were paired or
  // sit on a line with a potency label (a bare "ND" elsewhere may be a state code).
  lines.forEach((line, lineIndex) => {
    const items = itemsByLine[lineIndex] ?? [];
    const hasLabel = items.some((item) => item.kind === "label");
    items.forEach((item, index) => {
      const keep =
        item.kind === "value" && item.value === null && !hasLabel && !used[lineIndex]?.has(index);
      if (!keep) consume(line, item.start, item.end);
    });
  });

  return finish(drafts);
}

function draft(line: WorkLine, label: Item, value: Item, raw: string): Draft {
  return {
    line: line.index,
    position: Math.min(label.start, value.start),
    analyte: label.analyte,
    qualifier: value.qualifier,
    value: value.value,
    unit: value.unit,
    raw,
  };
}

/** Orders drafts as printed, fills units for ND/LOQ, drops unstorable analytes and misreads. */
function finish(drafts: readonly Draft[]): PotencyReading[] {
  const ordered = [...drafts].sort((a, b) => a.line - b.line || a.position - b.position);
  const firstUnit = ordered.find((entry) => entry.unit !== null)?.unit ?? VALUELESS_DEFAULT_UNIT;
  const readings: PotencyReading[] = [];
  for (const entry of ordered) {
    if (entry.analyte === null) continue;
    const unit =
      entry.unit ??
      ordered.find((other) => other.line === entry.line && other.unit !== null)?.unit ??
      firstUnit;
    const parsed = PotencyReadingSchema.safeParse({
      analyte: entry.analyte,
      value: entry.value,
      qualifier: entry.qualifier,
      unit,
      raw: entry.raw,
    });
    if (parsed.success) readings.push(parsed.data);
  }
  return readings;
}

/** "label" or "value" when the line holds nothing but items of that kind (and separators). */
function onlyKind(line: WorkLine, items: readonly Item[]): "label" | "value" | null {
  const kind = items[0]?.kind;
  if (kind === undefined || items.some((item) => item.kind !== kind)) return null;
  let rest = line.masked;
  for (const item of [...items].reverse()) rest = rest.slice(0, item.start) + rest.slice(item.end);
  return /[\p{L}\p{N}]/u.test(rest) ? null : kind;
}

function findItems(text: string): Item[] {
  const items: Item[] = [];
  for (const match of text.matchAll(ANALYTE_PATTERN)) {
    const group = ANALYTE_LABELS.findIndex((_, index) => match[index + 1] !== undefined);
    items.push({
      kind: "label",
      start: match.index,
      end: match.index + match[0].length,
      analyte: ANALYTE_LABELS[group]?.[0] ?? null,
      qualifier: "exact",
      value: null,
      unit: null,
    });
  }
  for (const match of text.matchAll(VALUE_PATTERN)) {
    const groups = match.groups ?? {};
    const qualifier = qualifierOf(groups);
    const number = groups.num1 ?? groups.num2;
    items.push({
      kind: "value",
      start: match.index,
      end: match.index + match[0].length,
      analyte: null,
      qualifier,
      value: number === undefined ? null : readNumber(number),
      unit: unitOf(groups.unit1 ?? groups.unit2 ?? groups.unit3),
    });
  }
  items.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Item[] = [];
  for (const item of items) {
    const last = kept.at(-1);
    if (last === undefined || item.start >= last.end) kept.push(item);
  }
  return kept;
}
