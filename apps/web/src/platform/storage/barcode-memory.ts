// Local barcode memory (docs/04 "Local barcode memory", P13). On-device only. The repository is plain
// storage; the learning rule lives in the pure functions below so both implementations share it.
import {
  type BarcodeMemory,
  BarcodeMemorySchema,
  CODE_128_LEARNABLE_AFTER,
  RETAIL_BARCODE_FORMATS,
  type ScanBarcodeFormat,
} from "@flowerscan/core";

export interface BarcodeMemoryRepository {
  get(barcode: string, format: ScanBarcodeFormat): Promise<BarcodeMemory | null>;
  put(memory: BarcodeMemory): Promise<void>;
  /** Every stored memory (backup, T-016). */
  all(): Promise<BarcodeMemory[]>;
  clear(): Promise<void>;
}

const RETAIL = new Set<string>(RETAIL_BARCODE_FORMATS);

export interface LearnInput {
  readonly barcode: string;
  readonly format: ScanBarcodeFormat;
  readonly strainId: string;
  readonly now: Date;
  /** The value matches a track-and-trace UID pattern (classifyBarcode). Never stored (P13). */
  readonly tracking: boolean;
}

/**
 * What to store after the user confirmed `strainId` for a scanned barcode, or null to store nothing.
 * - UPC/EAN: learnable at once.
 * - Code 128: stored as a candidate (`learnable: false`) until a second, separate scan (P13).
 * - Tracking UIDs and every other format: never stored.
 * Confirming a different strain replaces the mapping and starts its count again.
 */
export function learnedMemory(
  existing: BarcodeMemory | null,
  input: LearnInput,
): BarcodeMemory | null {
  if (input.tracking) return null;
  const retail = RETAIL.has(input.format);
  if (!retail && input.format !== "code_128") return null;
  const sameStrain = existing !== null && existing.strain_id === input.strainId;
  const timesSeen = sameStrain ? existing.times_seen : 1;
  const memory: BarcodeMemory = {
    barcode: input.barcode,
    barcode_format: input.format,
    strain_id: input.strainId,
    confirmed_at: input.now.toISOString(),
    times_seen: timesSeen,
    learnable: retail || timesSeen >= CODE_128_LEARNABLE_AFTER,
  };
  return BarcodeMemorySchema.parse(memory);
}

/**
 * A stored Code 128 candidate seen again on a separate scan: count it, and make it learnable at the
 * second sighting. Anything else is returned unchanged.
 */
export function sightedMemory(existing: BarcodeMemory): BarcodeMemory {
  if (existing.learnable || existing.barcode_format !== "code_128") return existing;
  const timesSeen = existing.times_seen + 1;
  return BarcodeMemorySchema.parse({
    ...existing,
    times_seen: timesSeen,
    learnable: timesSeen >= CODE_128_LEARNABLE_AFTER,
  });
}

/** Memory that may resolve a scan straight to a strain. Unlearnable candidates never do. */
export async function recallBarcode(
  repo: BarcodeMemoryRepository,
  barcode: string,
  format: ScanBarcodeFormat,
): Promise<BarcodeMemory | null> {
  try {
    return await repo.get(barcode, format);
  } catch {
    // Storage blocked (private mode) or broken: behave like an empty memory, never block the scan.
    return null;
  }
}

/** An in-memory repository: the test fake, and the fallback when IndexedDB isn't available. */
export class MemoryBarcodeRepository implements BarcodeMemoryRepository {
  private readonly rows = new Map<string, BarcodeMemory>();

  private static key(barcode: string, format: string): string {
    return `${format}\u0000${barcode}`;
  }

  async get(barcode: string, format: ScanBarcodeFormat): Promise<BarcodeMemory | null> {
    return this.rows.get(MemoryBarcodeRepository.key(barcode, format)) ?? null;
  }

  async put(memory: BarcodeMemory): Promise<void> {
    this.rows.set(
      MemoryBarcodeRepository.key(memory.barcode, memory.barcode_format),
      BarcodeMemorySchema.parse(memory),
    );
  }

  async all(): Promise<BarcodeMemory[]> {
    return [...this.rows.values()];
  }

  async clear(): Promise<void> {
    this.rows.clear();
  }
}
