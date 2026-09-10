# Grilling summary — copy to clipboard on the reflowed / cleaned pane

Session: `docs/grillings/2026-09-10-copy-to-clipboard/`, rounds v01–v06, fourteen questions.

## What was decided, and why it moved

The **copy action takes the result of a stage that has run, from the reflowed or the cleaned pane, and it is simple.** The raw pane gets nothing, because the raw transcript is the input you supplied rather than a result the app produced. The download half of the old Q6 stays unbuilt and ungrilled.

The button sits **in the pane header, at the far right, after the status badge** — the header being the pane's strip of furniture, and the badge being a readout rather than a control. That position is also where the download button goes when its turn comes — which is why the slot it sits in is called `actions` rather than named after the copy (Q14). It is the one piece of future-proofing the session deliberately kept.

It is **enabled whenever the pane holds text**, which includes a `stale` pane. That follows Q13b: stale text is left on screen precisely because it is the only copy you have until you choose to re-run, so refusing to let you take it would make keeping it pointless. Since the reflowed and cleaned panes are empty in exactly the statuses that would disable the button, `CopyButton` derives that from its `source` rather than taking a second prop that could disagree with what is on screen.

The largest change is the library. You asked whether to hand-roll the failure handling or use VueUse, and the investigation settled this: **`useClipboard` does not solve the failure path** — `copy()` returns `Promise<void>`, rejects, and exposes no error state, so the `try`/`catch` is the app's either way. What it does supply is the `copied` flag and its 1500 ms auto-reset, timer cleanup included. The decision was taken on a wider ground than this button: **`@vueuse/core` is adopted as the web app's browser-API toolkit**, on the expectation that it also answers Q25's `.txt` drop and part of Q6's download when those land. It becomes `packages/web`'s second runtime dependency, after `vue`. That is the one decision here worth an ADR.

That expectation was challenged after the fact — "would drag & drop and download really be a few lines?" — and the honest answer is that the three features are **not** alike, so it is worth recording where the library earns its place and where it does not:

- **Copy** is the weakest case. Hand-written, it is `await navigator.clipboard.writeText(text)`, a ref, a `setTimeout` and a `catch`. `useClipboard` buys the timer and its cleanup, and nothing else — the rejection handling stays ours either way.
- **Drag & drop is the strongest case, and the challenge is right.** The naive version is not a few lines: `preventDefault` is required on `dragover` *and* `dragenter` or the browser navigates away to the dropped file; `dragenter` / `dragleave` fire once per child element, so a naive "is hovering" flag flickers over any nested markup. `useDropZone`'s source carries exactly the fixes that keeps costing people an afternoon — a `counter` incremented on enter and decremented on leave so the zone only deactivates at zero, `preventDefault` on both events, `dataTransfer.dropEffect = 'copy'`, plus `dataTypes` / `checkValidity` / `multiple` filtering and listener cleanup. That is the "refined over years" argument, and it holds here.
- **Download is the case the library does not cover.** VueUse has no download composable. `useFileDialog` opens a file *picker* — it is an alternative entry point for reading a file, a sibling of `useDropZone`, not a way to save one. The most it offers is `useObjectUrl`, which manages the `createObjectURL` / `revokeObjectURL` lifecycle; the `Blob`, the `<a download>` and the click stay hand-written, and there they genuinely are a handful of lines. (An earlier draft of this summary named `useFileDialog` as the download answer. That was wrong, and it is corrected here.)

So the adoption is justified by drop first, copy second, and not by download at all.

Feedback is **the button's own label swapping** — "Copied", or "Copy failed" — with a visually-hidden `aria-live="polite"` region carrying the same words, always rendered so it can announce. No toast, and the status badge is never touched: it is the pane's state under a precedence issue #43 spent a whole grilling moving into one place, and a copy is not a pane state. The two states have **different lifetimes on purpose**: success auto-resets after 1500 ms, failure persists until the next attempt, because a successful copy is self-verifying the moment you paste and a failed one is silent everywhere else.

Your permissions question turned out to have a factual answer rather than a design one. The Permissions API exposes only `query()` — no browser lets a page request a permission in advance. Chromium accepts either the `clipboard-write` permission or transient user activation, and grants the permission to the focused active tab anyway; Firefox and Safari do not implement those permission names at all and never will, requiring activation instead. **On every engine the click is the permission.** Querying it would mean a `try`/`catch` whose catch branch is the normal path for most of your users, so the app carries no permission code and the "Copy failed" state is the whole story.

Testing exercises what ships: happy-dom implements `navigator.clipboard`, and its `Permissions.query()` returns `granted` for every permission name, so the real `writeText` path resolves in `packages/web/tests/` and `readText()` reads the text back. The failure path cannot be reached by accident under those defaults, so it is reached on purpose with `vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(…)` — no seam in the production interface, which is why Q9 rejected injecting a fake navigator through a test-only prop.

Two smaller things. The button is a **rectangle**, not a pill: shape is the cheapest way to say "control" next to a badge that says "readout". And it carries an **`aria-label` naming its pane** — "Copy reflowed transcript" — following the precedent `TranscriptPane` already set on its textarea, so a screen-reader user does not meet two buttons called "Copy". The transient labels are treated as status, not name, which is exactly why they go to the live region as well.

