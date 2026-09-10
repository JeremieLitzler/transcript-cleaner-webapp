# Grilling round v05 — copy to clipboard on the reflowed / cleaned pane

## Settled in v04

- **Q10 — Permissions:** (a). **No permission code.** The click is the permission on every engine; a rejection lands in Q7's persistent "Copy failed" state.
- **Q11 — Disabled:** (a). `CopyButton` takes `source` and **derives** `disabled` from `source === ''`. No second prop that could disagree with what is on screen.
- **Q12 — Accessible name:** (b). Visible label "Copy", plus an **`aria-label` naming the pane** — "Copy reflowed transcript" / "Copy cleaned transcript" — following the `aria-label` `TranscriptPane` already puts on its textarea. The transient labels are status, not name, which is what the live region is for.

The frontier is empty: every branch this feature opened has been visited. `GRILLING-SUMMARY.md` is written and sits beside this file.

## Q13 - Does the summary match your understanding?

Read `GRILLING-SUMMARY.md`. It has three parts: the prose restatement of what was decided and why it moved from the opening proposal, a flat decision index of all twelve questions (with Q3 marked superseded by Q5), and a paste-ready issue body written in your voice.

Read the **"Decided without being grilled"** section with particular attention — six things had to be settled to produce a coherent artefact and none of them was ever put to you: the `actions` slot name, the exact button strings, the `.btn-pane` class name, the `CopyButton.vue` file location, the two follow-up documents (an ADR for `@vueuse/core`, which needs a `docs/adr/` directory this repo does not have yet, and an amendment to `CONTEXT.md`'s Export line), and the fact that no GitHub issue exists for this work.

➡️ Recommendation: read it and correct it directly. Corrections **edit `GRILLING-SUMMARY.md` in place** and do not open a new round — unless one of them reopens a real decision, in which case say so and it comes back as a numbered question. My expectation is that the flagged items are the ones you will touch, since they are the only content nobody voted on.

Once the summary is right, this session is over. The next moves are separate asks: turning it into a spec, opening the issue (the paste-ready section is written for that), writing the ADR and the `CONTEXT.md` amendment, or implementing it.

### Answer to Q13
