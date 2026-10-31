// What a decoded code *is* (docs/06 §3 "From QR" / "From 1D barcode"). The scanner talks to this interface
// only. The real rules belong to core (`classifyQr`, `classifyBarcode`, T-010 core half); until they land,
// `createLocalCodeClassifier` is a thin stand-in with the same outcomes, to be replaced by a call into core.
import type { BarcodeFormat, MatchCandidate, ScanBarcodeFormat } from "@flowerscan/core";
import { SLUG_PATTERN } from "@flowerscan/core";

export type QrFacts =
  /** Our own deep link: a direct strain id, no matching. The id may not exist (friendly 404). */
  | { readonly kind: "deep_link"; readonly strain_id: string }
  /** Lab results. Never a strain decision. */
  | { readonly kind: "coa"; readonly url: string }
  /** Track-and-trace Retail ID (e.g. Metrc). Never a strain decision. */
  | { readonly kind: "traceability"; readonly url: string }
  /** Any other URL: slug tokens from the path become matcher candidates. */
  | { readonly kind: "url"; readonly url: string; readonly candidates: readonly MatchCandidate[] }
  /** Plain text: treated like OCR text. */
  | {
      readonly kind: "text";
      readonly text: string;
      readonly candidates: readonly MatchCandidate[];
    };

export type BarcodeFacts =
  /** UPC/EAN with a valid check digit: learnable. */
  | { readonly kind: "retail"; readonly value: string; readonly format: ScanBarcodeFormat }
  /** UPC/EAN with a bad check digit: a misread, ignored. */
  | { readonly kind: "invalid"; readonly value: string; readonly format: ScanBarcodeFormat }
  /** A per-package track-and-trace UID: never stored (P13). */
  | { readonly kind: "tracking"; readonly value: string; readonly format: ScanBarcodeFormat }
  /** Anything else (Code 128 POS stickers, Code 39, Data Matrix, PDF417). */
  | { readonly kind: "other"; readonly value: string; readonly format: ScanBarcodeFormat };

export interface CodeClassifier {
  classifyQr(payload: string): QrFacts;
  classifyBarcode(value: string, format: ScanBarcodeFormat): BarcodeFacts;
}

export interface LocalClassifierConfig {
  /** Origins whose `/s/<id>` links are ours. Production domain is open (Q8): the app's own origin for now. */
  readonly ownOrigins: readonly string[];
  /** Hosts (or parent domains) of lab/COA links. Grows over time; empty until core ships the list. */
  readonly coaHosts?: readonly string[];
  /** Hosts of Retail ID / track-and-trace links. Empty until core ships the list. */
  readonly traceabilityHosts?: readonly string[];
}

