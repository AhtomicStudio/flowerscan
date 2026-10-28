// The real terminal, disk, clock and git for `vault:review`. Kept thin: the logic is in session.ts.
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import type { ReviewDeps, ReviewFiles, ReviewIO } from "./session";

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

export const nodeFiles: ReviewFiles = {
  readBytes: (path) => readFile(path),
  async readText(path) {
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  },
  async writeFile(path, data) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  },
  async readDir(path) {
    try {
      return (await readdir(path)).sort();
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  },
};

/** Opens a URL in the default browser without a shell (so `&` in a URL can't run anything). */
function openUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
  const [command, args] =
    process.platform === "win32"
      ? ["rundll32", ["url.dll,FileProtocolHandler", parsed.href]]
      : process.platform === "darwin"
        ? ["open", [parsed.href]]
        : ["xdg-open", [parsed.href]];
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Best effort only.
  }
}

/** The process terminal. `close` must be called when the session ends. */
export function nodeIO(): ReviewIO & { close(): void } {
  const stdinIsTTY = process.stdin.isTTY === true;
  const stdoutIsTTY = process.stdout.isTTY === true;
  // No readline without a terminal: the session refuses before asking anything.
  const rl =
    stdinIsTTY && stdoutIsTTY
      ? createInterface({ input: process.stdin, output: process.stdout })
      : null;
  let closed = false;
  /** Resolves the open question with null when input ends. One listener for the whole session. */
  let pending: ((answer: string | null) => void) | null = null;
  rl?.on("close", () => {
    closed = true;
    pending?.(null);
    pending = null;
  });
  // Ctrl+C ends input like Ctrl+D: the session quits with its summary (nothing is mid-write at a prompt).
  rl?.on("SIGINT", () => rl.close());
  return {
    stdinIsTTY,
    stdoutIsTTY,
    print: (text) => {
      process.stdout.write(`${text}\n`);
    },
    ask: (prompt) =>
      new Promise((resolve) => {
        if (rl === null || closed) {
          resolve(null);
          return;
        }
        pending = resolve;
        rl.question(prompt).then(
          (answer) => {
            pending = null;
            resolve(answer);
          },
          () => {
            pending = null;
            resolve(null);
          },
        );
      }),
    openUrl,
    close: () => rl?.close(),
  };
}

/** Local date as `YYYY-MM-DD`. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function gitUserName(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("git", ["config", "user.name"], { cwd, timeout: 5000 }, (error, stdout) => {
      const name = String(stdout ?? "").trim();
      resolve(error === null && name !== "" ? name : null);
    });
  });
}

export function nodeDeps(io: ReviewIO, repoRoot: string): ReviewDeps {
  return {
    io,
    files: nodeFiles,
    today: () => localToday(),
    defaultReviewer: () => gitUserName(repoRoot),
    sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
  };
}
