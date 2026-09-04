import { type DOMWrapper, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../src/App.vue';

/**
 * `App.vue` (issue #24) — the three-stage state machine of Q13b, driven the way
 * a user drives it.
 *
 * Everything below goes through the rendered buttons, textareas and checkboxes
 * rather than through the component's refs. The refs are not the contract: a
 * rewiring that leaves `runLevel1` correct but stops the button reaching it is
 * exactly the regression this suite exists to catch, and a test that reached in
 * and called the function would sail straight past it.
 *
 * The badge wording asserted here belongs to `TranscriptPane` and is pinned by
 * `transcript-pane.test.ts`. It is read here as the pane's observable state —
 * `locked`, `current`, `stale — re-run` — because the props behind it are what
 * `App.vue` decides.
 */

/**
 * A raw transcript small enough to reason about and still exercising level 1:
 * the first line does not end in `.`, so a correct reflow glues it to the
 * second, and the third becomes a paragraph of its own.
 */
const RAW = [
  'This is the first line',
  'of a paragraph.',
  'and the second paragraph follows.',
].join('\n');

/** What level 1 makes of `RAW`. Two paragraphs, no trailing newline (L1-06). */
const REFLOWED =
  'This is the first line of a paragraph.\n\nand the second paragraph follows.';

/**
 * What level 2 makes of `REFLOWED` under the default COGE preset: rule 2 joins
 * the paragraph opening with `and ` onto the one before it, dropping that
 * one's closing period as every join in the pipeline does.
 */
const CLEANED =
  'This is the first line of a paragraph and the second paragraph follows.';

/**
 * The same text with rule 2 off — under the Universal preset, or with rule 2
 * unticked by hand. The second paragraph survives the join, and rule 3, which
 * stays on either way, capitalises it. A rule set that produced the same output
 * as the default would prove nothing about the wiring.
 */
const CLEANED_WITHOUT_RULE_2 =
  'This is the first line of a paragraph.\n\nAnd the second paragraph follows.';

function mountApp() {
  return mount(App);
}

type Wrapper = ReturnType<typeof mountApp>;

/**
 * A pane found by its rendered title. Position would be shorter and would
 * silently retarget if the three panes were ever reordered — which is a change
 * these tests should fail on, not absorb.
 */
function pane(wrapper: Wrapper, title: string) {
  const section = wrapper
    .findAll('section')
    .find((candidate) => candidate.get('header > span').text() === title);
  if (!section) {
    throw new Error(`No pane titled ${title}`);
  }
  return section;
}

function paneText(wrapper: Wrapper, title: string): string {
  return (pane(wrapper, title).get('textarea').element as HTMLTextAreaElement)
    .value;
}

/** The pane's badge text, or `''` when it shows none. */
function badge(wrapper: Wrapper, title: string): string {
  const found = pane(wrapper, title).find('.badge');
  return found.exists() ? found.text() : '';
}

function typeInto(wrapper: Wrapper, title: string, value: string) {
  return pane(wrapper, title).get('textarea').setValue(value);
}

/** A toolbar button found by its label, so the tests read as the UI does. */
function button(wrapper: Wrapper, label: string) {
  const found = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === label);
  if (!found) {
    throw new Error(`No button labelled ${label}`);
  }
  return found;
}

/** The toolbar chip: the preset name and the enabled-rule count. */
function chip(wrapper: Wrapper) {
  return wrapper.get('.chip');
}

function openDrawer(wrapper: Wrapper) {
  return chip(wrapper).trigger('click');
}

function pickPreset(wrapper: Wrapper, name: string) {
  const row = wrapper
    .findAll('label.preset')
    .find((candidate) => candidate.text().includes(name));
  if (!row) {
    throw new Error(`No preset row named ${name}`);
  }
  return row.trigger('click');
}

/**
 * The rule number a drawer row shows, read back off the `2.` label the row
 * renders. Reading it from the rendering rather than from a `data-` attribute
 * added for the tests keeps every rule assertion below on what the user sees —
 * at the price of one place that knows the label's punctuation, which is why
 * it is one place.
 */
function ruleIdOf(row: DOMWrapper<Element>): number {
  return Number(row.findAll('span')[0]!.text().replace('.', ''));
}

/** A rule row in the drawer, found by the rule number it renders. */
function ruleRow(wrapper: Wrapper, id: number) {
  const row = wrapper
    .findAll('label.rule')
    .find((candidate) => ruleIdOf(candidate) === id);
  if (!row) {
    throw new Error(`No rule row for rule ${id}`);
  }
  return row;
}

/** Which rules the drawer shows as enabled, in the order it lists them. */
function checkedRuleIds(wrapper: Wrapper): number[] {
  return wrapper
    .findAll('label.rule')
    .filter(
      (row) =>
        (row.get('input[type="checkbox"]').element as HTMLInputElement).checked,
    )
    .map(ruleIdOf);
}

