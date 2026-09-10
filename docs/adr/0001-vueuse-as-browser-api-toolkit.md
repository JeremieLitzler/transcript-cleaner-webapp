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
- **A library's coverage is uneven too.** VueUse has `useClipboard` and `useDropZone`. It has **no download composable**: `useFileDialog` opens a file _picker_, a way to read a file, not to save one.

The problem to solve: **how does the web app reach browser APIs that need a Vue-shaped, reactive interface — by hand, feature by feature, or through one library adopted once?**

## Considered options

### Option 1 — Hand-write each browser API as it comes

- ✅ No new dependency; `packages/web` keeps `vue` as its only one.
- ✅ Every behaviour is visible in the file that uses it, including the parts a library would hide.
- ✅ Copy really is a handful of lines, so for the feature that triggered the question this is the cheaper path.
- ❌ The drop zone is exactly the kind of code that is written wrong first and fixed over years of bug reports — the nested-children enter/leave flicker and the missing `preventDefault` are the classic ones. The app would re-discover them.
- ❌ Every future browser API reopens the same debate.

### Option 2 — Adopt `@vueuse/core` as the web app's browser-API toolkit ✔ chosen

- ✅ `useDropZone` carries the fixes a hand-written drop zone lacks: an enter/leave `counter` that only deactivates the zone at zero, `preventDefault` on both drag events, `dataTransfer.dropEffect = 'copy'`, `dataTypes` / `checkValidity` / `multiple` filtering, and listener cleanup. Verified in its source, not assumed.
- ✅ `useClipboard` supplies the copy button's success state — `copied`, auto-reset after `copiedDuring` (1500 ms by default) with its timer cleanup — and an injectable `navigator`.
- ✅ One dependency serves several features, so its cost is paid once.
- ❌ A second runtime dependency, a transitive tail (`@vueuse/shared`, `@vueuse/metadata`, `@types/web-bluetooth`), and one more Dependabot stream on a package at major 14 at the time of writing. Peer `vue ^3.5.0`, which the app satisfies. Vite tree-shakes it, so only imported composables ship.
- ❌ It is adopted partly on the strength of a feature — the drop — that does not exist yet.

**Consequences worth stating, because a reader could assume otherwise:**

- **VueUse does not cover a failed copy.** `useClipboard`'s `copy()` returns `Promise<void>` and rejects; there is no error state, and `copied` simply stays `false`. The "Copy failed" state is the app's own code.
- **VueUse does not cover the download.** At most `useObjectUrl` manages the `createObjectURL` / `revokeObjectURL` lifecycle. The `Blob`, the `<a download>` and the click stay hand-written. This ADR does not mean "the download is solved".
- **The boundary is `packages/web`.** `packages/rules` stays free of runtime dependencies; nothing in the rule engine touches a browser API, and this decision does not reach it.

### Option 3 — Adopt VueUse for the copy button only

- ✅ Smallest possible step; nothing decided about the drop.
- ❌ Pays the full dependency cost for the one feature where the library saves least — a timer — without the argument that justifies it.

## Decision

In the context of a Vue app that needs clipboard, file-drop and file-download access, with a rule engine that must stay dependency-free, **we decided for adopting `@vueuse/core` as `packages/web`'s browser-API toolkit** to achieve drag-and-drop handling that already survived years of edge cases, and a clipboard success state with no hand-written timer, **accepting** a second runtime dependency with its own update stream — and knowing that the clipboard failure state and the download stay hand-written, because VueUse covers neither.

## Resources

- Grilling: `docs/grillings/2026-09-10-copy-to-clipboard/` — Q4 in `GRILLING-ROUND-v02.md` (the decision), the corrections recorded in `GRILLING-ROUND-v06.md` (drag & drop's real cost, and `useFileDialog` withdrawn as the download answer), and `GRILLING-SUMMARY.md`.
- `CONTEXT.md` — _Export_ (Q6) and _File drop_ (Q25) under _Settled scope for v1_.
- `packages/rules/package.json` — the "no runtime dependencies" description; `packages/web/package.json` — `vue` as the one runtime dependency before this change.
- VueUse `useFileDialog`: <https://vueuse.org/core/useFileDialog/> — a file picker, which is why it is not the download answer.
- VueUse `useClipboard`: <https://vueuse.org/core/useClipboard/>
- VueUse `useDropZone`: <https://vueuse.org/core/useDropZone/>, and its source: <https://github.com/vueuse/vueuse/blob/main/packages/core/useDropZone/index.ts>
- `@vueuse/core` on npm: <https://www.npmjs.com/package/@vueuse/core>
