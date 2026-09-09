import { computed, ref, type ComputedRef } from 'vue';
import {
  DEFAULT_PRESET_ID,
  presetById,
  type Preset,
  type RuleId,
} from '@transcript-cleaner/rules';

/**
 * "Which level-2 rules are on" (issue #44), lifted out of `App.vue` and
 * `RulesDrawer` so the membership math — `includes` / `filter` / spread over
 * the enabled rule ids — lives in exactly one place. Before this it was three
 * array operations in `App.vue` (`pickPreset`, `toggleRule`) plus a repeated
 * `enabledRuleIds.includes(rule.id)` through `RulesDrawer`'s template, even
 * though `RulesDrawer` is shallow presentation.
 *
 * A preset replaces the enabled set outright; toggling a rule trims one from
 * — or adds one to — whatever set is current, and leaves the preset id alone
 * (Q12: the preset chooses the starting set, the checkboxes trim it).
 *
 * This composable knows nothing of `useTranscriptStages` or pane staleness —
 * that stays the split #40 established (the staging composable imports no
 * preset code), kept from the other side here. `App.vue` is the one that
 * wires a rule-set change to `markCleanedStale`, by calling it alongside
 * `pickPreset` / `toggleRule` rather than this composable calling it itself.
 *
 * Reactivity-only: no lifecycle hooks, no provide/inject, so its tests call it
 * directly rather than mounting a host component.
 */
export interface RuleSelection {
  /** The id of the currently selected preset. */
  readonly presetId: ComputedRef<string>;
  /** The currently selected preset, looked up from `presetId`. */
  readonly preset: ComputedRef<Preset>;
  /** The enabled rule ids, in the order they were added. */
  readonly enabledRuleIds: ComputedRef<readonly RuleId[]>;
  /** How many rules are enabled — the numerator of the drawer's "N of M" header. */
  readonly enabledCount: ComputedRef<number>;

  /** Whether a given rule is in the enabled set. */
  isEnabled(id: RuleId): boolean;
  /** Replace the enabled set with the named preset's rules. */
  pickPreset(id: string): void;
  /** Trim one rule out of the enabled set, or add it back in. Leaves the preset id alone. */
  toggleRule(id: RuleId): void;
}

export function useRuleSelection(): RuleSelection {
  const presetId = ref(DEFAULT_PRESET_ID);
  const enabledRuleIds = ref<RuleId[]>([...presetById(DEFAULT_PRESET_ID).ruleIds]);

  function pickPreset(id: string) {
    presetId.value = id;
    enabledRuleIds.value = [...presetById(id).ruleIds];
  }

  function toggleRule(id: RuleId) {
    enabledRuleIds.value = enabledRuleIds.value.includes(id)
      ? enabledRuleIds.value.filter((ruleId) => ruleId !== id)
      : [...enabledRuleIds.value, id];
  }

  return {
    presetId: computed(() => presetId.value),
    preset: computed(() => presetById(presetId.value)),
    enabledRuleIds: computed(() => enabledRuleIds.value),
    enabledCount: computed(() => enabledRuleIds.value.length),
    isEnabled: (id) => enabledRuleIds.value.includes(id),
    pickPreset,
    toggleRule,
  };
}