function toggleRule(wrapper: Wrapper, id: number) {
  const checkbox = ruleRow(wrapper, id).get('input[type="checkbox"]');
  return checkbox.setValue(!(checkbox.element as HTMLInputElement).checked);
}

/** Mount the app with a raw transcript already pasted in. */
async function mountWithRaw(raw = RAW): Promise<Wrapper> {
  const wrapper = mountApp();
  await typeInto(wrapper, 'Raw transcript', raw);
  return wrapper;
}

/** Mount the app and run level 1 — the starting point of most cases below. */
async function mountReflowed(raw = RAW): Promise<Wrapper> {
  const wrapper = await mountWithRaw(raw);
  await button(wrapper, 'Reflow').trigger('click');
  return wrapper;
}

/** Mount the app and run both stages. */
async function mountCleaned(raw = RAW): Promise<Wrapper> {
  const wrapper = await mountReflowed(raw);
  await button(wrapper, 'Apply rules').trigger('click');
  return wrapper;
}

describe('the App gate', () => {
  it('disables Reflow while the raw pane is empty', () => {
    expect(button(mountApp(), 'Reflow').attributes('disabled')).toBeDefined();
  });

  it('keeps Reflow disabled for whitespace alone', async () => {
    // The gate is `raw.trim()`, not `raw`: a pane holding only newlines has
    // nothing to reflow, and level 1 would answer with an empty string.
    const wrapper = await mountWithRaw('  \n\n  ');

    expect(button(wrapper, 'Reflow').attributes('disabled')).toBeDefined();
  });

  it('enables Reflow once the raw pane holds text', async () => {
    const wrapper = await mountWithRaw();

    expect(button(wrapper, 'Reflow').attributes('disabled')).toBeUndefined();
  });

  it('disables Apply rules until level 1 has run, and says why', async () => {
    // The Q13b gate. Level 2 reads the reflowed pane, so it cannot run before
    // anything has filled it, and the title is the only explanation the
    // disabled button offers.
    const wrapper = await mountWithRaw();
    const applyRules = button(wrapper, 'Apply rules');

    expect(applyRules.attributes('disabled')).toBeDefined();
    expect(applyRules.attributes('title')).toBe('Level 1 must run first');
  });

  it('enables Apply rules after a reflow and drops the explanation', async () => {
    const wrapper = await mountReflowed();
    const applyRules = button(wrapper, 'Apply rules');

    expect(applyRules.attributes('disabled')).toBeUndefined();
    expect(applyRules.attributes('title')).toBeUndefined();
  });

  it('locks the reflowed pane until level 1 has run', async () => {
    const wrapper = await mountWithRaw();

    expect(badge(wrapper, 'Reflowed transcript')).toBe('locked');
  });

  it('locks the cleaned pane until level 2 has run', async () => {
    // The cleaned pane's lock keys on its own emptiness rather than on a
    // `ranLevel2` flag, so running level 1 must not unlock it.
    const wrapper = await mountReflowed();

    expect(badge(wrapper, 'Cleaned transcript')).toBe('locked');
  });
});

describe('the App stages', () => {
  it('fills the reflowed pane from the raw pane', async () => {
    const wrapper = await mountReflowed();

    expect(paneText(wrapper, 'Reflowed transcript')).toBe(REFLOWED);
    expect(badge(wrapper, 'Reflowed transcript')).toBe('current');
  });

  it('fills the cleaned pane from the reflowed pane', async () => {
    const wrapper = await mountCleaned();

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(CLEANED);
    expect(badge(wrapper, 'Cleaned transcript')).toBe('current');
  });

  it('leaves the raw pane untouched by either stage', async () => {
    const wrapper = await mountCleaned();

    expect(paneText(wrapper, 'Raw transcript')).toBe(RAW);
  });

  it('applies the rules to the reflowed pane as it stands, not to a fresh level-1 run', async () => {
    // Q13b's repair point. Level 2 must read what is in the middle pane,
    // hand edits included; re-running level 1 here would silently discard
    // them, and the cleaned text is the only place that would show it.
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Reflowed transcript', 'A hand-repaired paragraph.');
    await button(wrapper, 'Apply rules').trigger('click');

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(
      'A hand-repaired paragraph.',
    );
  });

  it('re-reflows from the edited raw pane', async () => {
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Raw transcript', 'A replacement transcript.');
    await button(wrapper, 'Reflow').trigger('click');

    expect(paneText(wrapper, 'Reflowed transcript')).toBe(
      'A replacement transcript.',
    );
  });
});

