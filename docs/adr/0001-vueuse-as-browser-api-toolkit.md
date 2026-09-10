---
title: '@vueuse/core is the web app''s browser-API toolkit'
date: 2026-09-10
deciders: Jérémie Litzler
status: accepted
---

## Context

`CONTEXT.md` settled in Q6 that a transcript leaves the app by **copy to clipboard and download `.txt`**, and in Q25 that a `.txt` file can be **dropped** onto the page. None of the three was built. The copy button was grilled first, on 2026-09-10, and the question it raised was wider than the button: should the web app hand-write each browser API as it needs one, or reach them all through a proven library?

The forces at play:

- **`packages/web` has one runtime dependency, `vue`.** Its sibling `packages/rules` has none, by design — its manifest says "no runtime dependencies" — and it is kept that way because the rule engine must run with no UI and no DOM. Neither package takes dependencies casually.
- **The three features are not equally hard.** Copy is `navigator.clipboard.writeText`, a flag and a timer. A drop zone that behaves is not small: `preventDefault` is needed on `dragover` _and_ `dragenter` or the browser navigates away to the dropped file, and `dragenter` / `dragleave` fire once per child element, so a naive "hovering" flag flickers over any nested markup. A download is a `Blob`, an `<a download>` and a click.
- **A library's coverage is uneven too, and not always in the direction its name suggests.** VueUse has `useDropZone`. It has **no download composable**: `useFileDialog` opens a file _picker_, a way to read a file, not to save one. And its `useClipboard` does not fit this app's copy button at all:
  - `copy()` writes with `navigator.clipboard.write([new ClipboardItem({ 'text/plain': value })])`, not `writeText`, and first queries the `clipboard-write` permission through `usePermission`.
  - On any write failure it swallows the error and falls back to `document.execCommand('copy')`, whatever its `legacy` option says. It ignores `execCommand`'s return value and sets `copied = true` regardless, so in a browser `copy()` never rejects and always reports success.
  - A copy made before the permission query has settled goes straight to that fallback.
  - The app's settled copy behaviour — no `execCommand`, no permission code, and a "Copy failed" state that persists until the next attempt — cannot be built on it.
- **VueUse's timer is sound.** `useTimeoutFn`, the timer `useClipboard` uses internally, clears a running timer before starting a new one, so a second copy restarts the full duration, and it stops itself when its component unmounts. Those are the two bugs a hand-written confirmation timer usually has.

The problem to solve: **how does the web app reach browser APIs that need a Vue-shaped, reactive interface — by hand, feature by feature, or through one library adopted once?**

## Considered options

### Option 1 — Hand-write each browser API as it comes

- ✅ No new dependency; `packages/web` keeps `vue` as its only one.
- ✅ Every behaviour is visible in the file that uses it, including the parts a library would hide.
- ✅ Copy really is a handful of lines, so for the feature that triggered the question this is the cheaper path.
- ❌ The drop zone is exactly the kind of code that is written wrong first and fixed over years of bug reports — the nested-children enter/leave flicker and the missing `preventDefault` are the classic ones. The app would re-discover them.
- ❌ The copy button's confirmation timer carries the restart and unmount-cleanup bugs a hand-written `setTimeout` usually has.
- ❌ Every future browser API reopens the same debate.

### Option 2 — Adopt `@vueuse/core` as the web app's browser-API toolkit ✔ chosen

- ✅ `useDropZone` carries the fixes a hand-written drop zone lacks: an enter/leave `counter` that only deactivates the zone at zero, `preventDefault` on both drag events, `dataTransfer.dropEffect = 'copy'`, `dataTypes` / `checkValidity` / `multiple` filtering, and listener cleanup. Verified in its source, not assumed.
- ✅ `useTimeoutFn` supplies the copy button's 1500 ms "Copied" reset, with its restart and its cleanup.
- ✅ One dependency serves several features, so its cost is paid once.
- ❌ A second runtime dependency, a transitive tail (`@vueuse/shared`, `@vueuse/metadata`, `@types/web-bluetooth`), and one more Dependabot stream on a package at major 14 at the time of writing. Peer `vue ^3.5.0`, which the app satisfies. Vite tree-shakes it, so only imported composables ship.
- ❌ It is adopted partly on the strength of a feature — the drop — that does not exist yet.
- ❌ For the copy button it saves only the timer: the composable named for the job, `useClipboard`, is the wrong tool here.

