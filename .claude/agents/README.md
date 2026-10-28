# The FlowerScan Agent Team

Eleven specialist roles. Each file here is a role prompt: Claude Code loads them as sub-agents
automatically, and Gemini (or any other AI) can be told "act as the role in `.claude/agents/<role>.md`".
Every role follows `AGENTS.md` first.

| Role | Does | Writes to | Never |
| --- | --- | --- | --- |
| **researcher** | Sourced research notes: benchmarks, standards, libraries, data sources, regulations | `docs/research/` | Guess, scrape where prohibited, sign in anywhere |
| **product-designer** | Flows, wireframes, HTML mockups, screen specs, design reviews | `docs/design/` | Build production code, invent strain facts |
| **cannabis-expert** | Domain accuracy: genetics, naming, packaging, industry language, compliance | Review notes, doc suggestions | Set `verified`, write vault facts, make medical claims |
| **marketing** | Drafts for Roy: names, taglines, landing and social copy, launch plans | `docs/brand/drafts/` | Finalize anything (Roy decides), overpromise |
| **data-curator** | Strain/landrace/cross notes with sources, taxonomy | `data/vault/`, `data/taxonomy/` | Fill a field without a source, set `verified` |
| **fact-checker** | Independently re-checks a note's cited sources before founder review | `data/review/precheck/` | Edit the vault, set `verified`, rescue a claim with new sources |
| **core-engineer** | Pure TS domain logic and Node tooling | `packages/core/`, `tools/` | Use DOM/Node APIs in core |
| **scanner-engineer** | Camera, barcode/QR, OCR workers, scan eval | `apps/web/src/platform`, `apps/web/src/workers`, `data/eval/` | Let OCR decide a result |
| **ui-engineer** | Screens, components, tokens, PWA | `apps/web/src/` | Render filler, break the quality bar |
| **qa-tester** | Tests the running app like a user, writes e2e tests, files bugs | `apps/web/e2e/`, `tasks/backlog/` (bugs) | Change product code |
| **reviewer** | Final gate: spec, compliance, privacy, no-filler, boundaries | Review report only | Edit files |

## How a feature flows through the team

```
researcher ──▶ product-designer ──▶ cannabis-expert (domain check, where relevant)
                     │
                     ▼
          core / scanner / ui engineers ──▶ qa-tester ──▶ reviewer ──▶ tasks/done
                                                            ▲
data-curator ──▶ fact-checker (pre-check) ──▶ founder approves in `pnpm vault:review`
marketing drafts ──▶ Roy decides ──▶ docs/brand/
```

## Running them
- **One at a time:** Claude picks the role named in a task's `owner:` field and delegates to it.
- **In parallel:** tasks with no shared files (see "Parallel lanes" in `tasks/README.md`) can run as
  separate agents or separate Claude Code sessions at the same time. Two writers never touch the same files.
- **Humans stay in the loop:** founders approve data and product decisions, Roy approves brand work, and
  real-device testing needs a person with a phone.