describe('the App stale propagation', () => {
  it('marks the reflowed pane stale when the raw pane is edited', async () => {
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Raw transcript', `${RAW}\nA later thought.`);

    expect(badge(wrapper, 'Reflowed transcript')).toBe('stale — re-run');
  });

  it('keeps the reflowed text while it is stale', async () => {
    // The half of Q13b that is easiest to lose: an upstream edit marks, it
    // never clears. The reflowed pane holds the user's hand repairs until they
    // choose to re-run, and re-running is their decision to discard them.
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Raw transcript', 'A replacement transcript.');

    expect(paneText(wrapper, 'Reflowed transcript')).toBe(REFLOWED);
  });

  it('leaves the reflowed pane locked when the raw pane is edited before any reflow', async () => {
    // A stage that has never run cannot be out of date, so an edit before the
    // first reflow has nothing downstream to mark.
    const wrapper = await mountWithRaw();

    await typeInto(wrapper, 'Raw transcript', `${RAW}\nA later thought.`);

    expect(badge(wrapper, 'Reflowed transcript')).toBe('locked');
  });

  it('marks both downstream panes stale on one raw edit', async () => {
    // The two flags are set by the same handler, and this is the case a user
    // actually hits: everything has run, then the raw pane changes. Asserted
    // together rather than in two scenarios so a handler that sets one and
    // forgets the other fails here, not only by inference from two passes.
    const wrapper = await mountCleaned();

    await typeInto(wrapper, 'Raw transcript', `${RAW}\nA later thought.`);

    expect(badge(wrapper, 'Reflowed transcript')).toBe('stale — re-run');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
    expect(paneText(wrapper, 'Cleaned transcript')).toBe(CLEANED);
  });

  it('marks the cleaned pane stale when the reflowed pane is edited', async () => {
    // The middle pane is editable, which makes it an upstream of its own.
    const wrapper = await mountCleaned();

    await typeInto(wrapper, 'Reflowed transcript', 'A hand-repaired paragraph.');

    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });

  it('marks the cleaned pane stale when level 1 is re-run', async () => {
    const wrapper = await mountCleaned();

    await button(wrapper, 'Reflow').trigger('click');

    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });

  it('leaves an empty cleaned pane locked rather than stale', async () => {
    // A stage that has produced nothing is not out of date, it has simply not
    // run. `markCleanedStale` says so by guarding on the pane holding
    // something, and the pane says so by locking on the same emptiness — the
    // second is what a test can see, so a lost guard would not show up here.
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Raw transcript', 'A replacement transcript.');

    expect(badge(wrapper, 'Cleaned transcript')).toBe('locked');
  });
});

describe('the App clearing of stale', () => {
  it('clears the reflowed badge when level 1 is re-run', async () => {
    const wrapper = await mountReflowed();
    await typeInto(wrapper, 'Raw transcript', 'A replacement transcript.');

    await button(wrapper, 'Reflow').trigger('click');

    expect(badge(wrapper, 'Reflowed transcript')).toBe('current');
  });

  it('clears the cleaned badge when level 2 is re-run', async () => {
    const wrapper = await mountCleaned();
    await typeInto(wrapper, 'Reflowed transcript', 'A hand-repaired paragraph.');

    await button(wrapper, 'Apply rules').trigger('click');

    expect(badge(wrapper, 'Cleaned transcript')).toBe('current');
  });

  it('does not clear the cleaned badge when only level 1 is re-run', async () => {
    // Re-running the upstream stage cannot make the downstream one current
    // again — it is one more upstream change.
    const wrapper = await mountCleaned();
    await typeInto(wrapper, 'Raw transcript', 'A replacement transcript.');

    await button(wrapper, 'Reflow').trigger('click');

    expect(badge(wrapper, 'Reflowed transcript')).toBe('current');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });
});

describe('the App rules drawer', () => {
  it('opens on the toolbar chip and closes again', async () => {
    const wrapper = mountApp();
    expect(wrapper.find('label.rule').exists()).toBe(false);

    await openDrawer(wrapper);
    expect(wrapper.findAll('label.rule')).toHaveLength(11);

    await wrapper.get('button[aria-label="Close"]').trigger('click');
    expect(wrapper.find('label.rule').exists()).toBe(false);
  });

  it('starts on the default preset with every rule on', async () => {
    const wrapper = mountApp();

    expect(chip(wrapper).text()).toContain('COGE (English)');
    expect(chip(wrapper).text()).toContain('11/11 rules');

    await openDrawer(wrapper);
    expect(checkedRuleIds(wrapper)).toHaveLength(11);
  });
});

