// Entry point for `pnpm vault:review`. Only a person at an interactive terminal can use it (session.ts).
import { defaultEnv } from "../cli";
import { nodeDeps, nodeIO } from "./node-io";
import { runReview } from "./session";

const io = nodeIO();
const env = defaultEnv();
try {
  process.exitCode = await runReview(process.argv.slice(2), { ...nodeDeps(io, env.repoRoot), env });
} finally {
  io.close();
}
