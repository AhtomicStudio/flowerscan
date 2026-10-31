// Known brand names, captured as `brand` (docs/06 §3). A list we grow over time.
//
// Seed rule (domain review §4 "Brands"): grow it from the golden set (T-012), not from memory. The
// seed holds only the brands the domain review names with a source: Cookies and Runtz [F 33],
// Seed Junky [F 30], Sherbinskis [F 28].

export interface BrandEntry {
  /** Display spelling, returned as `brand`. */
  readonly name: string;
  /**
   * The brand is also a strain-name token (`Cookies`, `Runtz`). Match before stripping (P6) protects
   * it: it counts as the brand only when it stands alone, and repeats of it are read as names.
   */
  readonly strainToken: boolean;
  /** Other spellings seen on packages. */
  readonly spellings?: readonly string[];
}

export const BRANDS: readonly BrandEntry[] = [
  { name: "Cookies", strainToken: true },
  { name: "Runtz", strainToken: true },
  { name: "Seed Junky", strainToken: true, spellings: ["Seed Junky Genetics"] },
  { name: "Sherbinskis", strainToken: false, spellings: ["Sherbinski", "Sherbinski's"] },
];
