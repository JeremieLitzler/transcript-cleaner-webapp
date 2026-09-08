import { computed, ref, type ComputedRef } from 'vue';
import {
  formatLevel1,
  formatLevel2,
  type RuleId,
} from '@transcript-cleaner/rules';

/**
 * The three-stage machine of Q13b, lifted out of `App.vue` so it has an
 * interface rather than only an implementation. The stages run raw > reflowed >
 * cleaned; level 2 is gated on level 1 having run; an upstream edit marks what
 * follows **stale** and never clears it, because the downstream text is the
 * only copy the user has until they choose to re-run.
 *
 * Rule selection — the preset and the per-rule checkboxes — is deliberately not
 * in here: `runLevel2` is handed the enabled rule ids by the caller, and the
 * caller calls `markCleanedStale` when that set changes. Keeping rule selection
 * out keeps this module free of preset code.
 *
 * Reactivity-only: no lifecycle hooks, no provide/inject, so its tests call it
 * directly rather than mounting a host component.
 */
export interface TranscriptStages {
  /** The raw transcript — what Vibe exported. Edited through `editRaw`. */
  readonly raw: ComputedRef<string>;
  /** The reflowed transcript — level 1's output, the editable repair point. */
  readonly reflowed: ComputedRef<string>;
  /** The cleaned transcript — level 2's output, read-only. */
  readonly cleaned: ComputedRef<string>;

  /** The raw pane holds something level 1 could act on. */
  readonly canRunLevel1: ComputedRef<boolean>;
  /** The Q13b gate: level 1 has run, so level 2 may. */
  readonly canRunLevel2: ComputedRef<boolean>;
  /** Level 1 has never run; the reflowed pane is locked. */
  readonly reflowedLocked: ComputedRef<boolean>;
  /** Level 2 has produced nothing yet; the cleaned pane is locked. */
  readonly cleanedLocked: ComputedRef<boolean>;
  /** The raw pane changed since this reflowed text was produced. */
  readonly reflowedStale: ComputedRef<boolean>;
  /** Something upstream changed since this cleaned text was produced. */
  readonly cleanedStale: ComputedRef<boolean>;

  /** Record a raw-pane edit. Marks the reflowed pane stale once level 1 has run. */
  editRaw(value: string): void;
  /** Record a reflowed-pane edit. Marks the cleaned pane stale. */
  editReflowed(value: string): void;
  /** Run level 1 over the raw pane, filling the reflowed pane. */
  runLevel1(): void;
  /**
   * Run level 2 over the reflowed pane *as it stands* — hand edits included —
   * filling the cleaned pane. Never re-runs level 1.
   */
  runLevel2(enabledRuleIds: readonly RuleId[]): void;
  /**
   * Mark the cleaned pane stale because something the caller owns and feeds
   * into level 2 — the enabled rule set — has changed. A no-op while the
   * cleaned pane is empty: a stage that has produced nothing is not out of
   * date.
   */
  markCleanedStale(): void;
}

export function useTranscriptStages(): TranscriptStages {
  const raw = ref('');
  const reflowed = ref('');
  const cleaned = ref('');

  /** The Q13b gate: level 2 cannot run until level 1 has. */
  const ranLevel1 = ref(false);
  const reflowedStale = ref(false);
  const cleanedStale = ref(false);

  /**
   * Q13b: an upstream change marks what follows stale, it never clears it.
   * Throwing the cleaned text away to signal "out of date" costs the user more
   * than the signal is worth, so the guard keeps an empty pane locked instead.
   */
  function markCleanedStale() {
    if (cleaned.value !== '') {
      cleanedStale.value = true;
    }
  }

  function editRaw(value: string) {
    raw.value = value;
    if (ranLevel1.value) {
      reflowedStale.value = true;
    }
    markCleanedStale();
  }

  function editReflowed(value: string) {
    reflowed.value = value;
    markCleanedStale();
  }

  function runLevel1() {
    reflowed.value = formatLevel1(raw.value);
    ranLevel1.value = true;
    reflowedStale.value = false;
    markCleanedStale();
  }

  /**
   * Q13b again: this reads the reflowed pane as it stands, not a fresh level-1
   * run. That pane is the repair point between two lossy stages, and
   * re-running level 1 here would silently discard whatever was fixed by hand.
   */
  function runLevel2(enabledRuleIds: readonly RuleId[]) {
    cleaned.value = formatLevel2(reflowed.value, { enabledRuleIds });
    cleanedStale.value = false;
  }

  return {
    raw: computed(() => raw.value),
    reflowed: computed(() => reflowed.value),
    cleaned: computed(() => cleaned.value),
    canRunLevel1: computed(() => raw.value.trim() !== ''),
    canRunLevel2: computed(() => ranLevel1.value),
    reflowedLocked: computed(() => !ranLevel1.value),
    cleanedLocked: computed(() => cleaned.value === ''),
    reflowedStale: computed(() => reflowedStale.value),
    cleanedStale: computed(() => cleanedStale.value),
    editRaw,
    editReflowed,
    runLevel1,
    runLevel2,
    markCleanedStale,
  };
}
