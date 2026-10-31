// QR payloads → what they are (docs/06 §3 "From QR", T-010). Only our own deep link names a strain
// directly. COA and track-and-trace codes are never a strain decision. Other URLs and plain text
// only ever yield candidates for the matcher.

import { isTrackAndTraceUid } from "./lexicon/identifiers";
import { foldedTokens } from "./lexicon/phrases";
import { parseLabelText } from "./parseLabelText";
import type { LabelFacts, OcrLine } from "./types";
import { originHost, type ParsedUrl, parseHttpUrl } from "./url";

export const QR_KINDS = ["deep_link", "coa", "traceability", "url", "text"] as const;
export type QrKind = (typeof QR_KINDS)[number];

export interface QrOptions {
  /**
   * Origins whose `/s/<strain-id>` links are ours, e.g. `["https://localhost:4173"]` in e2e and the
   * production and preview origins in the app. The domain is still open (Q8/Q11), so it is
   * configuration (test-plan gap 3). Matched on host and port; http and https both count.
   */
  readonly ownOrigins: readonly string[];
}

export type QrFacts =
  /** Our deep link: open this strain directly, no matching. The id may still be unknown (404). */
  | {
      readonly kind: "deep_link";
      readonly url: string;
      readonly host: string;
      readonly strain_id: string;
    }
  /** A lab certificate (COA). Never a strain decision. Phase 2 parses known formats. */
  | { readonly kind: "coa"; readonly url: string; readonly host: string }
  /**
   * A track-and-trace code (Metrc Retail ID, or a bare 24-character package UID). Never a strain
   * decision. `url` and `host` are null for a bare UID.
   */
  | { readonly kind: "traceability"; readonly url: string | null; readonly host: string | null }
  /** Any other web link: its path slug is read like label text. Potency is never read from a URL. */
  | {
      readonly kind: "url";
      readonly url: string;
      readonly host: string;
      readonly label: LabelFacts;
    }
  /** Plain text: read like OCR text, one line per text line. */
  | { readonly kind: "text"; readonly text: string; readonly label: LabelFacts };

/**
 * Classifies a decoded QR payload, in this order: our deep link (`/s/<id>` on an own origin), a
 * track-and-trace code, a COA link, any other http(s) URL, plain text.
 *
 * - Track-and-trace: a host on `metrc.com`, or a URL or text holding a 24-character package UID.
 * - COA: the words `coa`, `certificate of analysis`, `lab results`, `lab report` or
 *   `test results` in the host, path or query, or a host label ending in `lab`/`labs`.
 * - Other URL: path segments, minus generic shop words and id-like parts, become label lines
 *   (`/products/blue-dream-3-5g` → "blue dream 3.5g" → candidate "blue dream").
 */
export function classifyQr(payload: string, options: QrOptions): QrFacts {
  const text = payload.trim();
  const url = parseHttpUrl(text);
  if (url === null) {
    if (isTrackAndTraceUid(text)) return { kind: "traceability", url: null, host: null };
    return { kind: "text", text: payload, label: parseLabelText(textLines(text)) };
  }
  const own = new Set(
    options.ownOrigins.map(originHost).filter((host): host is string => host !== null),
  );
  const [first, id, ...rest] = url.segments;
  if (own.has(url.host) && first === "s" && id !== undefined && id !== "" && rest.length === 0) {
    return { kind: "deep_link", url: text, host: url.host, strain_id: id };
  }
  if (isTraceability(url)) return { kind: "traceability", url: text, host: url.host };
  if (isCoa(url)) return { kind: "coa", url: text, host: url.host };
  const label = parseLabelText(slugLines(url));
  return { kind: "url", url: text, host: url.host, label: { ...label, potency_readings: [] } };
}

/** Hosts that only serve track-and-trace pages (Metrc Retail ID, docs/06 §3). */
const TRACEABILITY_DOMAINS: readonly string[] = ["metrc.com"];

function isTraceability(url: ParsedUrl): boolean {
  if (TRACEABILITY_DOMAINS.some((domain) => onDomain(url.hostname, domain))) return true;
  return [...url.segments, ...url.query.split(/[&=]/u)].some((part) =>
    isTrackAndTraceUid(part.trim()),
  );
}

const COA_PHRASES: readonly (readonly string[])[] = [
  "coa",
  "coas",
  "certificate of analysis",
  "certificateofanalysis",
  "lab results",
  "labresults",
  "lab report",
  "labreport",
  "test results",
  "testresults",
].map(foldedTokens);

function isCoa(url: ParsedUrl): boolean {
  const labels = url.hostname.split(".");
  if (labels.slice(0, -1).some((label) => /labs?$/u.test(label))) {
    return true;
  }
  const words = foldedTokens(
    [...labels, ...url.segments, url.query].join(" ").replace(/[-_./=&+%]+/gu, " "),
  );
  return COA_PHRASES.some((phrase) =>
    words.some((_, start) => phrase.every((token, offset) => words[start + offset] === token)),
  );
}

function onDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/** Path words that never name a product (shop and menu structure). */
const GENERIC_PATH_WORDS: ReadonlySet<string> = new Set([
  "brand",
  "brands",
  "catalog",
  "categories",
  "category",
  "collection",
  "collections",
  "deliveries",
  "delivery",
  "dispensaries",
  "dispensary",
  "en",
  "en-us",
  "item",
  "items",
  "menu",
  "menus",
  "p",
  "product",
  "products",
  "shop",
  "store",
  "stores",
  "strain",
  "strains",
  "us",
]);

const ID_LIKE = [
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu,
  /(?<![a-z0-9])(?=[a-z]*\d)(?=\d*[a-f])[0-9a-f]{12,}(?![a-z0-9])/giu,
];

/**
 * Path segments as label lines. A slug's `3-5g` is `3.5g`, a lone category letter between
 * hyphens (`-h-`) is bracketed so it reads as a category, and the rest of the hyphens are spaces.
 */
function slugLines(url: ParsedUrl): OcrLine[] {
  const lines: string[] = [];
  for (const segment of url.segments) {
    const lower = segment.toLowerCase().replace(/\.(?:html?|php|aspx?)$/u, "");
    // One-letter segments (`/s/`, `/p/`) are routing, never a product name.
    if (lower.length < 2 || GENERIC_PATH_WORDS.has(lower) || !/\p{L}/u.test(lower)) continue;
    let text = lower;
    for (const pattern of ID_LIKE) text = text.replace(pattern, " ");
    text = text
      .replace(/(?<![0-9])(\d+)-(\d+)(g|mg|oz)(?![a-z])/gu, "$1.$2$3")
      .replace(/(?<=^|[-_])([ish])(?=[-_]|$)/gu, " ($1) ")
      .replace(/[-_+]+/gu, " ")
      .trim();
    if (/\p{L}/u.test(text)) lines.push(text);
  }
  return lines.map(plainLine);
}

function textLines(text: string): OcrLine[] {
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== "")
    .map(plainLine);
}

/** A line of decoded text: certain (confidence 1), every line the same size. */
function plainLine(text: string): OcrLine {
  return { text, confidence: 1, height: 0, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } };
}
