# Grilling round v01 — copy to clipboard on the reflowed / cleaned pane

## The premise

Rewritten after your correction. The premise, in your words: **a copy-to-clipboard action on the reflowed or cleaned pane, once the stage has run, that copies that result. It is simple and should not be overthought.**

What that fixes before any question is asked:

- **Two panes, not three.** The raw pane gets nothing. Copy is for a _result_, and the raw transcript is the input you supplied. ✅
- **Copy only.** The `.txt` download is not part of this piece of work. I am recording that as an assumption rather than asking, because you did not raise it — say so if you want it in the same change. ✅
- **`navigator.clipboard.writeText`, no legacy fallback.** Both contexts this app runs in are secure (Netlify serves HTTPS; `localhost` counts as secure for the Vite dev server), so the API is present. A `document.execCommand('copy')` path would be deprecated code that no browser you support and no test you write ever exercises. It can still _reject_ at runtime — denied permission, an unfocused document — and Q3 below is where that lands. ✅

One terminology note, since `domain-modeling` is running with this session: you wrote "panel", and the project's word is **pane** — `PaneStatus`, `TranscriptPane`, "the reflowed pane" in `CONTEXT.md`. I have used "pane" throughout. Nothing hangs on it; flag it if you would rather the glossary said "panel". ✅

## What the record already says

You said we have never talked about this, and that is right about the _action_. What exists is one line of scope and nothing else:

- `CONTEXT.md`: **"Export — Copy to clipboard and download `.txt`. _(Q6)_"** — from `docs/grillings/2026-09-01-webapp-scope/`, where Q6 was a one-question "what leaves the app" and chose "both" over either alone. It named copy as in-scope. It said nothing about which pane, where the control sits, what it does to a stale pane, or how you know it worked. Every one of those is open here.
- `README.md` already promises a reader "then copy or download the result".
- Nothing is built: there is no `clipboard` string anywhere in `packages/web/`, and `App.vue`'s header comment lists "copy and download (Q6)" under _still to come_.
- The `q16-preset-rules` prototype has no copy affordance, so there is no visual precedent to inherit.
- No open GitHub issue covers it (open: #5, #6, #8, #9).

The pane statuses Q2 turns on, from `useTranscriptStages`:

- reflowed: `locked` (level 1 never ran — pane empty) / `stale` (raw edited under it, **text kept**) / `none` (emptied by hand after a run) / `current`.
- cleaned: `locked` (empty) / `stale` (reflowed pane or rule set changed under it, **text kept**) / `current`.

## Q1 - Where does the copy control sit?

`TranscriptPane`'s header today is `[title] [sub] ······ [badge]`, the badge pushed right by `ml-auto`. The pane below it is a `flex-1` textarea of monospace text starting at the top-left.

Options:

a. **In the pane header, at the far right, after the badge.** `Cleaned transcript · level 2 · read-only ······ [current] [Copy]`. The header is already the pane's strip of pane-level furniture.
b. **In the pane header, before the badge**, so the badge stays the rightmost element and never shifts position.
c. **Floating over the textarea's top-right corner**, the pattern code blocks on the web use.

➡️ Recommendation: **(a)**. The badge is a status readout, not a control; putting one control between two readouts (b) reads worse than all readouts then all controls, and it is also where a download button would later go without rearranging anything. (c) is prettier and wrong for these panes specifically — the text starts at the top-left and runs to the top-right, so a floating chip either permanently covers line 1 or only appears on hover, which is the accessibility trap issue #33 was spent avoiding. The one cost of (a): `ml-auto` moves off the badge and onto whichever element now opens the right-hand group.

### Answer to Q1

(a)

## Q2 - Can you copy a **stale** pane?

You said "after the current logic ran", which settles the empty cases — `locked` and `none` both mean the pane holds nothing, so there is nothing to copy and the control is disabled. That leaves one real case: a pane holding text that ran, and has since gone `stale` because something upstream changed under it.

Options:

a. **Yes — enabled whenever the pane holds text**, so status `current` or `stale`. Copy takes what you can see.
b. **No — enabled only on `current`.** A stale pane refuses, because copying out-of-date text is a mistake worth preventing.

➡️ Recommendation: **(a)**, and Q13b almost decides it for you: stale text is kept on screen rather than cleared precisely because it "is the only copy the user has until they choose to re-run". Refusing to let you take that copy makes keeping it pointless. The badge already says "stale — re-run" right next to the button, so the warning is delivered without disabling anything.

### Answer to Q2

(a)

## Q3 - How do you know it worked — and, on the same channel, that it did not?

A clipboard write is invisible, and `writeText` can reject. This is one decision because whatever confirms success is what reports failure.

Options:

a. **The button's own label swaps** — to "Copied" for ~1.5s, or to "Copy failed" on rejection — with a visually-hidden `aria-live="polite"` region carrying the same words for screen readers. No new component; the button needs a `min-w` so the header does not jitter as the label changes width.
b. **A toast** in a corner with `role="status"`. One announcement channel, reusable later — and a new component, a stacking context and a dismissal policy.
c. **The status badge swaps** to "copied" for a moment, then reverts.
d. **Nothing at all.** The paste will tell you.

➡️ Recommendation: **(a)**. (c) is the cheap one and it is the one to avoid: the badge is the pane's _state_, under a precedence issue #43 spent a whole grilling moving into exactly one place, and a copy is not a pane state — overloading it puts a second writer on that value. (b) is right for an app with many transient messages; this app has one, and the toast would be the larger half of the work. (d) fails silently on rejection, which is the only case where feedback actually matters.

### Answer to Q3

I know vueuse have a component that work and handle this well. so to answer the question: are we going to worry about all the issues that can come up or use a proven and tried library. Pros and cons, please.
