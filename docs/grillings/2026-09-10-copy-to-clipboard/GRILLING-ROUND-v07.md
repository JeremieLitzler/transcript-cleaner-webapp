# Grilling round v07 — copy to clipboard on the reflowed / cleaned pane

## Settled in v06

- **Q14 — Slot name:** (a). **One generic slot, `actions`**, in `TranscriptPane`'s header. It is not named after the copy button because the download button is already scheduled to sit in it. The #76 work in progress already builds it that way: `ml-auto` sits on a right-hand group holding the badge and the slot, so an action stays far right on a pane showing no badge.

Since v06, outside this folder: #74 was split into #76 (the happy path) and #77 ("Copy failed"). Implementing #76 surfaced the fact below, recorded on #74 in [this comment](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/74#issuecomment-5615611215). #76 is paused, uncommitted, with `npm run check` green.

## Reopened

**Q4 — the library — reopened, narrowed.** Q4 was answered on a fact that turned out to be false. Read in `@vueuse/core` **14.4.0**'s shipped source (`node_modules/@vueuse/core/dist/index.js`, `useClipboard`, lines 1682-1764) and run under happy-dom:

- `copy()` writes with `navigator.clipboard.write([new ClipboardItem({ 'text/plain': value })])`, **not** `writeText`.
- It queries the `clipboard-write` permission through `usePermission`, and uses the async API only when the answer is `granted` or `prompt`. A click made before that query has settled goes straight to the fallback below, because `isAllowed(undefined)` is `false`.
- On **any** write failure, it swallows the error and falls back to `document.execCommand('copy')`, whatever the `legacy` option says. `legacy` only widens `isSupported`.
- It ignores `execCommand`'s return value and **sets `copied = true` regardless**. Browsers return `false` from `execCommand` rather than throwing, so in a real browser `copy()` never rejects and always reports success.
- happy-dom has no `document.execCommand`, so under test the fallback throws `TypeError` and `copy()` _does_ reject. A failure test would pass on a rejection that no real browser produces.

What this kills, and what it leaves alone:

- **Killed:** Q4's stated reason for `useClipboard` ("`copy()` … rejects; `copied` just stays `false`"), and with it any way to build Q7's "Copy failed" on top of `copy()`. The v01 premise "no legacy `execCommand` fallback" cannot hold either, because the library ships one unconditionally.
- **Untouched:** Q4's wider decision, **`@vueuse/core` as the web app's browser-API toolkit**. Its main argument is `useDropZone` for the Q25 drop, and nothing here touches it. Q5 (label swap plus live region), Q7 (failure persists), Q9 (real clipboard for success, a spy on `writeText` for failure) and Q10 (no permission code) all still stand as decisions. Q9 and Q10 only hold if the engine is not `useClipboard`, which is what Q15 decides.

So the only live question is which call puts the text on the clipboard. That is Q15.

## Q15 - Which call puts the text on the clipboard?

The success state `useClipboard` was bought for is a `copied` flag with a 1500 ms reset. That reset is `useTimeoutFn` from `@vueuse/shared` (re-exported by `@vueuse/core`), which `useClipboard` itself uses internally. Read in its source: `start()` clears any running timer before setting a new one, so a second copy restarts the full 1500 ms, and `tryOnScopeDispose(stop)` clears the timer when the button unmounts. Those are the two timer bugs Q4 option (a) warned about, and `useTimeoutFn` closes both on its own.

Options:

a. **`navigator.clipboard.writeText` inside `CopyButton`, with `useTimeoutFn` for the 1500 ms reset.** A `try`/`catch` around `await writeText(source)`: success sets "Copied" and calls `start()`, a rejection sets "Copy failed" (Q7, no timer). No permission query, no `execCommand`, and a missing `navigator.clipboard` throws a `TypeError` inside the `async` function, so it lands in the same `catch`. VueUse still arrives with #76, for `useTimeoutFn`.
b. **`writeText`, with a hand-written `setTimeout` for the reset.** Same behaviour as (a), and no VueUse in `CopyButton` at all. `@vueuse/core` would then arrive with the Q25 drop instead of with #76.
c. **`useClipboard().copy()`, as #76 is written.** The happy path works and happy-dom's `readText()` reads it back. It ships the `execCommand` fallback and the permission query inside the library, and there is no reliable failure state: #77 cannot be built as specified, and Q7 is effectively dropped.
d. **`useClipboard` with an injected `navigator` whose `clipboard.write` records the rejection.** The failure is detected, but the library still runs `execCommand` afterwards and still sets `copied = true`. That fallback may genuinely copy the text (Chromium usually lets `execCommand('copy')` succeed inside a click) or may not, and nothing reports which. So "Copy failed" would sometimes be wrong, and the button would carry a wrapper whose only purpose is to undo its library.

➡️ Recommendation: **(a)**. It is the only option that meets every decision still standing (Q5, Q7, Q9, Q10 and the v01 premise) without a workaround, and it keeps exactly what the library was worth to this button: the timer, its restart and its cleanup. (b) buys nothing over (a) except postponing the dependency, and hand-writes the timer bugs Q4 was about. (c) trades a correct failure state for a component that looks library-shaped: the button would say "Copied" when nothing was copied, which is the one lie Q7 was designed to prevent. (d) fights the library it depends on.

### Answer to Q15

(a) which means no use of `useClipboard`, but still use of VueUse with `useTimeoutFn`

## Q16 - How is ADR-0001's false fact corrected?

`docs/adr/0001-vueuse-as-browser-api-toolkit.md` is `accepted` and committed (`aaf0df4`). Two of its statements are false for 14.4.0, whatever Q15 decides:

- Option 2's pro: "`useClipboard` supplies the copy button's success state … with its timer cleanup — and an injectable `navigator`."
- The first "Consequences worth stating" bullet: "`copy()` returns `Promise<void>` and rejects; there is no error state, and `copied` simply stays `false`."

Your ADR template (`~/.claude/templates/adr.md`) says an ADR is **immutable once `accepted`**, and that a changed mind is a new ADR that `supersedes` the old one. It says nothing about a record whose decision stands but whose facts were wrong. The decision itself, `@vueuse/core` as the toolkit, is not changed by anything above.

Options:

a. **Supersede.** A new `0002` restating the same decision with the facts corrected and a `supersedes: ADR-0001` line. `0001` only gains `status: superseded` and `superseded-by: ADR-0002`. This follows the template's lifecycle to the letter, and a reader sees that 0001 was accepted on a false fact. The cost: a second record for an unchanged decision, whose `superseded` status reads as "we changed our minds" when nobody did.
b. **Correct `0001` in place**, with a dated correction note under _Consequences_ pointing at this round. One record, still true. The cost: it breaks the template's immutability rule, and git history becomes the only trace of what the ADR used to claim.
c. **Leave `0001` as it is**, and record the correction only here and in `GRILLING-SUMMARY.md`. Nothing is rewritten, but anyone reading the ADR keeps believing the false fact, and `#77` already cites that fact.

➡️ Recommendation: **(a)**. The template is your standing rule for every ADR, and immutability is its point: a record that can be quietly corrected can also be quietly rewritten. Superseding costs one file and leaves 0001 as the honest trace of what was believed on 2026-09-10. The "changed our minds" misreading is avoided by saying in 0002's _Context_, in its first line, that the decision is unchanged and only the facts are. (b) is the pragmatic choice, and a fair one given that 0001 is hours old and nothing is built on it; if you pick it, say so and I will record it as a one-off exception rather than a new rule. (c) leaves #77 quoting a fact the code will contradict.

### Answer to Q16

(a)
