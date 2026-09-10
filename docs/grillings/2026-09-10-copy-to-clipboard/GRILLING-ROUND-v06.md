# Grilling round v06 — copy to clipboard on the reflowed / cleaned pane

## Settled in v05

- **Q13 — Summary:** answered by correcting `GRILLING-SUMMARY.md` in place rather than by picking an option. Three corrections landed, and one of them reopens something.

### Corrections applied to the summary

1. **"Surprising in a workspace that advertises zero runtime dependencies" was wrong, and unfair.** `packages/web` already depends on `vue`; the dependency-free package is `packages/rules`, and this change does not touch it. The ADR's "surprising without context" test is now argued on its real ground: a future reader finds a general-purpose toolkit pulled in by a button that needed a 1500 ms timer.
2. **"Would drag & drop and download really be a few lines?" — you are right about the drop, and I was wrong about the download.** Checked in VueUse's source rather than recalled: `useDropZone` keeps a `counter` incremented on `dragenter` and decremented on `dragleave` so the zone only deactivates at zero (the nested-children flicker everyone hits), calls `preventDefault` on `dragover` _and_ `dragenter` (without which the browser navigates away to the dropped file), sets `dataTransfer.dropEffect = 'copy'`, and adds `dataTypes` / `checkValidity` / `multiple` filtering with listener cleanup. That is not a few lines, and it is exactly the "refined over years" case. The download, though, VueUse does **not** cover: there is no download composable, and `useFileDialog` opens a picker for _reading_ a file — a sibling of `useDropZone`, not a way to save one. At most `useObjectUrl` manages the `createObjectURL` / `revokeObjectURL` lifecycle; the `Blob`, the `<a download>` and the click stay hand-written. Naming `useFileDialog` as the download answer was my error, corrected in the summary. **The adoption is justified by the drop first, copy second, and not by the download at all.**
3. **The slot was renamed** from `actions` to `copy-to-clipboard` — which is the one correction that reopens a decision, below.

## Reopened

**The slot's name, narrowed.** Q1 settled that the copy control sits at the far right of the pane header, and its recorded reasoning — repeated in Q6 and in the summary's second paragraph — is that _the download button will later take the same position_. Renaming the slot `copy-to-clipboard` contradicts that: a slot named after one occupant cannot hold the second one without lying. Your edit eliminates the "one anonymous hole for anything" reading, so what is still live is only whether one named-per-action slot or one generic slot is right. Q14 below.

## Q14 - `copy-to-clipboard`, or one generic slot per pane header?

Options:

a. **One generic slot** — `actions`, or `header-actions`. `App.vue` writes `<CopyButton>` into it today and `<CopyButton>` plus `<DownloadButton>` into it later. `TranscriptPane` knows only that its header has a place where controls go; the order is whatever `App.vue` writes.
b. **`copy-to-clipboard` now, a second named slot (`download`) when the download lands.** `TranscriptPane` then knows both actions by name and fixes the order they appear in, and a pane can carry one without the other without `App.vue` deciding anything.
c. **`copy-to-clipboard` now, renamed when the download arrives.**

➡️ Recommendation: **(a)**. A slot is a position in a layout, not a payload — and this one is unusual in that its second occupant is already scheduled by a settled decision, so naming it after the first is known to be wrong on the day it is written. (b) is a real position and not a bad one: it buys a fixed left-to-right order and makes each pane's actions explicit at the call site. Its cost is that `TranscriptPane` starts knowing the names of the actions it hosts, which is a step back toward the component-knows-things state issue #43 spent a grilling clearing out, and every future action means editing the component rather than only `App.vue`. (c) is the one to avoid: renaming later touches `App.vue`, the component and the tests, for no gain over deciding now.

If your answer is (b), say so plainly — I will keep `copy-to-clipboard` and record that the download gets its own slot, and the summary's "the download button will take the same slot" sentence gets rewritten rather than left standing.

Note: the summary's paste-ready section still says `actions`. It will be aligned with whatever this answer is, along with the second paragraph's claim about the download button's position.

### Answer to Q14

OK for (a)
