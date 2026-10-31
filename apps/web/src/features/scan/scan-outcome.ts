// Candidates → core matcher → decide() → what the scanner shows (docs/06 §5–6).
// When the database has no match for the strain name, but OCR read an explicit package category
// (`package_says`: Indica / Sativa / Hybrid), falls back to a `package-says` outcome so the user still
// gets an immediate bright class-color answer with an honest "Printed on package" basis line.
import {
  type AcceptBlocker,
  decide,
  type MatchCandidate,
  type MatchIndex,
  match,
  type PackageSays,
  type RankedMatch,
} from "@flowerscan/core";

export type ScanOutcome =
  | { readonly kind: "accept"; readonly strainId: string; readonly read: string }
  | {
      readonly kind: "choose";
      /** What we read (the candidate behind the top match). */
      readonly read: string;
      readonly candidates: readonly RankedMatch[];
      /** "A x B" with no curated cross (P4): the rows are parents, not matches. */
      readonly cross: boolean;
      readonly blockedBy: readonly AcceptBlocker[];
    }
  | {
      readonly kind: "package-says";
      readonly packageSays: PackageSays;
      readonly read: string;
    }
  | { readonly kind: "none"; readonly read: string };

/** The best line to prefill "What we read": the highest-weight, longest candidate. */
export function bestRead(candidates: readonly MatchCandidate[]): string {
  let best: MatchCandidate | null = null;
  for (const candidate of candidates) {
    if (
      best === null ||
      candidate.weight > best.weight ||
      (candidate.weight === best.weight && candidate.text.length > best.text.length)
    ) {
      best = candidate;
    }
  }
  return best?.text.trim() ?? "";
}

export function outcomeFor(
  index: MatchIndex,
  candidates: readonly MatchCandidate[],
  packageSays?: PackageSays | null | undefined,
): ScanOutcome {
  if (candidates.length === 0) {
    if (packageSays !== undefined && packageSays !== null) {
      return { kind: "package-says", packageSays, read: "" };
    }
    return { kind: "none", read: "" };
  }
  const decision = decide(match(index, candidates));
  switch (decision.kind) {
    case "accept":
      return {
        kind: "accept",
        strainId: decision.match.strain_id,
        read: decision.match.candidate,
      };
    case "choose":
      return {
        kind: "choose",
        read: decision.candidates[0]?.candidate ?? bestRead(candidates),
        candidates: decision.candidates,
        cross: decision.blocked_by.includes("parent_of_cross"),
        blockedBy: decision.blocked_by,
      };
    case "none": {
      const read = bestRead(candidates);
      if (packageSays !== undefined && packageSays !== null) {
        return { kind: "package-says", packageSays, read };
      }
      return { kind: "none", read };
    }
  }
}
