// BarcodeMemoryRepository on IndexedDB (Dexie). One database for all on-device user data: this task adds
// the barcode_memory table (version 1). The journal (T-015) adds its tables as a new Dexie version.
import { type BarcodeMemory, BarcodeMemorySchema, type ScanBarcodeFormat } from "@flowerscan/core";
import { Dexie, type Table } from "dexie";
import type { BarcodeMemoryRepository } from "./barcode-memory";

export const DB_NAME = "flowerscan";

type MemoryRow = BarcodeMemory;

export class FlowerScanDb extends Dexie {
  barcode_memory!: Table<MemoryRow, [string, string]>;

  constructor(name = DB_NAME, options?: ConstructorParameters<typeof Dexie>[1]) {
    super(name, options);
    // Compound primary key: the same digits in two formats are two memories (docs/04 backup rule).
    this.version(1).stores({ barcode_memory: "[barcode_format+barcode], strain_id" });
  }
}

export class DexieBarcodeRepository implements BarcodeMemoryRepository {
  constructor(private readonly db: FlowerScanDb = new FlowerScanDb()) {}

  async get(barcode: string, format: ScanBarcodeFormat): Promise<BarcodeMemory | null> {
    const row = await this.db.barcode_memory.get([format, barcode]);
    if (row === undefined) return null;
    // Rows are validated on the way out too: a bad row (old version, manual edit) is ignored, not trusted.
    const parsed = BarcodeMemorySchema.safeParse(row);
    return parsed.success ? parsed.data : null;
  }

  async put(memory: BarcodeMemory): Promise<void> {
    await this.db.barcode_memory.put(BarcodeMemorySchema.parse(memory));
  }

  async all(): Promise<BarcodeMemory[]> {
    const rows = await this.db.barcode_memory.toArray();
    return rows.flatMap((row) => {
      const parsed = BarcodeMemorySchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async clear(): Promise<void> {
    await this.db.barcode_memory.clear();
  }
}
