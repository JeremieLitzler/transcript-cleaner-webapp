# Grilling round v04 — collapse the pane state machine into a PaneStatus enum

## Settled in v03

- **Q10 — proceed.** The collapse goes ahead; a `ready-for-agent` implementation ticket will be opened, blocked by #43.
- **Q11 — the raw pane keeps its badge.** Non-empty raw > `current`, empty raw > `none`; `rawStatus` ranges over `{ none, current }`. Behaviour unchanged; dropping the raw badge, if ever wanted, is a separate issue.

Only two things are left open: where #43's own deliverables land, and the shape of the implementation ticket.

## Q12 - Where do #43's deliverables land?

This grilling is running on `refactor/web-use-transcript-stages`, which is PR #42's branch (open, into `develop`, carrying #40 / #41). #43's deliverables are the `GRILLING-ROUND-*` files, `GRILLING-SUMMARY.md`, and the `CONTEXT.md` decision bullet + glossary entry.

a. **Fold them into PR #42.** The round files and the `CONTEXT.md` edit ride in with the composable extraction; #43 closes when #42 merges.
b. **Separate follow-up PR into `develop` after #42 merges.** #42 stays scoped to #40 / #41; a small `docs(context)` PR carries #43. Sequence: #42 merges > #43 docs PR > implementation ticket.
c. **Split.** Round files + summary fold into #42 (low-risk docs); the `CONTEXT.md` decision waits and lands in the implementation PR, so the glossary entry arrives with the code it describes.

➡️ Recommendation: **(b)**. PR #42 is scoped and presumably already reviewed against #40 / #41; dropping a grilling outcome plus a `CONTEXT.md` design decision into it widens its diff right before merge. A standalone `docs` PR for #43 is small, reviewable on its own terms, and keeps the "one PR, one intent" line this repo already holds (the release source-branch filter, the CI `check`-not-`test` note — the repo documents tight scoping decisions). `CONTEXT.md` records decisions ahead of code routinely here — the scope-grilling entries did exactly that — so (c)'s worry about the glossary landing early is unfounded; only the descriptive "Where things live" row should wait for the code.

### Answer to Q12

go for (b)

## Q13 - Implementation ticket: one slice or split?

Issue #43 names "composable, `TranscriptPane`, `transcript-pane.test.ts`, and `app.test.ts` wiring". `use-transcript-stages.test.ts` is not on that list, but its six-boolean assertions have to move to `*Status` too.

a. **One ticket, one PR.** `useTranscriptStages.ts` + `TranscriptPane.vue` + `App.vue` + `use-transcript-stages.test.ts` + `transcript-pane.test.ts` + `app.test.ts`, with `npm run check` and the goldens green. Label `ready-for-agent`, blocked-by #43.
b. **Split in two.** Composable + its test first (add `PaneStatus`, add the `*Status` computeds, drop the four boolean computeds); `TranscriptPane` + `App.vue` + component tests second.

➡️ Recommendation: **(a)**. The change is atomic — the moment `reflowedLocked` leaves the composable, `App.vue` stops type-checking — so (b) needs either a broken intermediate commit or throwaway shims. It is a contained, behaviour-preserving refactor across three source files and three test files, and `app.test.ts` barely moves, so one PR stays reviewable. The one amendment to #43's text: add `use-transcript-stages.test.ts` to the file list explicitly.

### Answer to Q13

(a)