**Consequences worth stating, because a reader could assume otherwise:**

- **The copy button does not use `useClipboard`.** It calls `navigator.clipboard.writeText` itself, catches the rejection into its own "Copy failed" state, and uses `useTimeoutFn` for the success reset. A reader who finds VueUse in the dependencies and a hand-written clipboard write next to it is looking at this decision, not an oversight. Reintroducing `useClipboard` would bring back an `execCommand` fallback that reports a failed copy as "Copied".
- **VueUse does not cover the download.** At most `useObjectUrl` manages the `createObjectURL` / `revokeObjectURL` lifecycle. The `Blob`, the `<a download>` and the click stay hand-written. This ADR does not mean "the download is solved".
- **The boundary is `packages/web`.** `packages/rules` stays free of runtime dependencies; nothing in the rule engine touches a browser API, and this decision does not reach it.
- **A composable's behaviour is read in the installed version's source, not in its docs.** This record's first version was wrong about `useClipboard` because it described the documented shape, not the shipped code. The same check applies to `useDropZone` when the drop lands.
- **Corrected in place on 2026-09-10, before anything was built on it.** As first accepted, this record said `useClipboard` supplies the copy button's success state, and that its `copy()` rejects and leaves `copied` at `false`. `@vueuse/core` 14.4.0's shipped source contradicts both (see _Context_), and the copy button now takes only `useTimeoutFn`. The decision did not change. Editing an accepted ADR breaks the immutability rule of the ADR template; it was done here as a one-off exception, because no implementation had landed on the false claim, and it sets no precedent.

### Option 3 — Adopt VueUse for the copy button only

- ✅ Smallest possible step; nothing decided about the drop.
- ❌ Pays the full dependency cost for the one feature where the library saves least — a timer — without the argument that justifies it.

## Decision

In the context of a Vue app that needs clipboard, file-drop and file-download access, with a rule engine that must stay dependency-free, **we decided for adopting `@vueuse/core` as `packages/web`'s browser-API toolkit** to achieve drag-and-drop handling that already survived years of edge cases, and a copy confirmation whose timer needs no hand-written restart or cleanup, **accepting** a second runtime dependency with its own update stream — and knowing that the clipboard write, its failure state and the download stay hand-written, because VueUse covers none of them in a way this app can use.

## Resources

- Grilling: `docs/grillings/2026-09-10-copy-to-clipboard/` — Q4 in `GRILLING-ROUND-v02.md` (the decision), the corrections recorded in `GRILLING-ROUND-v06.md` (drag & drop's real cost, and `useFileDialog` withdrawn as the download answer), Q15 and Q16 in `GRILLING-ROUND-v07.md` (the copy engine, and how to correct this record), Q16's reversal to an in-place correction recorded in `GRILLING-ROUND-v09.md`, and `GRILLING-SUMMARY.md`.
- The finding, as reported on the parent issue: <https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/74#issuecomment-5615611215>
- `@vueuse/core` 14.4.0, `node_modules/@vueuse/core/dist/index.js` — `useClipboard` (lines 1682-1764: the `clipboard.write` call, the `usePermission('clipboard-write')` check, the swallowed error, the unconditional `legacyCopy`, the unconditional `copied.value = true`) and `usePermission` (lines 1650-1672).
- `@vueuse/shared` 14.4.0, `node_modules/@vueuse/shared/dist/index.js` — `useTimeoutFn` (lines 1732-1766: `start()` calls `clear()` first, and `tryOnScopeDispose(stop)`).
- `CONTEXT.md` — _Export_ (Q6) and _File drop_ (Q25) under _Settled scope for v1_.
- `packages/rules/package.json` — the "no runtime dependencies" description; `packages/web/package.json` — `vue` as the one runtime dependency before this change.
- VueUse `useFileDialog`: <https://vueuse.org/core/useFileDialog/> — a file picker, which is why it is not the download answer.
- VueUse `useClipboard`: <https://vueuse.org/core/useClipboard/>
- VueUse `useTimeoutFn`: <https://vueuse.org/shared/useTimeoutFn/>
- VueUse `useDropZone`: <https://vueuse.org/core/useDropZone/>, and its source: <https://github.com/vueuse/vueuse/blob/main/packages/core/useDropZone/index.ts>
- `@vueuse/core` on npm: <https://www.npmjs.com/package/@vueuse/core>
