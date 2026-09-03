import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESET_ID,
  LEVEL_2_PIPELINE,
  PRESETS,
  type RuleId,
} from '@transcript-cleaner/rules';
import RulesDrawer from '../src/components/RulesDrawer.vue';

/**
 * `RulesDrawer` (issue #25). The drawer keeps no state of its own: it renders
 * `presetId` and `enabledRuleIds` and answers every click with an event. That
 * makes the whole contract observable from the outside — which preset carries
 * the active styling, which rules are ticked, and exactly what each click
 * emits — and this suite pins each half.
 *
 * As elsewhere in the web suite, the assertions name classes rather than
 * computed styles: the web package's Vitest config leaves Tailwind out
 * (issue #22), so a class is what a test here can honestly observe.
 */

type Props = InstanceType<typeof RulesDrawer>['$props'];

/** Every rule number, in pipeline order — the order the drawer lists them. */
const ALL_RULE_IDS: readonly RuleId[] = LEVEL_2_PIPELINE.map((rule) => rule.id);

/**
 * A partial enabled set. These three happen to be the language-agnostic rules,
 * but the drawer neither knows nor cares — it is just "some, not all", picked
 * so the ticked and unticked halves are both non-empty.
 */
const SOME_RULE_IDS: readonly RuleId[] = [3, 5, 9];

function mountDrawer(props: Partial<Props> = {}) {
  return mount(RulesDrawer, {
    props: {
      presetId: DEFAULT_PRESET_ID,
      enabledRuleIds: ALL_RULE_IDS,
      ...props,
    },
  });
}

type Wrapper = ReturnType<typeof mountDrawer>;

/** The preset rows, in render order. */
function presetRows(wrapper: Wrapper) {
  return wrapper.findAll('label.preset');
}

/**
 * A single preset row, matched against its **name line only** — the first
 * inner `div` — not its whole text. Matching the whole label would also see
 * the description, so a preset whose name was a substring of another's
 * description could be selected silently.
 */
function presetRow(wrapper: Wrapper, name: string) {
  const row = presetRows(wrapper).find((candidate) =>
    candidate.findAll('div')[0]!.text().includes(name),
  );
  if (!row) {
    throw new Error(`No preset row named ${name}`);
  }
  return row;
}

/** The rule rows, in render order. */
function ruleRows(wrapper: Wrapper) {
  return wrapper.findAll('label.rule');
}

/**
 * The `N.` span a rule row renders — its first span, before the name. Read
 * back as the number it shows so the rule assertions stay on what the user
 * sees rather than on a `data-` attribute added for the tests.
 */
function ruleIdOf(row: ReturnType<typeof ruleRows>[number]): number {
  return Number(row.findAll('span')[0]!.text().replace('.', ''));
}

/** A single rule row, found by the rule number it renders. */
function ruleRow(wrapper: Wrapper, id: RuleId) {
  const row = ruleRows(wrapper).find((candidate) => ruleIdOf(candidate) === id);
  if (!row) {
    throw new Error(`No rule row for rule ${id}`);
  }
  return row;
}

function ruleCheckbox(wrapper: Wrapper, id: RuleId) {
  return ruleRow(wrapper, id).get('input[type="checkbox"]');
}

/**
 * The "N of M on" header — the `.rulehead` over the rule column, told apart
 * from the "Presets" one by the text it ends with rather than by position.
 */
function ruleCountHeader(wrapper: Wrapper) {
  const head = wrapper
    .findAll('.rulehead')
    .find((candidate) => candidate.text().endsWith(' on'));
  if (!head) {
    throw new Error('No rule-count header');
  }
  return head;
}

