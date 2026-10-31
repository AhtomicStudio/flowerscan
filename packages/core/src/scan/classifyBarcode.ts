// 1D/2D barcode values → what they are and what barcode memory may learn (docs/06 §3, P13).
import { CODE_128_LEARNABLE_AFTER } from "../schema/barcode-memory";
import type { ScanBarcodeFormat } from "../schema/scan";
import { isTrackAndTraceUid } from "./lexicon/identifiers";

/** A confirmed UPC/EAN mapping is learnable on its first scan (P13). */
export const RETAIL_LEARNABLE_AFTER = 1;

export const BARCODE_KINDS = ["retail", "track_and_trace", "other", "invalid"] as const;
export type BarcodeKind = (typeof BARCODE_KINDS)[number];

/** Why a UPC/EAN value was rejected as a misread. */
export type BarcodeRejection = "characters" | "length" | "check_digit";

export interface BarcodeFacts {
  /**
   * - `retail`: a UPC/EAN with a valid check digit.
   * - `track_and_trace`: shaped like a per-package UID (24 characters, Metrc `1A4…`): never a
   *   product code, never stored (P13).
   * - `other`: any other value (store POS stickers, unknown Code 128).
   * - `invalid`: a UPC/EAN that fails validation, i.e. a misread. Ignore it.
   */
  readonly kind: BarcodeKind;
  /** The raw value, unchanged. */
  readonly value: string;
  readonly format: ScanBarcodeFormat;
  /** Set exactly when `kind` is `invalid`. */
  readonly rejected: BarcodeRejection | null;
  /** Whether the value may be written to barcode memory at all (P13: never for UIDs or misreads). */
  readonly storable: boolean;
  /**
   * Separate scans (`times_seen`) a confirmed mapping needs before it is `learnable`: 1 for UPC/EAN,
   * 2 for other Code 128 values, null when it never is (docs/04 "Local barcode memory").
   */
  readonly learnable_after: number | null;
}

const RETAIL_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  upc_a: [12, 13],
  ean_13: [13],
  ean_8: [8],
  upc_e: [8],
};

/**
 * Classifies a decoded barcode (docs/06 §3 "From 1D barcode"). UPC-A, UPC-E, EAN-8 and EAN-13
 * values are check-digit validated (UPC-E by expanding it to UPC-A; a 13-digit UPC-A with a
 * leading 0, as some decoders report it, is validated as EAN-13). Any other format is checked for
 * the track-and-trace UID shape first.
 */
export function classifyBarcode(value: string, format: ScanBarcodeFormat): BarcodeFacts {
  const lengths = RETAIL_LENGTHS[format];
  if (lengths !== undefined) {
    const rejected = retailRejection(value, format, lengths);
    if (rejected !== null) {
      return { kind: "invalid", value, format, rejected, storable: false, learnable_after: null };
    }
    return {
      kind: "retail",
      value,
      format,
      rejected: null,
      storable: true,
      learnable_after: RETAIL_LEARNABLE_AFTER,
    };
  }
  if (isTrackAndTraceUid(value.trim())) {
    return {
      kind: "track_and_trace",
      value,
      format,
      rejected: null,
      storable: false,
      learnable_after: null,
    };
  }
  return {
    kind: "other",
    value,
    format,
    rejected: null,
    storable: value.trim() !== "",
    learnable_after: format === "code_128" ? CODE_128_LEARNABLE_AFTER : null,
  };
}

/**
 * Whether a confirmed mapping seen on `timesSeen` separate scans may be marked `learnable` (P13).
 * Matches the BarcodeMemorySchema rule.
 */
export function isBarcodeLearnable(facts: BarcodeFacts, timesSeen: number): boolean {
  return facts.storable && facts.learnable_after !== null && timesSeen >= facts.learnable_after;
}

function retailRejection(
  value: string,
  format: ScanBarcodeFormat,
  lengths: readonly number[],
): BarcodeRejection | null {
  if (!/^\d+$/.test(value)) return "characters";
  if (!lengths.includes(value.length)) return "length";
  if (format === "upc_a" && value.length === 13 && !value.startsWith("0")) return "length";
  if (format === "upc_e") {
    const expanded = expandUpcE(value);
    if (expanded === null) return "characters";
    return hasValidCheckDigit(expanded) ? null : "check_digit";
  }
  return hasValidCheckDigit(value) ? null : "check_digit";
}

/** GS1 mod-10: weights 3, 1, 3… from the digit left of the check digit. */
export function hasValidCheckDigit(digits: string): boolean {
  let sum = 0;
  for (let index = digits.length - 2, weight = 3; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

/** UPC-E (number system 0 or 1, six digits, check digit) → the 12-digit UPC-A it stands for. */
export function expandUpcE(value: string): string | null {
  const system = value[0];
  if (value.length !== 8 || (system !== "0" && system !== "1")) return null;
  const d = value.slice(1, 7);
  const check = value[7] ?? "";
  const last = Number(d[5]);
  let body: string;
  if (last <= 2) body = `${d.slice(0, 2)}${d[5]}0000${d.slice(2, 5)}`;
  else if (last === 3) body = `${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  else if (last === 4) body = `${d.slice(0, 4)}00000${d[4]}`;
  else body = `${d.slice(0, 5)}0000${d[5]}`;
  return `${system}${body}${check}`;
}
