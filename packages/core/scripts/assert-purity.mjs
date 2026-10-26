// Proves the purity guard works: compiling purity-fixture.ts with core's settings must fail
// on every browser/Node global it touches. If this script passes, `document`, `navigator`
// and `process` are unavailable to packages/core/src.
import { spawnSync } from "node:child_process";

// A single command string (no args array): shell mode resolves the local tsc bin on every OS.
const result = spawnSync("tsc -p tsconfig.purity.json", { encoding: "utf8", shell: true });

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const forbidden = ["document", "navigator", "process"];
const leaked = forbidden.filter((name) => !output.includes(`'${name}'`));

if (result.status === 0 || leaked.length > 0) {
  console.error("Core purity guard is broken. These globals compiled inside packages/core:");
  console.error(`  ${(leaked.length > 0 ? leaked : forbidden).join(", ")}`);
  console.error(output);
  process.exit(1);
}

console.log(`Core purity guard OK: ${forbidden.join(", ")} are unavailable in packages/core.`);
