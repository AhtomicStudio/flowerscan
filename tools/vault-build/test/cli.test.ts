import { describe, expect, it } from "vitest";
import { run } from "../src/cli";

describe("vault-build cli", () => {
  it.each(["check", "build"])("accepts the %s command", (command) => {
    expect(run([command]).exitCode).toBe(0);
  });

  it("rejects unknown commands with usage", () => {
    const result = run(["deploy"]);
    expect(result.exitCode).toBe(2);
    expect(result.message).toMatch(/^Usage:/);
  });

  it("rejects a missing command", () => {
    expect(run([]).exitCode).toBe(2);
  });
});
