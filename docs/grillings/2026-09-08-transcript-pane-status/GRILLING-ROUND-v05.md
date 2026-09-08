# Grilling round v05 — collapse the pane state machine into a PaneStatus enum

## Settled in v04

- **Q12 — #43's deliverables land in a separate `docs(context)` PR into `develop`, after PR #42 merges.** Not folded into #42. Sequence: #42 merges > #43 docs PR (round files + summary + `CONTEXT.md` bullet + glossary entry) > implementation ticket.
- **Q13 — one implementation ticket, one PR**, covering `useTranscriptStages.ts` + `TranscriptPane.vue` + `App.vue` + `use-transcript-stages.test.ts` + `transcript-pane.test.ts` + `app.test.ts`. Not split. #43's file list is amended to add `use-transcript-stages.test.ts`.

The frontier is empty — every branch of the design tree has been visited. `GRILLING-SUMMARY.md` is written.

## Q14 - Does the summary match your understanding?

Read `GRILLING-SUMMARY.md`. Three things to check in particular:

1. The **"Decided to produce the artefact but never grilled"** section — three assumptions (the `PaneStatus` type lives in `useTranscriptStages.ts`; `canRunLevel1`'s internal expression is the implementer's choice; `app.test.ts` needs only incidental edits). Object to any that are wrong.
2. The **per-pane reachability table** — that `cleaned` never reaches `none`, that `raw` never reaches `stale` or `locked`, and that `reflowed` reaches all four.
3. The **paste-ready block** — it will go into issue #43 under your name, so the wording should be yours.

➡️ Recommendation: confirm, with any corrections to the three points above. Corrections edit `GRILLING-SUMMARY.md` in place and do not open a new round, unless one reopens a real decision.

Once confirmed, the next moves are `to-spec` (write the implementation ticket's spec) or `to-tickets` (open it) — both separate from this grilling.

### Answer to Q14

yes. all confirmed.