describe('the App preset choice', () => {
  it('replaces the enabled rules with the preset it is given', async () => {
    // Replaces rather than merges: Universal is the three language-agnostic
    // rules, so picking it has to turn the eight English ones off.
    const wrapper = mountApp();
    await openDrawer(wrapper);

    await pickPreset(wrapper, 'Universal (any language)');

    expect(checkedRuleIds(wrapper).sort((a, b) => a - b)).toEqual([3, 5, 9]);
    expect(chip(wrapper).text()).toContain('Universal (any language)');
    expect(chip(wrapper).text()).toContain('3/11 rules');
  });

  it('restores the full set when the default preset is picked back', async () => {
    const wrapper = mountApp();
    await openDrawer(wrapper);
    await pickPreset(wrapper, 'Universal (any language)');

    await pickPreset(wrapper, 'COGE (English)');

    expect(checkedRuleIds(wrapper)).toHaveLength(11);
  });

  it('marks the cleaned pane stale', async () => {
    const wrapper = await mountCleaned();
    await openDrawer(wrapper);

    await pickPreset(wrapper, 'Universal (any language)');

    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });

  it('changes what Apply rules produces', async () => {
    // The assertion that proves the enabled ids reach the pipeline at all.
    // Everything above would still pass if a preset only ever moved the chip
    // and the checkboxes.
    const wrapper = await mountCleaned();
    await openDrawer(wrapper);
    await pickPreset(wrapper, 'Universal (any language)');

    await button(wrapper, 'Apply rules').trigger('click');

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(
      CLEANED_WITHOUT_RULE_2,
    );
  });
});

describe('the App rule toggles', () => {
  it('turns off the rule it is given and no other', async () => {
    const wrapper = mountApp();
    await openDrawer(wrapper);

    await toggleRule(wrapper, 2);

    expect(checkedRuleIds(wrapper)).not.toContain(2);
    expect(checkedRuleIds(wrapper)).toHaveLength(10);
    expect(chip(wrapper).text()).toContain('10/11 rules');
  });

  it('turns a rule back on', async () => {
    const wrapper = mountApp();
    await openDrawer(wrapper);
    await toggleRule(wrapper, 2);

    await toggleRule(wrapper, 2);

    expect(checkedRuleIds(wrapper)).toContain(2);
    expect(checkedRuleIds(wrapper)).toHaveLength(11);
  });

  it('leaves the preset name alone', async () => {
    // Unticking a rule does not move the user off the preset they started
    // from (Q12): the preset chooses the starting set, the checkboxes trim it.
    const wrapper = mountApp();
    await openDrawer(wrapper);

    await toggleRule(wrapper, 2);

    expect(chip(wrapper).text()).toContain('COGE (English)');
  });

  it('marks the cleaned pane stale', async () => {
    const wrapper = await mountCleaned();
    await openDrawer(wrapper);

    await toggleRule(wrapper, 2);

    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });

  it('changes what Apply rules produces', async () => {
    const wrapper = await mountCleaned();
    await openDrawer(wrapper);
    await toggleRule(wrapper, 2);

    await button(wrapper, 'Apply rules').trigger('click');

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(
      CLEANED_WITHOUT_RULE_2,
    );
  });
});

describe('the App raw pane Vibe link', () => {
  /** The raw pane's muted subtitle span, where issue #21 puts the link. */
  function rawSub(wrapper: Wrapper) {
    return pane(wrapper, 'Raw transcript').get('header .text-muted');
  }

  /** The `from Vibe` anchor inside that subtitle. */
  function rawLink(wrapper: Wrapper) {
    return rawSub(wrapper).get('a');
  }

  it('reads "paste from Vibe" with only "from Vibe" carrying the link', () => {
    // The `paste ` half stays text and only `from Vibe` is the anchor, so the
    // authored space between them has to survive into the rendered subtitle.
    const sub = rawSub(mountApp());

    expect(sub.text()).toBe('paste from Vibe');
    expect(sub.get('a').text()).toBe('from Vibe');
  });

  it('points the link at the pinned v3.0.23 release and opens it safely', () => {
    const link = rawLink(mountApp());

    expect(link.attributes('href')).toBe(
      'https://github.com/thewh1teagle/vibe/releases/tag/v3.0.23',
    );
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });

  it('explains the pinned version in a native tooltip', () => {
    // Why 3.0.23 and not the newer 3.1.x line — the reason a bare link cannot
    // carry, so it goes in the `title`.
    const title = rawLink(mountApp()).attributes('title');

    expect(title).toMatch(/3\.0\.23/);
    expect(title).toMatch(/3\.1/);
  });

  it('leaves the other two panes on their plain-string subtitles', () => {
    // Issue #21 fills the `#sub` slot for the raw pane only; the reflowed and
    // cleaned panes keep passing `sub` as a string and grow no anchor.
    const wrapper = mountApp();

    const reflowed = pane(wrapper, 'Reflowed transcript');
    expect(reflowed.get('header .text-muted').text()).toBe('level 1 · editable');
    expect(reflowed.find('header a').exists()).toBe(false);

    const cleaned = pane(wrapper, 'Cleaned transcript');
    expect(cleaned.get('header .text-muted').text()).toBe('level 2 · read-only');
    expect(cleaned.find('header a').exists()).toBe(false);
  });
});
