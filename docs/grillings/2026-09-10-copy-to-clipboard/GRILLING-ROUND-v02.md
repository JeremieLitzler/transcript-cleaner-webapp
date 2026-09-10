# Grilling round v02 — copy to clipboard on the reflowed / cleaned pane

## Settled in v01

- **The premise** — all four ticked: two panes only (reflowed and cleaned, never raw), copy only (no `.txt` download in this piece of work), `navigator.clipboard.writeText` with no legacy `execCommand` fallback, and "pane" stays the project's word over "panel".
- **Q1 — Placement:** (a). The control sits **in the pane header, at the far right, after the badge**. `ml-auto` moves off the badge onto whatever opens the right-hand group, and that is the slot a download button would later take.
- **Q2 — Stale panes:** (a). The control is **enabled whenever the pane holds text**, so `current` _and_ `stale`. Empty (`locked`, `none`) disables it. Q13b's reasoning carries: the stale text is the only copy you have, so you must be able to take it.

## Reopened

**Q3 — the feedback channel — is not settled.** Your answer was itself a question, so it opens a new one (Q4 below) and Q3's own decision comes back as Q5 with its own answer slot. Answering Q4 alone would leave the app with no decision about what the user sees.

## Q4 - VueUse's `useClipboard`, or ~15 hand-written lines?

You are right that VueUse has this: `useClipboard` from `@vueuse/core`. Here is what it actually is, checked rather than remembered.

**What it gives you** (`@vueuse/core@14.4.0`, peer `vue ^3.5.0` — this repo is on `vue ^3.5.22`, so it fits):

- `copy(text?)` > `Promise<void>`
- `copied` — a readonly boolean that goes `true` on success and **resets itself after `copiedDuring` ms, default 1500**. That is precisely the ~1.5 s swap Q3 option (a) described.
- `copyPending`, `isSupported`, `text` (clipboard reads, off by default)
- options: `source`, `read`, `copiedDuring`, `legacy` (the `execCommand` fallback, off by default — the v01 premise already said no), `navigator` (injectable, which is the testing seam)

**The finding that matters:** `useClipboard` exposes **no error state**. `copy()` returns `Promise<void>` and rejects; `copied` just stays `false`. So the failure half of the feedback — the "Copy failed" that Q5 is about — is a `try`/`catch` you write yourself either way. The library buys you the success half.

**Cost, measured:** `@vueuse/core` would be the web app's **second** runtime dependency — today `packages/web` depends on `vue` and the workspace `@transcript-cleaner/rules`, and `packages/rules` advertises "no runtime dependencies" in its own manifest. It pulls three transitive packages (`@vueuse/shared`, `@vueuse/metadata`, `@types/web-bluetooth`), is tree-shaken by Vite so only the composables you import ship, and adds a weekly Dependabot stream on a package currently at major 14.

**The wider fact:** this is not really a one-button decision. Two features from the same family are still unbuilt — Q25's `.txt` drop (`useDropZone`, `useFileDialog`) and Q6's download. If VueUse goes in, it goes in for those too, and the cost is paid once.

Options:

a. **Hand-write it.** A small function: `await navigator.clipboard.writeText(text)`, a `copied` ref, a `setTimeout` reset, a `catch` for the failure state.

- **Pros:** no new dependency; the whole behaviour is visible in one file; the success and failure states are one shape written in one place; nothing to keep up to date.
- **Cons:** you own the timer — clearing it on unmount, and restarting it when a second copy lands before the first expires. That is exactly the small bug this kind of code always has. Anything you later want (`isSupported`, clipboard reads) you write.
  b. **Adopt `@vueuse/core` as the app's browser-API toolkit**, starting with `useClipboard` here and using it for the Q25 drop and the Q6 download when those land.
- **Pros:** the timer, its cleanup and the auto-reset are proven code; `copiedDuring` is the state machine Q3(a) wanted, for free; the injectable `navigator` is a clean test seam; the same dependency then serves drop and download instead of three hand-rolled solutions.
- **Cons:** a real dependency and its update stream, adopted on the strength of features that do not exist yet; it does **not** solve the failure path, which is the part you asked about.
  c. **Adopt VueUse for this button only**, deciding nothing about drop or download.
- Pays the dependency cost without the argument that justifies it.

➡️ Recommendation: **(b)** — but for the reason that survives scrutiny, not the one that prompted the question. It is _not_ true that the library saves you from "all the issues that can come up": rejection handling stays yours. What it does buy is the timer and its cleanup, and — the deciding half — one answer for three features instead of three. If your honest expectation is that the drop and the download will also be hand-written when their turn comes, then (b) loses its argument and **(a)** is the right answer: fifteen lines and no dependency beat a library used once. Answer with which of those two futures is the real one.

### Answer to Q4

(b)

## Q5 - How do you know it worked — and, on the same channel, that it did not?

Re-asked from v01's Q3. Unchanged by Q4: every option below works with either a hand-written function or `useClipboard`.

A clipboard write is invisible, and `writeText` can reject. This is one decision because whatever confirms success is what reports failure.

Options:

a. **The button's own label swaps** — to "Copied" for ~1.5s, or to "Copy failed" on rejection — with a visually-hidden `aria-live="polite"` region carrying the same words for screen readers. No new component; the button needs a `min-w` so the header does not jitter as the label changes width.
b. **A toast** in a corner with `role="status"`. One announcement channel, reusable later — and a new component, a stacking context and a dismissal policy.
c. **The status badge swaps** to "copied" for a moment, then reverts.
d. **Nothing at all.** The paste will tell you.

➡️ Recommendation: **(a)**. (c) is the cheap one and it is the one to avoid: the badge is the pane's _state_, under a precedence issue #43 spent a whole grilling moving into exactly one place, and a copy is not a pane state — overloading it puts a second writer on that value. (b) is right for an app with many transient messages; this app has one, and the toast would be the larger half of the work. (d) fails silently on rejection, which is the only case where feedback actually matters. Note that if Q4 lands on (b), `copied` + `copiedDuring: 1500` _is_ this option, already written.

### Answer to Q5

(a)
