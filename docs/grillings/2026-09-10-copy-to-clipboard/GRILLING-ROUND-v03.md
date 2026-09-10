# Grilling round v03 — copy to clipboard on the reflowed / cleaned pane

## Settled in v02

- **Q4 — Library:** (b). **`@vueuse/core` is adopted as the web app's browser-API toolkit**, not just borrowed for one button. `useClipboard` here; `useDropZone` / `useFileDialog` are the expected answers for Q25's `.txt` drop and Q6's download when those land. It becomes `packages/web`'s second runtime dependency after `vue`. Rejection handling is still ours — the library does not cover it.
- **Q5 — Feedback:** (a). **The button's own label swaps**: "Copied" on success, "Copy failed" on rejection, with a visually-hidden `aria-live="polite"` region carrying the same words. No toast, and the status badge is not touched. `useClipboard`'s `copied` + `copiedDuring: 1500` supplies the success half directly.

Two consequences I am recording rather than asking, because Q5(a) forces them:

- **The button is a text button, not an icon.** A label that swaps to "Copied" / "Copy failed" has to be a label. The project also ships no icon set today. ✅
- **It needs a `min-width`** at least as wide as "Copy failed", so the header does not jitter mid-swap. ✅

## Q6 - Where does the copy state live?

`TranscriptPane` currently derives no state at all — its own header comment says so, and `CONTEXT.md` records it as the outcome of issue #43: "`TranscriptPane` renders it and derives no state of its own." A copy button carries transient state (`copied`, and the failure flag from Q7). Somewhere has to hold it. Also relevant: only two of the three panes get a button, so something has to know which.

Options:

a. **Inside `TranscriptPane`.** It calls `useClipboard` itself and takes a `copyable` boolean prop so the raw pane renders no button.
b. **A `CopyButton.vue` of its own, placed through a new `actions` slot in the pane header.** `TranscriptPane` gains a slot and nothing else — still no state, no new prop. `App.vue` puts `<CopyButton :source="reflowed" :disabled="…" />` in the reflowed and cleaned panes and simply omits it from the raw one.
c. **In `App.vue`**, which owns the state and passes label and handler down as props.

➡️ Recommendation: **(b)**. It is the only option that leaves issue #43's outcome intact: the pane stays a renderer, and "which panes have a button" is expressed by _where the button is written_ rather than by a boolean somebody has to look up. It also front-loads Q1's other half — the download button lands in the same slot later with no rearranging — and it gives the copy behaviour a component small enough to test on its own. (a) puts state back into the component a whole grilling was spent emptying, and adds a prop that (b) does not need. (c) spreads one button's transient state across two files.

### Answer to Q6

(b), because that follow the principle of separation of concerns

## Q7 - How long does the failure state last?

`useClipboard` resets `copied` after 1500 ms. The failure state is ours to define, and it is not obviously the same shape: a successful copy is self-verifying — you paste and the text is there — whereas a failure is silent everywhere else in the UI.

Options:

a. **Same 1500 ms auto-reset** as success. One lifetime, one mental model.
b. **A longer auto-reset**, ~4 s, on the grounds that a failure needs longer to be noticed than a confirmation does.
c. **Persists until the next copy attempt** (or until the pane's text changes). It clears when you act, not on a timer.

➡️ Recommendation: **(c)**. A message you can miss is the same as no message, and 1500 ms is easy to miss if you clicked and looked away — which is exactly what people do with a copy button, because they expect it to work. (c) also needs no second timer: the state clears where the next `copy()` sets it. The cost is a "Copy failed" label that can sit in the header indefinitely, which is the honest state of affairs — the clipboard really does not have your text.

### Answer to Q7

(c) so the user doesn't miss it.

## Q8 - What does the button look like in the pane header?

The header is a tight row at 12–11 px: `[title 12px] [sub 11px] ······ [badge 11px pill]`. The project's existing shapes are `.btn` (filled accent, toolbar-sized), `.btn-ghost`, `.chip` (999px pill, bordered, 12.5 px) and `.badge` (999px pill, 11 px).

Options:

a. **Reuse `.chip`, shrunk.** No new CSS — but it puts a bordered pill immediately next to a bordered pill, and the badge is a readout while this is a control. Two pills, two meanings.
b. **A new small shape, rectangular:** transparent background, `--color-line` border, ~6 px radius, 11 px, accent border and text on hover/focus. Distinguished from the badge by shape rather than by colour.
c. **Borderless accent text**, like the "from Vibe" link in the raw pane's subtitle.

➡️ Recommendation: **(b)**. Shape is the cheapest signal available here: pill = something the app is telling you, rectangle = something you can press. (a) saves a few lines of CSS and spends them on ambiguity in the busiest 200 px of the UI. (c) is the lightest and reads as a link, which matters because the one link already in a pane header navigates away — two things that look alike and behave differently. Whichever you pick, it needs the same `focus-visible` outline the existing link carries (issue #33).

### Answer to Q8

(b)

## Q9 - How is it tested?

Facts, checked in happy-dom's source rather than assumed:

- happy-dom **does** implement `navigator.clipboard`, and `Clipboard.writeText()` queries `navigator.permissions` for `clipboard-write`, throwing only when the state is `denied`.
- happy-dom's `Permissions.query()` returns `'granted'` for **every** valid permission name — there is no per-permission default map.

So under `packages/web`'s existing happy-dom setup, the real `writeText` path resolves, and `readText()` reads back what was written. The failure path, by the same fact, cannot be reached without making it fail on purpose.

Options:

a. **Exercise the real clipboard for success, spy for failure.** Success: click, await, assert `navigator.clipboard.readText()` returns the pane's text and the label reads "Copied". Failure: `vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(…)`, assert "Copy failed". No test-only API on the component.
b. **Inject a fake navigator** through `useClipboard`'s `navigator` option for both paths — which means `CopyButton` takes a prop that exists only for tests.
c. **Assert neither.** Test only that the button is enabled/disabled per Q2 and that clicking it calls `copy`.

➡️ Recommendation: **(a)**. It tests the behaviour you actually ship on the success path, and reaches the failure path without putting a seam in the production interface — (b)'s prop would be the only member of `CopyButton`'s API with no user-facing meaning. (c) leaves the two states Q5 and Q7 just spent a round defining completely unverified. This lands in `packages/web/tests/` alongside the existing component suite, per `CONTEXT.md`'s _Verification_ entry.

### Answer to Q9

(a)

Note: about browser permissions, should that not be explicitly requested from the user to avoid failure?
