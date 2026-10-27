// Vercel build: compile the strain vault, then build the web app.
// Preview deployments ship unverified notes too (dev data); production follows the default shipping policy
// (verified + disputed only, docs/04).
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "development";
const vaultFlags = env === "production" ? "" : " --include-unverified";

const run = (command) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
};

run(`pnpm vault:build${vaultFlags}`);
run("pnpm --filter @flowerscan/web build");
