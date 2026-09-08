# Grilling round v02 — collapse the pane state machine into a PaneStatus enum

## Settled in v01

- **Q1 — one status type for all three panes.** `useTranscriptStages` exposes a status computed per pane: `rawStatus`, `reflowedStatus`, `cleanedStatus`. `TranscriptPane` takes a `status` prop and derives no state of its own. The composable's derived surface is therefore **four** computeds — `canRunLevel1`, `rawStatus`, `reflowedStatus`, `cleanedStatus` — not the three the issue sketched; you accepted that without flagging it.
- **Q2 — `none` stays a real enum member.** The four values are `none | current | stale | locked`, every one load-bearing. A pane that ran and was then emptied by hand reports `none` and shows no badge, as today. `none` is also the raw pane's resting (empty) state.
- **Q3 — the `locked > stale > current > none` precedence moves into the composable, and only there.** Each `*Status` computed collapses `ranLevel1` / the stale refs / pane-emptiness into one value using that order, unchanged from how `TranscriptPane` ranks it today. `TranscriptPane`'s `badge` computed stops ranking anything; `App.vue` stops passing `:locked` and `:stale`.
- **Q4 — `canRunLevel2` stays a named computed on the interface.** `canRunLevel1` stays too. Neither collapses to a bare `reflowedStatus !== 'locked'` at the call site.

## Q5 - Name the type

The proposed name is `PaneStatus`. Alternatives raised in the issue: `StageStatus`, or something else (`PaneState`, `BadgeStatus`, …).

➡️ Recommendation: **`PaneStatus`**. Q1 put all three panes under one type, and the raw pane is _input_, not a "stage" — level 1 and level 2 are the stages. "Stage" would exclude the raw pane by its own name. "Status" rather than "state" because the value is a reported, display-facing summary — it drives a badge — while the actual machine state (`ranLevel1`, the stale refs) stays inside the composable and is not this type. It also matches the `status` prop `TranscriptPane` gets under Q3.

### Answer to Q5

go for Recommendation

## Q6 - Do the four status values get a glossary entry in `CONTEXT.md`?

Issue #43's acceptance criteria already require `CONTEXT.md` to _state the decision_ — that goes in the settled-scope bullet list, in the existing `_(Qnn)_` style, covering why the six booleans collapsed, the precedence order, and `TranscriptPane` becoming a pure renderer.

The separate question: do `none` / `current` / `stale` / `locked` _also_ get their own glossary-style entry — a short definition table like the "three artefacts" one near the top of `CONTEXT.md` — or is naming them inside the settled bullet enough?

a. **Dedicated glossary entry** plus the settled-scope bullet. A small table: each value, what it means, which panes can reach it.
b. **Settled-scope bullet only.** Name the four values in the bullet; no separate table.

➡️ Recommendation: **(a)**. Those four words are now shared domain vocabulary — code (`reflowedStatus === 'stale'`), tests, and review comments all use them, and a reader needs to know what `stale` _promises_ (upstream changed, content kept) versus `locked` (never ran). That is exactly what the glossary is for. The settled-scope bullet is decision history; the table is the vocabulary. They are different records and #43 effectively asks for both.

### Answer to Q6

go for Recommendation

## Q7 - `TranscriptPane` keeps `modelValue`, deriving nothing from it

`modelValue` has to stay as the textarea's two-way text binding (`:value` in, `update:modelValue` out) — that is how text enters and leaves a pane. What goes is the `modelValue !== ''` branch inside the old `badge` computed. After this, `status` is the pane's sole _state_ input and `modelValue` is purely _content_ I/O.

Confirm that split, and confirm `modelValue` keeps its name (the `v-model` default) rather than being renamed to something like `text`.

➡️ Recommendation: **confirm both**. The split is what makes `TranscriptPane` a renderer of `status`. Keep the name `modelValue`: `App.vue` already binds it as `v-model`-style on all three panes and a rename buys nothing.

### Answer to Q7

go for Recommendation

## Q8 - Where does the `status` > `{ badge text, badge variant }` mapping live?

The mapping is a fixed four-way lookup: `locked` > `{ 'locked', 'badge-lock' }`, `stale` > `{ 'stale — re-run', '' }`, `current` > `{ 'current', 'badge-ok' }`, `none` > no badge.

a. **Inside `TranscriptPane`** — a lookup keyed by `status`, replacing today's `badge` computed. The pane owns its own presentation.
b. **In the consumer** — `App.vue` or the composable passes `badgeText` / `badgeVariant` as props; `TranscriptPane` just renders them.

➡️ Recommendation: **(a)**. Q3 made `TranscriptPane` the renderer of `status`, and the status-to-badge map _is_ the rendering. Option (b) spreads pane presentation across two files and forces each of the three `<TranscriptPane>` call sites to name badge text they currently never mention. A single lookup object inside the pane is the smaller surface and keeps the CSS classes (`badge-ok`, `badge-lock`) next to the markup that uses them.

### Answer to Q8

go for Recommendation

## Q9 - `readonly` prop: does it stay, or fold into `status`?

The cleaned pane is `readonly` in every status it can hold (`current`, `stale`, `locked`). Read-only-ness is a fixed property of _which pane it is_ — output has nowhere to send edits — not of the pane's status.

a. **Keep `readonly` as its own prop**, unchanged. `App.vue` sets it on the cleaned pane only.
b. **Fold it in** — derive it (e.g. the cleaned pane is the only read-only one, or `locked` implies read-only).

➡️ Recommendation: **(a)**. `readonly` is an orthogonal axis and already correct. `locked` does _not_ imply read-only — a locked reflowed pane is still editable the moment you type in it — so folding the two together would be wrong, not just coupled.

### Answer to Q9

go for Recommendation
