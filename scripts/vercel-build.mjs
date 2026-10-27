// Vercel build: compile the strain vault, then build the web app.
// Preview deployments ship unverified notes too (dev data); production follows the default shipping policy
// (verified + disputed only, docs/04).
// The Vercel project's Root Directory must be the repo root, where vercel.json lives (not apps/web).
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const env = process.env.VERCEL_ENV ?? "development";
const vaultFlags = env === "production" ? "" : " --include-unverified";

const run = (command) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", cwd: repoRoot });
};

run(`pnpm vault:build${vaultFlags}`);
run("pnpm --filter @flowerscan/web build");
