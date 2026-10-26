# FlowerScan *(working name)*

Point your phone at a cannabis package and find out, in about two seconds, whether it's **Indica, Sativa, or Hybrid**,
derived from the strain's actual family tree, with a confidence level and only the tags our data verifies.

> **Status: Phase 1, M0.** The workspace is scaffolded (T-001). Features start with T-002. Start with [docs/README.md](docs/README.md).

## How this repo works
- **Specs** live in [`docs/`](docs/README.md). Decisions live in [`docs/decisions/`](docs/decisions/README.md).
- **Work** happens through task files in [`tasks/`](tasks/README.md). Start with T-001.
- **AI agents** follow [`AGENTS.md`](AGENTS.md) (Claude Code reads `CLAUDE.md`, Gemini CLI reads `GEMINI.md`;
  both point to AGENTS.md).
- **Strain data** is an Obsidian vault at [`data/vault/`](data/vault/README.md).

## Layout
```
apps/web/            React + Vite PWA
packages/core/       pure TS domain logic (lineage, matching, Markdown)
tools/vault-build/   vault → app data compiler
data/vault/          Obsidian vault (strain database source)
data/taxonomy/       tag vocabulary
data/eval/           scanner accuracy golden set
docs/                specs + ADRs
tasks/               work queue
.claude/agents/      agent role prompts
```

## Getting started

You need **Node 24 LTS** (≥ 24.15) and **pnpm 12**:

```bash
npm install -g pnpm@12.15.0
```

```bash
pnpm install
```

```bash
pnpm dev
```

The dev server prints a `Local` and a `Network` URL, both HTTPS (the camera requires a secure context).

**Testing on your phone:** join the same Wi-Fi and open the `Network` URL. The certificate is self-signed,
so the browser warns once. Choose "Advanced → Proceed" (Android Chrome) or "Show Details → visit this
website" (iPhone Safari). If Windows Firewall asks about Node, allow it on **private** networks only.

All commands: [AGENTS.md § Commands](AGENTS.md#commands).
