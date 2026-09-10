# Grilling round v04 — copy to clipboard on the reflowed / cleaned pane

## Settled in v03

- **Q6 — Shape:** (b), on separation of concerns. A **`CopyButton.vue` of its own**, placed through a new `actions` slot in `TranscriptPane`'s header. The pane gains a slot and nothing else — no state, no `copyable` prop. `App.vue` writes the button into the reflowed and cleaned panes and simply does not write one into the raw pane. The download button later takes the same slot.
- **Q7 — Failure lifetime:** (c). "Copy failed" **persists until the next copy attempt**, so it cannot be missed. Success keeps `useClipboard`'s 1500 ms auto-reset; the two states deliberately have different lifetimes.
- **Q8 — Look:** (b). A **new small rectangular shape** — transparent, `--color-line` border, ~6 px radius, 11 px, accent border and text on hover/focus, plus the `focus-visible` outline issue #33 established. Rectangle reads as a control against the badge's pill.
- **Q9 — Tests:** (a). **Real happy-dom clipboard for the success path** (click, await, assert `readText()` and the label), **`vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(…)` for the failure path.** No test-only prop on `CopyButton`. Lands in `packages/web/tests/`.

## Reopened

Nothing. Q9 is settled at (a); the permissions note attached to it raises a **new** decision, which is Q10 below rather than a re-ask.

## Q10 - Should the app request clipboard permission up front?

Your note. The short answer is that there is nothing to request, and the reason is worth having on the record. Checked against MDN's Clipboard API security considerations rather than recalled:

- **The Permissions API has no `request()`.** Browsers expose `navigator.permissions.query()` only. A page cannot ask for a permission ahead of time; it can only find out what the current state is.
- **Chromium:** writing needs _either_ the `clipboard-write` permission _or_ transient user activation. A click **is** transient user activation. Chromium grants `clipboard-write` to the focused active tab without prompting anyway.
- **Firefox and Safari:** the `clipboard-read` / `clipboard-write` permission names are **not supported, and not planned**. Writing there requires transient activation and nothing else.

So on every engine, the click on the button is the permission. There is no prompt to pre-empt and no grant to obtain. What is left is a genuine decision about whether to look at the permission state at all:

Options:

a. **No permission code.** The click supplies the activation; a rejection lands in Q7's "Copy failed" state.
b. **Query `clipboard-write` when the button mounts** and pre-disable or warn when the state is `denied`.
c. **Gate on VueUse's `isSupported`** and hide the button where the Clipboard API is absent.

➡️ Recommendation: **(a)**. (b) is worse than doing nothing on two of the three engines: `query({ name: 'clipboard-write' })` rejects with a `TypeError` in Firefox and Safari because the name is not recognised, so the code would need a `try`/`catch` whose catch branch is the normal path for most of your users — and it would still tell you nothing, since those browsers grant on activation. (c) protects against an insecure context, which the v01 premise already established cannot happen here (Netlify is HTTPS, `localhost` counts as secure). Q7's failure state is the whole permission story this app needs, which is a good sign it was the right thing to spend a question on.

### Answer to Q10

(a)

## Q11 - Does `CopyButton` take a `disabled` prop, or derive it from its source?

Q2 settled the rule: enabled whenever the pane holds text, so `current` or `stale`, disabled on `locked` and `none`. For the reflowed and cleaned panes — the only two that get a button — those two empty statuses are **exactly** the case `text === ''`. (`cleanedStatus` returns `locked` precisely when `cleaned === ''`; `reflowedStatus` returns `locked` before level 1 runs, when the pane is empty, and `none` when it was emptied by hand.) The raw pane's `trim()` nuance is irrelevant, because it has no button.

Options:

a. **Derive.** `CopyButton` takes `source` and nothing else; `disabled` is `source === ''`.
b. **A `disabled` prop**, computed in `App.vue` from the pane's status: `:disabled="cleanedStatus === 'locked'"`.

➡️ Recommendation: **(a)**. Two props that must agree are one prop too many, and issue #43's lesson was precisely that a rule split across two files drifts. Under (a) the button cannot disagree with what is on screen: if there is text, you can take it. Under (b) `App.vue` would restate the Q2 rule twice, once per pane, and a future status value would mean editing both call sites. The cost of (a) is that the Q2 rule is implicit in the code and has to live in a comment — which the repo does anyway.

### Answer to Q11

(a)

## Q12 - What is the button's accessible name?

Two panes each get a button whose visible label is "Copy". A screen-reader user tabbing through hears "Copy button", "Copy button" — two identical names in the same view, and nothing says which transcript each takes. `TranscriptPane` already faces this and answers it: the textarea carries `:aria-label="title"` for exactly this reason.

Options:

a. **Visible "Copy", no `aria-label`.** The buttons are distinguished only by reading order.
b. **Visible "Copy", `aria-label` naming the pane** — "Copy reflowed transcript" / "Copy cleaned transcript" — via a prop, following the textarea's precedent.
c. **Put the pane in the visible label**: "Copy reflowed". Costs header width in the tightest row of the UI, on all three panes at once.

➡️ Recommendation: **(b)**. It matches what the component beside it already does, and it costs one prop that has real user-facing meaning (unlike the test-only prop Q9 rejected). One wrinkle to accept knowingly: WCAG 2.5.3 _Label in Name_ wants the accessible name to contain the visible text, and Q5's swap makes the visible text "Copied" / "Copy failed" for a moment while the name stays "Copy reflowed transcript". The resolution is that those words are **status, not name** — which is why Q5 put them in an `aria-live` region as well. The button keeps a stable name; the live region announces what happened.

Recorded as consequences of Q5 + Q6, not asked: each `CopyButton` owns its own live region, and that region is rendered **always** (empty at rest, filled on the swap) rather than created by `v-if` — a live region that appears at the same moment its text does is not reliably announced.

### Answer to Q12

(b)
