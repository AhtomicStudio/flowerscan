// Stable codes → what to do with each → the one we lock onto (docs/design/flows.md §2a). With several codes
// in the same window the scanner picks one, no chooser: our deep link, then a remembered barcode, then a QR
// whose URL gives slug candidates, then an unknown UPC/EAN, then everything else.
import type { BarcodeMemory, MatchCandidate, ScanBarcodeFormat } from "@flowerscan/core";
import type { DetectedCode } from "../../platform/detectors/protocol";
import { type BarcodeMemoryRepository, recallBarcode } from "../../platform/storage/barcode-memory";
import type { CodeClassifier } from "./code-classifier";

export type CodeAction =
  | { readonly kind: "deep-link"; readonly strainId: string }
  | { readonly kind: "remembered"; readonly strainId: string; readonly memory: BarcodeMemory }
  | {
      readonly kind: "qr-candidates";
      readonly source: "url" | "text";
      readonly payload: string;
      readonly candidates: readonly MatchCandidate[];
    }
  | {
      readonly kind: "unknown-barcode";
      readonly value: string;
      readonly format: ScanBarcodeFormat;
      /** UPC/EAN and Code 128 can be learned (P13); other formats never are. */
      readonly learnable: boolean;
      /** A stored Code 128 candidate (seen once), if any. */
      readonly candidate: BarcodeMemory | null;
    }
  | { readonly kind: "tracking"; readonly value: string; readonly format: ScanBarcodeFormat }
  | { readonly kind: "coa"; readonly url: string }
  | { readonly kind: "traceability"; readonly url: string };

export interface ResolvedCode {
  readonly code: DetectedCode;
  readonly action: CodeAction;
}

type Pending =
  | { readonly code: DetectedCode; readonly action: CodeAction }
  | {
      readonly code: DetectedCode;
      readonly lookup: { readonly value: string; readonly format: ScanBarcodeFormat };
      readonly learnable: boolean;
    };

/** Sync step: classify every code and drop misreads (bad UPC/EAN check digits). */
export function classifyCodes(
  codes: readonly DetectedCode[],
  classifier: CodeClassifier,
): Pending[] {
  const out: Pending[] = [];
  for (const code of codes) {
    if (code.format === "qr_code") {
      const facts = classifier.classifyQr(code.value);
      switch (facts.kind) {
        case "deep_link":
          out.push({ code, action: { kind: "deep-link", strainId: facts.strain_id } });
          break;
        case "coa":
          out.push({ code, action: { kind: "coa", url: facts.url } });
          break;
        case "traceability":
          out.push({ code, action: { kind: "traceability", url: facts.url } });
          break;
        case "url":
        case "text":
          out.push({
            code,
            action: {
              kind: "qr-candidates",
              source: facts.kind,
              payload: code.value,
              candidates: facts.candidates,
            },
          });
          break;
      }
      continue;
    }
    const format = code.format;
    const facts = classifier.classifyBarcode(code.value, format);
    if (facts.kind === "invalid") continue;
    if (facts.kind === "tracking") {
      out.push({ code, action: { kind: "tracking", value: facts.value, format } });
      continue;
    }
    out.push({
      code,
      lookup: { value: facts.value, format },
      learnable: facts.kind === "retail" || format === "code_128",
    });
  }
  return out;
}

/** Async step: barcodes are looked up in local memory. */
export async function resolveCodes(
  pending: readonly Pending[],
  memory: BarcodeMemoryRepository,
): Promise<ResolvedCode[]> {
  return Promise.all(
    pending.map(async (entry): Promise<ResolvedCode> => {
      if ("action" in entry) return { code: entry.code, action: entry.action };
      const { value, format } = entry.lookup;
      const stored = entry.learnable ? await recallBarcode(memory, value, format) : null;
      if (stored?.learnable) {
        return {
          code: entry.code,
          action: { kind: "remembered", strainId: stored.strain_id, memory: stored },
        };
      }
      return {
        code: entry.code,
        action: {
          kind: "unknown-barcode",
          value,
          format,
          learnable: entry.learnable,
          candidate: stored,
        },
      };
    }),
  );
}

/** Priority tier (lower wins) and a tie-break inside tier 5. */
export function priority(action: CodeAction): readonly [number, number] {
  switch (action.kind) {
    case "deep-link":
      return [1, 0];
    case "remembered":
      return [2, 0];
    case "qr-candidates":
      return action.source === "url" && action.candidates.length > 0 ? [3, 0] : [5, 0];
    case "unknown-barcode":
      return action.format === "code_128" || !action.learnable ? [5, 1] : [4, 0];
    case "tracking":
      return [5, 2];
    case "traceability":
      return [5, 3];
    case "coa":
      return [5, 4];
  }
}

/** The one code we lock onto: best tier, then the biggest box (closest to the camera). */
export function pickCode(resolved: readonly ResolvedCode[]): ResolvedCode | null {
  let best: ResolvedCode | null = null;
  for (const entry of resolved) {
    if (best === null) {
      best = entry;
      continue;
    }
    const [tier, sub] = priority(entry.action);
    const [bestTier, bestSub] = priority(best.action);
    const area = entry.code.box.width * entry.code.box.height;
    const bestArea = best.code.box.width * best.code.box.height;
    if (
      tier < bestTier ||
      (tier === bestTier && (sub < bestSub || (sub === bestSub && area > bestArea)))
    ) {
      best = entry;
    }
  }
  return best;
}
