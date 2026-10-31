// Identifiers: lot, batch, license and track-and-trace numbers, dates, contact details (docs/06 §3,
// domain review §4 "Identifiers"). Stripped, never candidates: `Batch: GG4-0423` must not become
// a GG4 candidate. The regexes are the review's [O] starting points, tuned against the golden set
// in T-012.

/** A value after an identifier label: one token with at least one digit (`C11-0000512-LIC`, `02/23/19`). */
const VALUE = String.raw`(?=[a-z0-9\-/.]*\d)[a-z0-9][a-z0-9\-/.]*`;

/** Labels whose value is the next token (domain review §4, plus `SKU`, `UPC`, `Sell by`). */
const ID_LABELS = [
  String.raw`metrc\s*(?:uid|id|tag|#)?`,
  String.raw`package\s*(?:uid|id|tag)`,
  String.raw`pkg\s*(?:uid|id|date)`,
  String.raw`retail\s*id`,
  "uid",
  String.raw`lot\s*(?:#|no\.?|number|id)?`,
  String.raw`batch\s*(?:#|no\.?|number|id)?`,
  String.raw`harvest\s*(?:batch|date|lot)?`,
  String.raw`harvested(?:\s+on)?`,
  "hb",
  String.raw`packaged(?:\s+on|\s+date)?`,
  "pkg",
  String.raw`test(?:ed)?\s*(?:date|on)`,
  "tested",
  String.raw`exp(?:iration|ires)?\.?(?:\s*date)?`,
  String.raw`use\s*by`,
  String.raw`best\s*by`,
  String.raw`sell\s*by`,
  String.raw`mfg\.?\s*date`,
  String.raw`production\s*date`,
  String.raw`license\s*(?:#|no\.?|number)?`,
  String.raw`lic\.?\s*#?`,
  "ubi",
  String.raw`coa\s*#?`,
  String.raw`certificate\s+of\s+analysis`,
  "sku",
  "upc",
  String.raw`item\s*#`,
].join("|");

/**
 * `Lot #: 0423`, `Batch GG4-0423`, `PKG: 02/23/19`, `UBI 603-123-456`. The label alone is stripped
 * too when it ends with `:` or `#`, or when its value was already stripped (`UID <masked UID>`); a
 * bare word (`Harvest Moon`) is left alone. Runs after STANDALONE_ID_PATTERNS, so a license such
 * as `C11-0000512-LIC` is gone before `Lic` can read its tail as a label.
 */
export const LABELED_ID_PATTERN = new RegExp(
  String.raw`(?<![a-z0-9-])(?:${ID_LABELS})(?![a-z])(?:\s*[:#]\s*(?:${VALUE}(?:\s*-\s*\d+)*)?|\s*${VALUE}|(?=\s*))`,
  "giu",
);

/** `Tested by SC Labs`, `Packaged by …`, `Lab: …`: the label and the rest of its field. */
export const NAMED_PARTY_PATTERN =
  /(?<![a-z])(?:(?:tested|packaged|packed|cultivated|grown|manufactured|distributed|processed|produced|harvested)\s+(?:by|for)|(?:testing\s+)?lab(?:oratory)?\s*:|(?:licensee|distributor|manufacturer|cultivator|processor|producer|packager)\s*:)[^|]*/giu;

/** Metrc package UID as observed in MI: `1A4` + 21 characters (domain review §4, [F 17]). */
export const METRC_UID = /^1A4[0-9A-Z]{21}$/;

/**
 * Generic track-and-trace UID: 24 uppercase letters and digits with at least one of each
 * (track-and-trace IDs are 24 characters, domain review §4 [F 39]).
 */
export const TRACK_AND_TRACE_UID = /^(?=[0-9A-Z]*[0-9])(?=[0-9A-Z]*[A-Z])[0-9A-Z]{24}$/;

/** True for a value shaped like a per-package track-and-trace UID (P13). Case-insensitive. */
export function isTrackAndTraceUid(value: string): boolean {
  const upper = value.toUpperCase();
  return METRC_UID.test(upper) || TRACK_AND_TRACE_UID.test(upper);
}

/** URLs, e-mail addresses, social handles and bare domains. Stripped first. */
export const CONTACT_PATTERNS: readonly RegExp[] = [
  /(?:https?:\/\/|www\.)[^\s|]+/giu,
  /[^\s|@]+@[^\s|@]+\.[a-z]{2,}/giu,
  /(?<![a-z0-9])@[a-z0-9_.]{2,}/giu,
  /(?<![a-z0-9@.-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|us|biz|info|shop|store|app|ca|la)(?:\/[^\s|]*)?(?![a-z0-9])/giu,
];

/** Standalone identifiers, in stripping order (case-insensitive unless noted). */
export const STANDALONE_ID_PATTERNS: readonly RegExp[] = [
  // Track-and-trace UIDs (Metrc and generic 24-character), case-sensitive like the tags.
  /(?<![A-Za-z0-9])1A4[0-9A-Z]{21}(?![A-Za-z0-9])/gu,
  /(?<![A-Za-z0-9])(?=[0-9A-Z]*[0-9])(?=[0-9A-Z]*[A-Z])[0-9A-Z]{24}(?![A-Za-z0-9])/gu,
  // CA licenses (C11-0000512-LIC, CCL22-0001771, DCC-00000000) and MI licenses (AU-R-000524, PC-000123).
  /(?<![a-z0-9])c\d{1,2}-\d{7}-(?:lic|app)(?![a-z0-9])/giu,
  /(?<![a-z0-9])ccl\d{2}-\d{7}(?![a-z0-9])/giu,
  /(?<![a-z0-9])dcc-\d{8}(?![a-z0-9])/giu,
  /(?<![a-z0-9])au-[a-z]{1,2}(?:-[a-z])?-\d{6}(?![a-z0-9])/giu,
  /(?<![a-z0-9])pc-\d{6}(?![a-z0-9])/giu,
  // Phone numbers, then dates (02/23/19, 2026-10-29, 04/2026).
  /(?<![0-9])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![0-9])/gu,
  /(?<![0-9])\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?![0-9])/gu,
  /(?<![0-9])\d{4}-\d{2}-\d{2}(?![0-9])/gu,
  /(?<![0-9./])\d{1,2}\/\d{4}(?![0-9])/gu,
  // WA UBI shape (9 digits in threes) and any other run of 5+ digits: never part of a strain name.
  /(?<![0-9])\d{3}[ -]\d{3}[ -]\d{3}(?![0-9])/gu,
  /(?<![0-9])\d{5,}(?![0-9])/gu,
];
