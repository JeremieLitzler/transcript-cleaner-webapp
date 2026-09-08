# Grilling round v01 — collapse the pane state machine into a PaneStatus enum

## Settled in previous rounds

Nothing yet — this is round 1.

Background for the whole session: issue #43, and the "Stages" / "Middle pane" entries in `CONTEXT.md`. The code under discussion is `packages/web/src/composables/useTranscriptStages.ts` (six boolean computeds: `canRunLevel1`, `canRunLevel2`, `reflowedLocked`, `cleanedLocked`, `reflowedStale`, `cleanedStale`), `packages/web/src/components/TranscriptPane.vue` (a `badge` computed that ranks `locked > stale > current` and falls back to `modelValue !== ''` for `current`), and `App.vue` (passes `:locked` and `:stale` per pane).

One fact worth stating up front: PR #42 (issues #40 / #41) is still **open** against `develop`. This grilling — the decision plus the `CONTEXT.md` entry — does not need #42 merged. Only the follow-up implementation ticket does, and issue #43 already says that ticket is blocked by this one.

## Q1 - Does the raw pane report the same status type as the two derived panes?

There are three panes. `reflowed` and `cleaned` are the derived ones and clearly need the full `none | current | stale | locked` vocabulary. The `raw` pane is only ever blank or holding text — it can never be `stale` or `locked`. Today `TranscriptPane` gives it a `current` badge purely from `modelValue !== ''`.

Options:

a. **One `PaneStatus` type, all three panes.** `useTranscriptStages` exposes `rawStatus` alongside `reflowedStatus` and `cleanedStatus`. `rawStatus` is `computed(() => raw.value.trim() === '' ? 'none' : 'current')` — one line, next to the others. `TranscriptPane` takes a `status` prop and derives nothing at all.
b. **Enum for the derived panes only.** `raw` keeps an ad-hoc path: either `TranscriptPane` retains its `modelValue !== ''` fallback for that one pane, or `App.vue` computes the raw badge inline.

➡️ Recommendation: **(a)**. The issue's stated goal is "the precedence lives in exactly one place" and "`TranscriptPane` becomes a renderer of `status`". Option (b) keeps a second, smaller derivation path alive for exactly one pane, which is the split the refactor exists to remove. The cost of (a) is that `PaneStatus` is "wider than reachable" for the raw pane (it can only ever be two of the four values) — that is cheaper than maintaining two types or a fallback branch. Note this makes the composable's derived surface four computeds (`canRunLevel1`, `rawStatus`, `reflowedStatus`, `cleanedStatus`), not the three the issue sketched; flag if that bothers you.

### Answer to Q1

(a)

## Q2 - What does a pane that ran and was then emptied by hand report?

Run level 1, then select-all-delete in the reflowed pane. `editReflowed('')` fires: `ranLevel1` stays `true`, `reflowedStale` stays `false`, `modelValue` is now `''`. Today `TranscriptPane`'s `badge` computed falls through every branch and shows **no badge**.

Options for that state:

a. **Keep `none` as a real enum member.** An emptied-but-ran pane shows no badge, same as today. `none` also becomes the raw pane's resting state if Q1 lands on (a).
b. **Read it as `current`.** A "current" badge sits over empty text.
c. **Read it as `stale`.** The pane asks to be re-run.

➡️ Recommendation: **(a)**. `none` honestly means "blank, and that is not an error" — which is exactly what an emptied pane is; the user did it on purpose. (b) puts a truthful-sounding badge over content that is not there. (c) means "upstream changed, re-run", but the raw pane did **not** change — hand-emptying the reflowed pane is not an upstream edit, so `stale` would misstate the reason. Keeping `none` means the enum is a genuine four-member set with every member load-bearing. (If Q1 lands on (b) _and_ you pick (c) here, `none` disappears and the enum is three members — that is the only combination that removes it.)

### Answer to Q2

(a)

## Q3 - Confirm: the `locked > stale > current > none` precedence moves into the composable, and only there.

The core of the issue. `useTranscriptStages` would collapse `ranLevel1` / `reflowedStale` / `cleanedStale` / pane-emptiness into a single `ComputedRef<PaneStatus>` per pane, applying the precedence ladder once. `TranscriptPane`'s `badge` computed stops ranking anything — it maps a given `status` to badge text (and variant, but where that mapping lives is a later question). `App.vue` stops passing `:locked` and `:stale`.

The precedence order stays exactly as `TranscriptPane` ranks it today: `locked` beats `stale` beats `current` beats `none`.

➡️ Recommendation: **yes, as described**, with the precedence order unchanged. This is the point of the refactor and nothing in the current behaviour argues against it. The composable already enforces the same gate internally inside `runLevel2`, so putting the status ladder there too keeps the guard and the reported state as a matched pair. Confirming this now fixes the shape that Q1, Q2 and the later `TranscriptPane`-interface questions all hang off.

### Answer to Q3

go for Recommendation

## Q4 - `canRunLevel2`: a named computed on the interface, or `reflowedStatus !== 'locked'` at the call site?

Once `reflowedStatus` exists, `canRunLevel2` is exactly `reflowedStatus.value !== 'locked'` in every state (`reflowedStatus` is `locked` if level 1 has never run; once it runs the pane is `current` or `stale`, and `ranLevel1` never goes back to `false`).

Options:

a. **Keep `canRunLevel2` as a named `ComputedRef<boolean>` on `TranscriptStages`.**
b. **Drop it.** `App.vue` writes `reflowedStatus !== 'locked'` directly on the button's `:disabled` and its `title`.

➡️ Recommendation: **(a)**. The name carries intent ("the Q13b gate") that the bare expression does not — a reader at the call site would have to already know that `locked` is the one gating state. `App.vue` uses the gate twice (the `:disabled` and the "Level 1 must run first" `title`) and `app.test.ts` asserts on it; inlining scatters the gate's definition back into the component, which is the split the refactor removes. `canRunLevel1` (the raw-pane gate) stays on the interface for the same reason and for symmetry — this question is only about whether `canRunLevel2` earns its keep alongside it.

### Answer to Q4

(a)