## Decision index

- **Premise** — v01, confirmed in v02 — Two panes only: reflowed and cleaned. The raw pane gets no button.
- **Premise** — v01, confirmed in v02 — Copy only. The `.txt` download is not in this piece of work.
- **Premise** — v01, confirmed in v02 — `navigator.clipboard.writeText`, no legacy `document.execCommand` fallback.
- **Premise** — v01, confirmed in v02 — The project's word stays **pane**, not "panel".
- **Q1** — v01 — The control sits in the pane header, at the far right, after the badge; `ml-auto` moves onto whatever opens the right-hand group.
- **Q2** — v01 — Enabled whenever the pane holds text, so `current` **and** `stale`; disabled on `locked` and `none`.
- **Q3** — v01 — Superseded (see below).
- **Q4** — v02 — Adopt `@vueuse/core` as the web app's browser-API toolkit, starting with `useClipboard`; it is the second runtime dependency after `vue`.
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

Superseded: **Q3** (v01, the feedback channel) was superseded by **Q5** (v02), re-asked after the answer to Q3 was itself a question — which also produced **Q4**. **Q14** (v06) reopened the slot's name, narrowly, after a correction to this summary renamed it `copy-to-clipboard`; the generic name was kept. Nothing else was reopened.

## Decided without being grilled

Flagged so you can object before any of it exists:

- **The exact strings** are "Copy" / "Copied" / "Copy failed". Implied by Q5, never chosen.
- **The new CSS shape needs a class name** — `.btn-pane` is the obvious one, alongside `.btn`, `.btn-ghost`, `.chip` and `.badge` in `style.css`.
- **The file is `packages/web/src/components/CopyButton.vue`**, next to `TranscriptPane.vue` and `RulesDrawer.vue`.
- **Two documents should follow this session**, neither of them written yet: an **ADR for adopting `@vueuse/core`** (it passes all three tests — hard to reverse once the drop and the download sit on top of it, surprising to a future reader who finds a general-purpose toolkit pulled in by a button that needed a 1500 ms timer, and the result of a real trade-off. It is **not** surprising as a breach of a zero-dependency rule: `packages/web` already depends on `vue`, and it is `packages/rules` that is dependency-free — which this change does not touch), which needs a `docs/adr/` directory that does not exist yet; and an amendment to **`CONTEXT.md`**'s "Export — Copy to clipboard and download `.txt` _(Q6)_" line, recording the copy half as settled and the download half as still open.
- **There is no GitHub issue for this work.** Open issues are #5, #6, #8, #9.

## Paste-ready — for the issue

> **Copy to clipboard on the reflowed and cleaned panes**
>
> Grilled in `docs/grillings/2026-09-10-copy-to-clipboard/` (rounds v01–v04). This is the copy half of Q6; the `.txt` download stays open.
>
> **What to build**
>
> A `CopyButton.vue` in `packages/web/src/components/`, placed through a new `actions` slot in `TranscriptPane`'s header — far right, after the status badge. `App.vue` writes one into the reflowed pane and one into the cleaned pane. The raw pane gets none: copy takes a result, and the raw transcript is the input.
>
> - It takes `source` (the pane's text) and a label for its accessible name. `disabled` is derived from `source === ''`, not passed in — which means a **stale** pane is copyable, per Q13b: that text is the only copy the user has until they re-run.
> - It uses `useClipboard` from `@vueuse/core`, which this change adds as a dependency. That is a deliberate adoption, not a one-off: `useDropZone` is the intended answer for the Q25 `.txt` drop, where the library earns most of its keep (nested `dragenter`/`dragleave` counting, `preventDefault` on both drag events, `dropEffect`, type filtering). The Q6 download is **not** covered by it — VueUse has no download composable, and `useFileDialog` opens a picker for *reading* files, not saving them. An ADR goes in with the dependency.
> - The button's label swaps to **"Copied"** on success (auto-resetting after 1500 ms, which is `useClipboard`'s `copiedDuring` default) and to **"Copy failed"** on rejection, which **persists until the next attempt** — a failure is silent everywhere else in the UI, so it must not time out. The same words go to a visually-hidden `aria-live="polite"` region that is always rendered, never `v-if`-ed into existence.
> - The status badge is not touched. It is the pane's state, and a copy is not a pane state.
> - No permission code. `navigator.permissions` has no `request()`; Chromium accepts the click as transient activation, and Firefox and Safari do not implement the `clipboard-write` permission name at all. The click is the permission.
> - Visually: a new small rectangular shape in `style.css` (transparent, `--color-line` border, ~6 px radius, 11 px, accent border and text on hover/focus, plus the issue #33 `focus-visible` outline). Rectangular so it does not read as a second badge, with a `min-width` wide enough for "Copy failed" so the header does not jitter.
> - Accessible name is `Copy reflowed transcript` / `Copy cleaned transcript`, following the `aria-label` `TranscriptPane` already puts on its textarea.
>
> **Tests** — `packages/web/tests/`. Success uses happy-dom's real clipboard (it implements `navigator.clipboard`, and its `Permissions.query()` returns `granted` for everything): click, await, assert `readText()` and the label. Failure uses `vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(…)`. No test-only prop on the component. Also assert the disabled state on an empty pane and the enabled state on a stale one.
