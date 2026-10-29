// Vercel build: compile the strain vault, then build the web app.
// During the beta (D19) every deployment ships unverified notes too, and the app shows a beta notice because
// the data_version ends with "-dev". At launch, set BETA to false: production then follows the default shipping
// policy (verified + disputed only, docs/04) and previews keep the dev data.
// The Vercel project's Root Directory must be the repo root, where vercel.json lives (not apps/web).
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const env = process.env.VERCEL_ENV ?? "development";
const BETA = true;
const vaultFlags = env === "production" && !BETA ? "" : " --include-unverified";

const run = (command) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", cwd: repoRoot });
};

run(`pnpm vault:build${vaultFlags}`);
run("pnpm --filter @flowerscan/web build");