describe('the RulesDrawer preset list', () => {
  it('lists every preset from the package, with its name and description', () => {
    // Row-by-row against `PRESETS`: the finder above matches on the name, so
    // asserting the description as well is what independently proves each
    // preset's text actually reaches the page.
    const wrapper = mountDrawer();
    const rows = presetRows(wrapper);

    expect(rows).toHaveLength(PRESETS.length);
    PRESETS.forEach((preset, index) => {
      expect(rows[index]!.text()).toContain(preset.name);
      expect(rows[index]!.text()).toContain(preset.description);
    });
  });

  it('marks only the active preset — by class and by filled bullet', () => {
    // `presetId` names one preset; every other row must be plain. The class
    // and the `◉`/`○` bullet are two independent renderings of the same fact,
    // and the drawer has to keep them in step.
    const wrapper = mountDrawer({ presetId: 'universal' });

    for (const preset of PRESETS) {
      const row = presetRow(wrapper, preset.name);
      const active = preset.id === 'universal';

      expect(row.classes().includes('preset-on')).toBe(active);
      expect(row.text().includes('◉')).toBe(active);
      expect(row.text().includes('○')).toBe(!active);
    }
  });

  it('emits `pickPreset` with the id of whichever preset row is clicked', async () => {
    // Includes the row that is already active (COGE, the default): the drawer
    // does not guard that click — deciding a no-op is App.vue's job.
    for (const preset of PRESETS) {
      const wrapper = mountDrawer();

      await presetRow(wrapper, preset.name).trigger('click');

      expect(wrapper.emitted('pickPreset')).toEqual([[preset.id]]);
    }
  });
});

describe('the RulesDrawer close affordances', () => {
  it('emits `close` when the backdrop is clicked', async () => {
    // The backdrop is found by `inset-0` — the one structural fact that makes
    // it a full-viewport scrim — not by its z-index or colour, which are the
    // volatile half of its class list. The sibling `<aside>` is `inset-y-0`,
    // so this selector does not match it.
    const wrapper = mountDrawer();

    await wrapper.get('div.inset-0').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits `close` when the close button is clicked', async () => {
    const wrapper = mountDrawer();

    await wrapper.get('button[aria-label="Close"]').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});

describe('the RulesDrawer rule list', () => {
  it('lists every level-2 rule, with its number and name, in pipeline order', () => {
    // Pipeline order, not rule-number order: CONTEXT.md calls that order
    // load-bearing, the drawer renders `LEVEL_2_PIPELINE` as it stands, and a
    // row-by-row check is what would catch a stray sort.
    const wrapper = mountDrawer();
    const rows = ruleRows(wrapper);

    expect(rows).toHaveLength(LEVEL_2_PIPELINE.length);
    rows.forEach((row, index) => {
      const rule = LEVEL_2_PIPELINE[index]!;

      expect(row.findAll('span')[0]!.text()).toBe(`${rule.id}.`);
      expect(row.get('.rule-name').text()).toBe(rule.name);
    });
  });

  it('ticks the rules in `enabledRuleIds` and greys the rest', () => {
    const wrapper = mountDrawer({ enabledRuleIds: SOME_RULE_IDS });

    for (const rule of LEVEL_2_PIPELINE) {
      const row = ruleRow(wrapper, rule.id);
      const on = SOME_RULE_IDS.includes(rule.id);

      expect(
        (row.get('input[type="checkbox"]').element as HTMLInputElement).checked,
      ).toBe(on);
      expect(row.classes().includes('rule-off')).toBe(!on);
    }
  });

  it('emits `toggleRule` with the id of whichever rule row is toggled, and nothing else', async () => {
    // Every row has to carry its own id into the event, so a template that
    // closed over the loop variable wrong would surface here — not only for
    // one hand-picked rule.
    for (const rule of LEVEL_2_PIPELINE) {
      const wrapper = mountDrawer();

      await ruleCheckbox(wrapper, rule.id).setValue(false);

      expect(wrapper.emitted('toggleRule')).toEqual([[rule.id]]);
    }
  });
});

describe('the RulesDrawer rule-count header', () => {
  it('reads "N of M on" off the enabled count and the pipeline length', () => {
    const total = LEVEL_2_PIPELINE.length;

    expect(
      ruleCountHeader(mountDrawer({ enabledRuleIds: ALL_RULE_IDS })).text(),
    ).toBe(`${total} of ${total} on`);
    expect(
      ruleCountHeader(mountDrawer({ enabledRuleIds: SOME_RULE_IDS })).text(),
    ).toBe(`${SOME_RULE_IDS.length} of ${total} on`);
    expect(ruleCountHeader(mountDrawer({ enabledRuleIds: [] })).text()).toBe(
      `0 of ${total} on`,
    );
  });
});
