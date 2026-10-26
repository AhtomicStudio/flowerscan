import { SCHEMA_VERSION } from "@flowerscan/core";

export type Command = "check" | "build";

export interface CliResult {
  exitCode: number;
  message: string;
}

const USAGE = "Usage: vault-build <check|build> [--include-unverified]";

/** Pure command dispatch, so the CLI is testable without spawning a process. */
export function run(argv: readonly string[]): CliResult {
  const [command] = argv;

  if (command !== "check" && command !== "build") {
    return { exitCode: 2, message: USAGE };
  }

  // Stub until T-006 implements the pipeline in tools/vault-build/README.md.
  return {
    exitCode: 0,
    message: `vault-build ${command}: not implemented yet (T-006). Schema version ${SCHEMA_VERSION}.`,
  };
}
