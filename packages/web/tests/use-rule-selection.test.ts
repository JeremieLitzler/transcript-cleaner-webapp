import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESET_ID,
  LEVEL_2_PIPELINE,
  presetById,
  type RuleId,
} from '@transcript-cleaner/rules';
import { useRuleSelection } from '../src/composables/useRuleSelection';

/**
 * `useRuleSelection` (issue #44) — "which level-2 rules are on", lifted out of
 * `App.vue` and `RulesDrawer` so it can be driven without a component. This
 * suite calls the composable directly and reads the refs it returns, the same
 * approach `use-transcript-stages.test.ts` takes for the staging composable
 * (issue #40).
 *
 * `app.test.ts` still drives preset-picking and rule-toggling through the
 * rendered drawer, but only far enough to prove a drawer action reaches this
 * composable and changes what "Apply rules" produces (issue #44). The
 * preset-replace and toggle-trim behaviour itself is pinned here, at the
 * interface.
 */

const ALL_RULE_IDS: readonly RuleId[] = presetById(DEFAULT_PRESET_ID).ruleIds;
const UNIVERSAL_RULE_IDS: readonly RuleId[] = presetById('universal').ruleIds;

describe('the initial selection', () => {
  it('starts on the default preset, with every one of its rules enabled', () => {
    const s = useRuleSelection();

    expect(s.presetId.value).toBe(DEFAULT_PRESET_ID);
    expect(s.enabledRuleIds.value).toEqual(ALL_RULE_IDS);
    expect(s.enabledCount.value).toBe(ALL_RULE_IDS.length);
  });

  it('reports every default-preset rule enabled through `isEnabled`', () => {
    const s = useRuleSelection();

    for (const rule of LEVEL_2_PIPELINE) {
      expect(s.isEnabled(rule.id)).toBe(ALL_RULE_IDS.includes(rule.id));
    }
  });
});

describe('picking a preset', () => {
  it('replaces the enabled set with the preset rather than merging into it', () => {
    // Universal is the three language-agnostic rules; picking it has to turn
    // the eight COGE-only rules off, not add to the set already enabled.
    const s = useRuleSelection();

    s.pickPreset('universal');

    expect(s.enabledRuleIds.value).toEqual(UNIVERSAL_RULE_IDS);
    expect(s.enabledCount.value).toBe(UNIVERSAL_RULE_IDS.length);
  });

  it('moves `presetId` to the picked preset', () => {
    const s = useRuleSelection();

    s.pickPreset('universal');

    expect(s.presetId.value).toBe('universal');
    expect(s.preset.value.name).toBe('Universal (any language)');
  });

  it('restores the full set when the default preset is picked back', () => {
    const s = useRuleSelection();
    s.pickPreset('universal');

    s.pickPreset(DEFAULT_PRESET_ID);

    expect(s.enabledRuleIds.value).toEqual(ALL_RULE_IDS);
  });

  it('replaces a hand-trimmed set, not just the preset it started from', () => {
    // Picking a preset overrides whatever the checkboxes had done — it does
    // not merge with, or preserve, a rule toggled off by hand.
    const s = useRuleSelection();
    s.toggleRule(2);

    s.pickPreset('universal');

    expect(s.enabledRuleIds.value).toEqual(UNIVERSAL_RULE_IDS);
  });
});

describe('toggling a rule', () => {
  it('trims one rule out of the enabled set and no other', () => {
    const s = useRuleSelection();

    s.toggleRule(2);

    expect(s.isEnabled(2)).toBe(false);
    expect(s.enabledCount.value).toBe(ALL_RULE_IDS.length - 1);
    for (const rule of LEVEL_2_PIPELINE) {
      if (rule.id === 2) continue;
      expect(s.isEnabled(rule.id)).toBe(true);
    }
  });

  it('adds the rule back when toggled a second time', () => {
    const s = useRuleSelection();
    s.toggleRule(2);

    s.toggleRule(2);

    expect(s.isEnabled(2)).toBe(true);
    expect(s.enabledCount.value).toBe(ALL_RULE_IDS.length);
  });

  it('leaves `presetId` alone', () => {
    // Q12: the preset chooses the starting set, the checkboxes trim it — the
    // preset name stays even once the set no longer matches it exactly.
    const s = useRuleSelection();

    s.toggleRule(2);

    expect(s.presetId.value).toBe(DEFAULT_PRESET_ID);
  });

  it('trims from whichever preset is current, not always the default', () => {
    const s = useRuleSelection();
    s.pickPreset('universal');

    s.toggleRule(3);

    expect(s.enabledRuleIds.value).toEqual(
      UNIVERSAL_RULE_IDS.filter((id) => id !== 3),
    );
    expect(s.presetId.value).toBe('universal');
  });
});
