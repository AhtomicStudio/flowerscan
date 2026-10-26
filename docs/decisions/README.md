# Architecture Decision Records

One file per decision: `NNNN-short-title.md`, copied from [`_template.md`](_template.md).
Never edit the decision of an accepted ADR. Write a new one that supersedes it, and update the old
one's status to `Superseded by NNNN`.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-pwa-not-native.md) | Ship as a PWA, not a native app | Accepted |
| [0002](0002-monorepo-with-pure-core.md) | pnpm workspace with a pure-TypeScript `core` package | Accepted |
| [0003](0003-obsidian-vault-as-strain-source.md) | The Obsidian vault is the source of the strain database | Accepted |
| [0004](0004-lineage-derived-classification.md) | Classification is computed from lineage, with confidence | Accepted |
| [0005](0005-local-first-no-accounts-in-mvp.md) | Local-first, no accounts or backend in the MVP | Accepted |
| [0006](0006-toolchain-versions.md) | Toolchain versions (Node 24, pnpm 12, TS 7, Vite 8, Vitest 5) and source-exported packages | Accepted |

"Accepted" here means accepted as the plan. Founders can still overturn any of them before T-001 starts.