/** GS1 mod-10 check digit over every digit but the last. */
function mod10Valid(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  let sum = 0;
  const body = digits.slice(0, -1);
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

/** UPC-E (8 digits: number system, 6 data, check) → UPC-A (12 digits), or null if malformed. */
export function expandUpcE(value: string): string | null {
  if (!/^[01]\d{7}$/.test(value)) return null;
  const ns = value[0] ?? "0";
  const d = value.slice(1, 7);
  const check = value[7] ?? "";
  const last = d[5] ?? "";
  let body: string;
  if (last === "0" || last === "1" || last === "2")
    body = `${d.slice(0, 2)}${last}0000${d.slice(2, 5)}`;
  else if (last === "3") body = `${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  else if (last === "4") body = `${d.slice(0, 4)}00000${d[4] ?? ""}`;
  else body = `${d.slice(0, 5)}0000${last}`;
  return `${ns}${body}${check}`;
}

/** UPC/EAN check-digit validation (docs/06 §3). Other formats have no check digit we validate. */
export function retailCheckDigitValid(value: string, format: BarcodeFormat): boolean {
  switch (format) {
    case "ean_13":
      return /^\d{13}$/.test(value) && mod10Valid(value);
    case "ean_8":
      return /^\d{8}$/.test(value) && mod10Valid(value);
    case "upc_a":
      return /^\d{12}$/.test(value) && mod10Valid(value);
    case "upc_e": {
      const expanded = expandUpcE(value);
      return expanded !== null && mod10Valid(expanded);
    }
    default:
      return false;
  }
}

/** Metrc package UIDs: 24 characters, observed to start with 1A4 (docs/06 §3). */
const METRC_UID = /^1A4[0-9A-Z]{21}$/;

function hostMatches(host: string, list: readonly string[]): boolean {
  const lower = host.toLowerCase();
  return list.some((entry) => {
    const domain = entry.toLowerCase();
    return lower === domain || lower.endsWith(`.${domain}`);
  });
}

const QUANTITY = /^\d+(\.\d+)?(g|mg|oz|ml|pk|ct)$|^\d+$/i;

/** Contiguous 1–5 token n-grams, longest first, each a candidate (the matcher keeps the best). */
function ngrams(tokens: readonly string[], weight: number): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (let size = Math.min(5, tokens.length); size >= 1; size--) {
    for (let start = 0; start + size <= tokens.length; start++) {
      const text = tokens.slice(start, start + size).join(" ");
      if (seen.has(text)) continue;
      seen.add(text);
      out.push({ text, weight });
    }
  }
  return out;
}

/** `/products/blue-dream-3-5g` → tokens of each path segment, quantities dropped → n-grams. */
function slugCandidates(url: URL): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  for (const segment of url.pathname.split("/")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      decoded = segment;
    }
    const tokens = decoded
      .split(/[-_+.\s]+/)
      .filter((token) => token !== "" && !QUANTITY.test(token));
    // A trailing "3-5g" leaves a lone "3": drop single digits at the end (quantities, not names).
    while (tokens.length > 0 && /^\d$/.test(tokens[tokens.length - 1] ?? "")) tokens.pop();
    if (tokens.length === 0 || tokens.every((t) => /^\d+$/.test(t))) continue;
    out.push(...ngrams(tokens, 0.5));
  }
  return out;
}

function textCandidates(text: string): MatchCandidate[] {
  const lines = text
    .split(/[\r\n·|•]+/)
    .map((line) => line.replace(/^[^:]{1,20}:\s*/, "").trim())
    .filter((line) => line !== "");
  return lines.flatMap((line) => ngrams(line.split(/\s+/), 0.5));
}

export function createLocalCodeClassifier(config: LocalClassifierConfig): CodeClassifier {
  const own = new Set(config.ownOrigins);
  const coa = config.coaHosts ?? [];
  const trace = config.traceabilityHosts ?? [];
  return {
    classifyQr(payload) {
      const text = payload.trim();
      let url: URL | null = null;
      if (/^https?:\/\//i.test(text)) {
        try {
          url = new URL(text);
        } catch {
          url = null;
        }
      }
      if (url === null) return { kind: "text", text, candidates: textCandidates(text) };
      if (own.has(url.origin)) {
        const match = /^\/s\/([^/]+)\/?$/.exec(url.pathname);
        if (match?.[1] !== undefined) {
          let id: string;
          try {
            id = decodeURIComponent(match[1]);
          } catch {
            id = match[1];
          }
          if (SLUG_PATTERN.test(id)) return { kind: "deep_link", strain_id: id };
        }
      }
      if (hostMatches(url.hostname, coa)) return { kind: "coa", url: url.href };
      if (hostMatches(url.hostname, trace)) return { kind: "traceability", url: url.href };
      return { kind: "url", url: url.href, candidates: slugCandidates(url) };
    },

    classifyBarcode(value, format) {
      if (format === "ean_13" || format === "ean_8" || format === "upc_a" || format === "upc_e") {
        return retailCheckDigitValid(value, format)
          ? { kind: "retail", value, format }
          : { kind: "invalid", value, format };
      }
      if (METRC_UID.test(value.toUpperCase())) return { kind: "tracking", value, format };
      return { kind: "other", value, format };
    },
  };
}
