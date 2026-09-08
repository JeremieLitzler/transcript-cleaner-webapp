# Grilling summary — collapse the pane state machine into a `PaneStatus` enum

Session: `docs/grillings/2026-09-08-transcript-pane-status/`, rounds v01–v05 (v05 confirmed this summary). Subject: issue [#43](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/43).

## What was decided, and why

**The decision is: proceed.** The reflowed and cleaned panes' four booleans (`reflowedLocked`, `cleanedLocked`, `reflowedStale`, `cleanedStale`) collapse into a single per-pane `PaneStatus`, computed inside `useTranscriptStages`, and `TranscriptPane` becomes a renderer of that status. The shape was grilled across four rounds and held with no forced compromise, so Q10 confirmed the collapse goes ahead.

### The type

```ts
type PaneStatus = 'none' | 'current' | 'stale' | 'locked';
```

Four members, all load-bearing. Named `PaneStatus` — "pane" rather than "stage" because it covers all three panes including `raw`, which is input, not a stage; "status" rather than "state" because it is a display-facing summary that drives a badge, distinct from the composable's internal machine state (`ranLevel1` and the stale refs, which stay). _(Q2, Q5)_

`none` was kept as a real member rather than dropped. It means "this pane is blank and that is not an error" — the honest reading of the raw pane before anything is typed, and of the reflowed pane after a run when the user deletes its contents by hand. Reading an emptied-but-ran pane as `current` would badge absent content; reading it as `stale` would claim an upstream change that did not happen. _(Q2)_

### Where the precedence lives

The `locked > stale > current > none` ranking — currently split between `useTranscriptStages`, `App.vue`, and `TranscriptPane`'s `badge` computed — moves into `useTranscriptStages` and only there. Each of `rawStatus`, `reflowedStatus`, `cleanedStatus` (all `ComputedRef<PaneStatus>`) collapses `ranLevel1` / the stale refs / pane-emptiness into one value using that order, unchanged from how `TranscriptPane` ranks it today. `TranscriptPane`'s `badge` computed stops ranking anything; `App.vue` stops passing `:locked` and `:stale`. _(Q1, Q3)_

Which values each pane can actually reach:

| Value     | `raw`      | `reflowed`                          | `cleaned`                         |
| --------- | ---------- | ----------------------------------- | --------------------------------- |
| `none`    | empty      | emptied by hand after a level-1 run | never (emptiness is its `locked`) |
| `current` | holds text | level 1 has run, nothing stale      | level 2 has produced text         |
| `stale`   | never      | raw edited since this reflow        | upstream changed since this clean |
| `locked`  | never      | level 1 has never run               | level 2 has produced nothing yet  |

The raw pane keeps its existing badge behaviour: non-empty > `current`, empty > `none`. A `current` badge on the input pane is a known one bit of signal ("there is content to reflow"), it turns on with the `Reflow` button, and removing it would be a visible UI change riding on a refactor — out of scope for #43, its own small issue if ever wanted. _(Q11)_

### `useTranscriptStages` interface after the change

- **Added:** `rawStatus`, `reflowedStatus`, `cleanedStatus` — `ComputedRef<PaneStatus>`.
- **Removed:** `reflowedLocked`, `cleanedLocked`, `reflowedStale`, `cleanedStale`.
- **Kept:** `raw` / `reflowed` / `cleaned`; `canRunLevel1` and `canRunLevel2` (both stay named computeds on the interface — `canRunLevel2` does **not** collapse to a bare `reflowedStatus !== 'locked'` at the call site, because the name carries the "Q13b gate" intent and `App.vue` plus `app.test.ts` both lean on it); `editRaw` / `editReflowed` / `runLevel1` / `runLevel2` / `markCleanedStale`.

The derived surface is therefore **four** computeds (`canRunLevel1`, `rawStatus`, `reflowedStatus`, `cleanedStatus`), not the three the issue sketched — the difference is `rawStatus`, added so `TranscriptPane` needs no fallback derivation for the one pane the issue's sketch left out. _(Q1, Q4)_

### `TranscriptPane` interface after the change

- **Added:** `status: PaneStatus` — the pane's sole state input.
- **Removed:** `locked?: boolean`, `stale?: boolean`, and the `modelValue !== ''` branch of the old `badge` computed.
- **Kept:** `modelValue` (same name — the `v-model` binding, now pure content I/O), `readonly` (its own prop, orthogonal to `status` — `locked` does **not** imply read-only), `title`, `sub` / the `sub` slot, `placeholder`.

The `status` > `{ badge text, badge variant }` mapping lives **inside** `TranscriptPane` as a lookup keyed by `status`, replacing the old `badge` computed. The `badge-ok` / `badge-lock` classes stay next to the markup that uses them. Badge text and variant per value are preserved exactly: `current` > `{ 'current', 'badge-ok' }`, `stale` > `{ 'stale — re-run', '' }`, `locked` > `{ 'locked', 'badge-lock' }`, `none` > no badge. The section and textarea `:class` bindings that currently key on the `locked` / `stale` props re-key onto `status`. _(Q7, Q8, Q9)_

### `CONTEXT.md`

Gets **both**: a settled-scope bullet recording the decision (why the booleans collapsed, the precedence order, `TranscriptPane` as pure renderer, cite this grilling) **and** a dedicated glossary entry — a short table like "the three artefacts" — defining the four `PaneStatus` values and which panes reach each. The descriptive "Where things live" row for the composable is the one part that waits until the code matches. _(Q6, Q12)_

### Landing and follow-up

This grilling is running on `refactor/web-use-transcript-stages`, which is PR **#42**'s branch (open, into `develop`, carrying #40 / #41).

1. **#42 merges** first, on its own scope.
2. **A separate `docs(context)` PR into `develop`** carries #43's deliverables — the round files, this summary, and the `CONTEXT.md` decision bullet + glossary entry. Kept out of #42 so that PR's review surface stays on #40 / #41, matching the repo's "one PR, one intent" habit. #43 closes with that PR. _(Q12)_
3. **One implementation ticket**, `ready-for-agent`, blocked by #43: `useTranscriptStages.ts`, `TranscriptPane.vue`, `App.vue`, `use-transcript-stages.test.ts`, `transcript-pane.test.ts`, `app.test.ts` — one PR, `npm run check` and the goldens green. Not split, because the change does not type-check in halves. #43's file list is amended to add `use-transcript-stages.test.ts`, which it omitted. _(Q13)_

## Decision index

- Q1 (v01) — One `PaneStatus` type for all three panes; `useTranscriptStages` exposes `rawStatus` / `reflowedStatus` / `cleanedStatus`; `TranscriptPane` derives no state. Derived surface is four computeds, not three.
- Q2 (v01) — `none` stays a real member; enum is `'none' | 'current' | 'stale' | 'locked'`; an emptied-but-ran pane reports `none`.
- Q3 (v01) — The `locked > stale > current > none` precedence moves into `useTranscriptStages` and only there; `TranscriptPane.badge` stops ranking; `App.vue` stops passing `:locked` / `:stale`.
- Q4 (v01) — `canRunLevel2` stays a named computed on the interface; `canRunLevel1` stays too.
- Q5 (v02) — The type is named `PaneStatus`.
- Q6 (v02) — `CONTEXT.md` gets both a settled-scope bullet and a dedicated four-value glossary entry.
- Q7 (v02) — `TranscriptPane` keeps `modelValue` (unchanged name) as pure content I/O; the `modelValue !== ''` derivation is removed; `status` is the sole state input.
- Q8 (v02) — The `status` > `{ badge text, badge variant }` lookup lives inside `TranscriptPane`; badge text and variant per value are preserved exactly.
- Q9 (v02) — `readonly` stays its own prop, orthogonal to `status`.
- Q10 (v03) — Proceed with the collapse; open a `ready-for-agent` implementation ticket blocked by #43.
- Q11 (v03) — The raw pane keeps its current badge behaviour (`current` when non-empty, `none` when empty); `rawStatus` ranges over `{ none, current }`.
- Q12 (v04) — #43's deliverables land in a separate `docs(context)` PR into `develop` after #42 merges, not folded into #42.
- Q13 (v04) — One implementation ticket / one PR covering all six files; #43's file list amended to add `use-transcript-stages.test.ts`.

No question was superseded or re-asked; the frontier emptied cleanly.

## Decided to produce the artefact but never grilled

Flag these before the implementation ticket is written — object now if any is wrong:

- **The `PaneStatus` type is exported from `useTranscriptStages.ts`** (next to `TranscriptStages`) and imported by `TranscriptPane.vue` and the tests, rather than living in a new `packages/web/src/types.ts`. Assumed for minimal surface.
- **`canRunLevel1`'s internal expression** may stay `raw.value.trim() !== ''` or become `rawStatus.value === 'current'` — equivalent; left to the implementer.
- **`app.test.ts` is assumed to need only incidental edits**, because it already asserts on badge _text_ (`'locked'`, `'current'`, `'stale — re-run'`), which Q8 preserves. If it turns out to read the `locked` / `stale` props directly anywhere, those spots move to `status`.
