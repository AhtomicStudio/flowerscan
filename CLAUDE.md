# CLAUDE.md

All project rules live in AGENTS.md. Read it first, every session:

@AGENTS.md

## Claude Code specifics
- Sub-agent roles are in `.claude/agents/` (roster: `.claude/agents/README.md`). Use the role named in a
  task's `owner:` field when delegating. Run independent tasks in parallel only when their `touches:` don't overlap.
- For UI work, also follow the `frontend-design` / `impeccable` skills if available, but docs/08 wins on conflicts.
- FlowerScan is a **separate brand** from Cannapickforme (open-questions Q1). Do **not** apply the
  `cannapickforme-brand` skill's tokens or voice here. Use docs/08, docs/09, and docs/13 instead.
