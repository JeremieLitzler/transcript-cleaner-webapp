# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary and the settled decisions.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/adr/
└── packages/
    ├── rules/
    └── web/
```

Two packages, one glossary: `packages/rules` and `packages/web` share the vocabulary `CONTEXT.md` already defines (the three artefacts, the two levels), so they are not two domains needing a `CONTEXT-MAP.md` split.

## Also in this repo

Two more records worth reading before proposing a change, alongside `CONTEXT.md` and `docs/adr/`:

- **`docs/port-divergences.md`** — every place the TypeScript code and the original Python spec disagree, each with a measured example and a disposition (confirmed, won't-fix, or a phase-2 fix). Check here before treating a rule's behaviour as a bug.
- **`docs/grillings/`** — the scope-grilling rounds `CONTEXT.md` was written from, one file per round. Useful for the reasoning behind a decision `CONTEXT.md` only states the outcome of.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
