# Grilling summary — copy to clipboard on the reflowed / cleaned pane

Session: `docs/grillings/2026-09-10-copy-to-clipboard/`, rounds v01–v09, eighteen questions. Rounds v01–v06 designed the feature; v07–v09 re-grilled the copy engine after implementing #76 proved a fact behind Q4 false.

## What was decided, and why it moved

The **copy action takes the result of a stage that has run, from the reflowed or the cleaned pane, and it is simple.** The raw pane gets nothing, because the raw transcript is the input you supplied rather than a result the app produced. The download half of the old Q6 stays unbuilt and ungrilled.

The button sits **in the pane header, at the far right, after the status badge** — the header being the pane's strip of furniture, and the badge being a readout rather than a control. That position is also where the download button goes when its turn comes — which is why the slot it sits in is called `actions` rather than named after the copy (Q14). It is the one piece of future-proofing the session deliberately kept.

It is **enabled whenever the pane holds text**, which includes a `stale` pane. That follows Q13b: stale text is left on screen precisely because it is the only copy you have until you choose to re-run, so refusing to let you take it would make keeping it pointless. Since the reflowed and cleaned panes are empty in exactly the statuses that would disable the button, `CopyButton` derives that from its `source` rather than taking a second prop that could disagree with what is on screen.

The largest change is the library, and it moved twice. You asked whether to hand-roll the failure handling or use VueUse, and in v02 **`@vueuse/core` was adopted as the web app's browser-API toolkit** (Q4), on the expectation that it also answers Q25's `.txt` drop when that lands. It becomes `packages/web`'s second runtime dependency, after `vue`. The copy button was to use `useClipboard`, on the belief that its `copy()` rejects on failure, leaves `copied` at `false`, and supplies the 1500 ms success reset.

**That belief was false, and implementing #76 is what showed it.** Read in `@vueuse/core` 14.4.0's shipped source and run under happy-dom, `copy()` writes with `navigator.clipboard.write([ClipboardItem])` rather than `writeText`, and queries the `clipboard-write` permission first. On any write failure it swallows the error, falls back to `document.execCommand('copy')` whatever its `legacy` option says, ignores that call's return value, and sets `copied = true`. In a real browser, a refused copy would therefore read "Copied" and never reject: the one lie Q7 exists to prevent. It would also ship the `execCommand` fallback the v01 premise ruled out. So the button **calls `navigator.clipboard.writeText` itself** inside a `try`/`catch`, and takes **only `useTimeoutFn`** from VueUse for the "Copied" reset (Q15). That timer is the part of the library that is sound: a second `start()` clears the running timer first, so a second copy restarts the full 1500 ms, and it stops itself when the button unmounts. The toolkit decision itself did not change.

The ADR followed. `docs/adr/0001-vueuse-as-browser-api-toolkit.md` was **corrected in place** rather than superseded (Q16). You first chose to supersede it, as your ADR template's immutability rule asks, then reversed that: nothing had been built on the false claim, and a second record for an unchanged decision, created only because the facts were missed, is not worth keeping. The in-place correction is a **one-off exception**, stated in the ADR itself, and sets no precedent.

Where the library earns its place, and where it does not:

- **Copy** is the weakest case, weaker than first thought. The write, its failure state and the permission story are all the app's own. VueUse supplies the confirmation timer, its restart and its cleanup, and nothing else; `useClipboard` itself is the wrong tool here.
- **Drag & drop is the strongest case.** The naive version is not a few lines: `preventDefault` is required on `dragover` *and* `dragenter` or the browser navigates away to the dropped file; `dragenter` / `dragleave` fire once per child element, so a naive "is hovering" flag flickers over any nested markup. `useDropZone`'s source carries exactly the fixes that keep costing people an afternoon — a `counter` incremented on enter and decremented on leave so the zone only deactivates at zero, `preventDefault` on both events, `dataTransfer.dropEffect = 'copy'`, plus `dataTypes` / `checkValidity` / `multiple` filtering and listener cleanup. That is the "refined over years" argument, and it holds here — but, after `useClipboard`, it is to be re-read in the installed version's source when the drop is built, not taken from this summary.
- **Download is the case the library does not cover.** VueUse has no download composable. `useFileDialog` opens a file *picker* — it is an alternative entry point for reading a file, a sibling of `useDropZone`, not a way to save one. The most it offers is `useObjectUrl`, which manages the `createObjectURL` / `revokeObjectURL` lifecycle; the `Blob`, the `<a download>` and the click stay hand-written, and there they genuinely are a handful of lines.

So the adoption is justified by drop first, copy's timer second, and not by download at all.

