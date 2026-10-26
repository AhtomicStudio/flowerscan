import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/index";

describe("@flowerscan/core public API", () => {
  it("exposes the schema version from docs/04", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
