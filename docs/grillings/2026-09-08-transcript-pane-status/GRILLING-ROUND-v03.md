# Grilling round v03 — collapse the pane state machine into a PaneStatus enum

## Settled in v02

- **Q5 — the type is named `PaneStatus`.** "Pane" because Q1 put all three panes under it and the raw pane is not a "stage"; "status" because it is a display-facing summary, not the composable's internal machine state.
- **Q6 — `CONTEXT.md` gets both.** A settled-scope bullet recording the decision (why the six booleans collapsed, the precedence, `TranscriptPane` as pure renderer) _and_ a dedicated glossary entry defining the four values and which panes can reach each.
- **Q7 — `TranscriptPane` keeps `modelValue`, unchanged in name, as pure content I/O.** The `modelValue !== ''` branch of the old `badge` computed is removed; `status` becomes the pane's only state input.
- **Q8 — the `status` > `{ badge text, badge variant }` lookup lives inside `TranscriptPane`.** It replaces the old `badge` computed; the `badge-ok` / `badge-lock` classes stay next to the markup.
- **Q9 — `readonly` stays its own prop.** It is orthogonal to `status`; `locked` does not imply read-only.

## Q10 - Proceed with the collapse?

The shape has held across two rounds with no forced compromise. What "yes" costs and buys:

**Costs.** A new `PaneStatus` type and one precedence ladder to maintain. `useTranscriptStages` gains `rawStatus` / `reflowedStatus` / `cleanedStatus` and drops `reflowedLocked` / `cleanedLocked` / `reflowedStale` / `cleanedStale` — net four computeds where there were six booleans, plus the type. `TranscriptPane` loses `locked` / `stale` / the `modelValue !== ''` derivation, gains `status` and the internal lookup. `App.vue` stops passing `:locked` / `:stale`. Test churn: `transcript-pane.test.ts` styling assertions re-key from the `locked` / `stale` props to `status`; `use-transcript-stages.test.ts` six-boolean cases become `*Status` cases; `app.test.ts` mostly survives because it already reads badge _text_.

**Buys.** The `locked > stale > current > none` precedence lives in exactly one place instead of three. "What does this pane show" has one answer site. Every consumer of the composable gets a smaller surface.

a. **Proceed.** Open a `ready-for-agent` implementation ticket blocked by #43.
b. **Do not proceed.** Record in `CONTEXT.md` why (per #43's acceptance criteria) so a future architecture review does not re-raise it.

➡️ Recommendation: **(a)**. The shape survived two rounds of grilling without a compromise; the four-member enum is honest; every consumer gets simpler. The test churn is re-expression, not new coverage — and `app.test.ts`, the behavioural wiring net, barely moves, which is the signal that this is a refactor and not a behaviour change.

### Answer to Q10

go for a

## Q11 - What should the raw pane's badge show?

Today a non-empty raw pane shows a green `current` badge (from `modelValue !== ''`); an empty one shows nothing. Making the raw pane a `PaneStatus` citizen (Q1) forces the question to be answered on purpose rather than inherited: is a `current` badge on the _input_ pane meaningful, or is it noise — of course it is "current", the user just typed it. `stale` and `locked` are already unreachable for the raw pane.

a. **Keep it.** Non-empty raw > `current`, empty raw > `none`. `rawStatus` ranges over `{ none, current }`. Behaviour unchanged.
b. **Raw never badges.** `rawStatus` is always `none` (or the raw `<TranscriptPane>` gets no status). The badge column belongs to the derived panes only.

➡️ Recommendation: **(a)**, weakly. It is the current behaviour, and the `current` badge carries one bit — "there is content here to reflow" — that turns on at the same moment the `Reflow` button enables. Dropping it is a defensible tidy, but it is a visible UI change riding along on a refactor, and #43 is scoped as a refactor. If you want the raw pane to stop badging, that is its own small issue.

### Answer to Q11

go for a