Feedback is **the button's own label swapping** — "Copied", or "Copy failed" — with a visually-hidden `aria-live="polite"` region carrying the same words, always rendered so it can announce. No toast, and the status badge is never touched: it is the pane's state under a precedence issue #43 spent a whole grilling moving into one place, and a copy is not a pane state. The two states have **different lifetimes on purpose**: success auto-resets after 1500 ms, failure persists until the next attempt, because a successful copy is self-verifying the moment you paste and a failed one is silent everywhere else.

Your permissions question turned out to have a factual answer rather than a design one. The Permissions API exposes only `query()` — no browser lets a page request a permission in advance. Chromium accepts either the `clipboard-write` permission or transient user activation, and grants the permission to the focused active tab anyway; Firefox and Safari do not implement those permission names at all and never will, requiring activation instead. **On every engine the click is the permission.** Querying it would mean a `try`/`catch` whose catch branch is the normal path for most of your users, so the app carries no permission code and the "Copy failed" state is the whole story. `useClipboard` would have put a permission query back behind the app's back, which is one more reason Q15 set it aside.

Testing exercises what ships: happy-dom implements `navigator.clipboard`, and its `Permissions.query()` returns `granted` for every permission name, so the real `writeText` path resolves in `packages/web/tests/` and `readText()` reads the text back. The failure path cannot be reached by accident under those defaults, so it is reached on purpose with `vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(…)` — no seam in the production interface, which is why Q9 rejected injecting a fake navigator through a test-only prop. `useClipboard` would have broken this too: happy-dom has no `document.execCommand`, so its fallback throws there and `copy()` rejects, a failure no real browser produces. The tests would have passed on behaviour that does not ship.

Delivery follows from the engine (Q17). #74 had been split into #76 (the happy path) and #77 ("Copy failed") while the engine was still `useClipboard`, which swallowed rejections and so let #76 ship alone. `writeText` rejects, so #76 alone would leave either an unhandled rejection or a silent failure on `develop`. The two tickets stay, and **land together as two commits**, #76 then #77, with nothing reaching `develop` between them.

Two smaller things. The button is a **rectangle**, not a pill: shape is the cheapest way to say "control" next to a badge that says "readout". And it carries an **`aria-label` naming its pane** — "Copy reflowed transcript" — following the precedent `TranscriptPane` already set on its textarea, so a screen-reader user does not meet two buttons called "Copy". The transient labels are treated as status, not name, which is exactly why they go to the live region as well.

## Decision index

- **Premise** — v01, confirmed in v02 — Two panes only: reflowed and cleaned. The raw pane gets no button.
- **Premise** — v01, confirmed in v02 — Copy only. The `.txt` download is not in this piece of work.
- **Premise** — v01, confirmed in v02 — `navigator.clipboard.writeText`, no legacy `document.execCommand` fallback.
- **Premise** — v01, confirmed in v02 — The project's word stays **pane**, not "panel".
- **Q1** — v01 — The control sits in the pane header, at the far right, after the badge; `ml-auto` moves onto whatever opens the right-hand group.
- **Q2** — v01 — Enabled whenever the pane holds text, so `current` **and** `stale`; disabled on `locked` and `none`.
- **Q3** — v01 — Superseded (see below).
- **Q4** — v02 — Adopt `@vueuse/core` as the web app's browser-API toolkit; it is the second runtime dependency after `vue`. Its "starting with `useClipboard`" half is superseded by Q15.
- **Q5** — v02 — The button's own label swaps to "Copied" / "Copy failed", with a visually-hidden `aria-live="polite"` region carrying the same words.
- **Q6** — v03 — A `CopyButton.vue` of its own, placed through a new `actions` slot in `TranscriptPane`'s header; the pane gains a slot and no state.
- **Q7** — v03 — "Copy failed" persists until the next copy attempt; success keeps the 1500 ms auto-reset.
- **Q8** — v03 — A new small rectangular button shape: transparent, `--color-line` border, ~6 px radius, 11 px, accent on hover/focus, with the issue #33 `focus-visible` outline.
- **Q9** — v03 — Real happy-dom clipboard for the success path; `vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(…)` for the failure path; no test-only prop.
- **Q10** — v04 — No permission code at all. The click is the permission; a rejection lands in Q7's failure state.
- **Q11** — v04 — `CopyButton` takes `source` and derives `disabled` from `source === ''`; no `disabled` prop.
- **Q12** — v04 — Visible label "Copy", `aria-label` naming the pane ("Copy reflowed transcript" / "Copy cleaned transcript").
- **Q13** — v05 — This summary was corrected in place rather than answered by option: the "zero runtime dependencies" claim was withdrawn as inaccurate, the drag-&-drop effort estimate was corrected in VueUse's favour, and `useFileDialog` was withdrawn as the download answer.
- **Q14** — v06 — **One generic slot**, `actions`, in `TranscriptPane`'s header. Not named after its occupant: the download button is already scheduled to sit in it, so a per-action name would be wrong the day it was written.
- **Q15** — v07 — `CopyButton` calls `navigator.clipboard.writeText` itself inside a `try`/`catch`; `useClipboard` is not used. VueUse's `useTimeoutFn` drives the 1500 ms "Copied" reset. No permission query, no `execCommand`.
- **Q16** — v07, reversed after v08 — ADR-0001 is **corrected in place**, as a one-off exception to the ADR template's immutability rule, stated in the ADR itself. No ADR-0002.
- **Q17** — v08 — #76 and #77 stay two tickets and land together: two commits, #76 then #77, nothing reaching `develop` between them.
- **Q18** — v09 — This summary's confirmation.

Superseded: **Q3** (v01, the feedback channel) was superseded by **Q5** (v02), re-asked after the answer to Q3 was itself a question — which also produced **Q4**. **Q14** (v06) reopened the slot's name, narrowly, after a correction to this summary renamed it `copy-to-clipboard`; the generic name was kept. **Q15** (v07) superseded Q4's `useClipboard` half after the fact behind it proved false; Q4's toolkit decision stands. **Q16** was answered (a), supersede with an ADR-0002, in v07; you reversed it to (b), correct in place, after v08, and ADR-0002 was deleted before it was ever committed.

## Decided without being grilled

Flagged so you can object before any of it lands:

- **The exact strings** are "Copy" / "Copied" / "Copy failed". Implied by Q5, never chosen.
- **The new CSS shape needs a class name** — `.btn-pane` is the obvious one, alongside `.btn`, `.btn-ghost`, `.chip` and `.badge` in `style.css`.
- **The file is `packages/web/src/components/CopyButton.vue`**, next to `TranscriptPane.vue` and `RulesDrawer.vue`. It already exists in the uncommitted #76 work.
- **`useTimeoutFn` is imported from `@vueuse/core`**, which re-exports it, rather than from `@vueuse/shared`. The web package then declares one VueUse dependency, not two.
- **What #76's `catch` does in its own commit.** Under Q17 it never reaches `develop` alone, so the #76 commit leaves the rejection caught and the label at "Copy", and #77's commit fills in "Copy failed".
- **ADR-0001's correction** (done in v08, kept by Q16's reversal):
  - The copy engine gets **no ADR of its own**, since one component is not hard to reverse; it is the ADR's first _Consequence_ instead.
  - A consequence was added: **a composable's behaviour is read in the installed version's source, not in its docs**, and the same check applies to `useDropZone` when the drop lands.
  - The correction note sits last under _Consequences_, dated 2026-09-10.
- **`CONTEXT.md`'s _Export_ line** now says the button "takes only its timer" from VueUse, and still points at ADR-0001.
- **The issues:** #74 is closed; #76 and #77 are open and still state the `useClipboard` fact. The paste-ready section below replaces those passages; I have not edited either issue.

## Paste-ready — for #76 and #77

### #76 — replace the last sentence of the second paragraph of _What to build_

> `@vueuse/core` arrives with this ticket as the web package's browser-API toolkit, per ADR-0001, and its `useTimeoutFn` drives the 1500 ms reset of "Copied". The write itself is `navigator.clipboard.writeText`, called by the component: `useClipboard` is deliberately not used, because on a refused write it falls back to `execCommand` and reports "Copied" anyway (ADR-0001, corrected).

### #76 — replace the third paragraph of _What to build_

> Refused copies are #77's concern, and #77 lands with this ticket: two commits, this one first, and nothing reaching `develop` between them. This ticket only has to leave room for it: the write already sits in a `try`/`catch`, and the button's minimum width already fits "Copy failed".

### #76 — replace the `@vueuse/core` acceptance criterion

> - [ ] `@vueuse/core` is a runtime dependency of the web package, and its `useTimeoutFn` provides the 1500 ms reset. The write is `navigator.clipboard.writeText` inside a `try`/`catch`; `useClipboard` is not used. There is no permission code, no legacy `execCommand` fallback and no `isSupported` gating.

### #77 — replace the second paragraph of _What to build_

> The failure state is the app's own. The component's `try`/`catch` around `navigator.clipboard.writeText` sets it, next to the success state. `useClipboard` is not used: it swallows a refused write into an `execCommand` fallback and reports "Copied", so no failure would ever reach the app (ADR-0001, corrected). The feedback channel stays the one #76 built — the button's label and its live region. No toast, and the status badge is never touched, because a copy is not a pane state.

### #77 — add under _Blocked by_

> Lands together with #76, as the second of two commits. Nothing reaches `develop` between them.
