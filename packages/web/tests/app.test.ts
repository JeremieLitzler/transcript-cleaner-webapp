import { type DOMWrapper, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../src/App.vue';

/**
 * `App.vue` — the wiring between the toolbar, the rules drawer and the
 * `useTranscriptStages` / `useRuleSelection` composables (issues #24, #40,
 * #41, #44).
 *
 * The stage gate, the stale propagation and the clearing are
 * `useTranscriptStages`'s behaviour, pinned in `use-transcript-stages.test.ts`.
 * The preset-replace and toggle-trim behaviour is `useRuleSelection`'s, pinned
 * in `use-rule-selection.test.ts`. What stays here is what only a mounted
 * `App.vue` can prove: that a button, textarea or drawer click is actually
 * wired to the composable action behind it, and that the page's structure and
 * accessibility affordances are in place.
 *
 * Everything below goes through the rendered buttons, textareas and checkboxes
 * rather than the component's internals. A rewiring that leaves the composable
 * correct but stops the button reaching it is exactly the regression this suite
 * exists to catch.
 *
 * The badge wording asserted here belongs to `TranscriptPane` and is pinned by
 * `transcript-pane.test.ts`. It is read here as the pane's observable state —
 * `locked`, `current`, `stale — re-run` — because the props behind it are what
 * `App.vue` wires from the composable.
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
 * unticked by hand. The second paragraph survives the join. Rule 3 stays on
 * either way but leaves it alone: it opens with "and", which the spec prose
 * excludes (L2-R03-02). The result is the reflowed text unchanged, which still
 * differs from the default preset's single joined paragraph — a rule set that
 * produced `CLEANED` would prove nothing about the wiring.
 */
const CLEANED_WITHOUT_RULE_2 =
  'This is the first line of a paragraph.\n\nand the second paragraph follows.';

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

describe('the App toolbar wiring', () => {
  it('binds Reflow to the raw-pane gate', async () => {
    // `:disabled="!canRunLevel1"`. The gate's own edges — whitespace, an empty
    // string — are the composable's, pinned in use-transcript-stages.test.ts;
    // here the point is only that the button reads it.
    expect(button(mountApp(), 'Reflow').attributes('disabled')).toBeDefined();

    const wrapper = await mountWithRaw();
    expect(button(wrapper, 'Reflow').attributes('disabled')).toBeUndefined();
  });

  it('runs level 1 from the raw pane into the reflowed pane', async () => {
    // The Reflow button reaches `runLevel1`, and its result lands in the
    // middle pane.
    const wrapper = await mountReflowed();

    expect(paneText(wrapper, 'Reflowed transcript')).toBe(REFLOWED);
    expect(badge(wrapper, 'Reflowed transcript')).toBe('current');
  });

  it('binds Apply rules to the Q13b gate, and says why it is closed', async () => {
    // `:disabled="!canRunLevel2"` and the `title` that is the only explanation
    // a disabled button offers.
    const before = await mountWithRaw();
    const applyBefore = button(before, 'Apply rules');
    expect(applyBefore.attributes('disabled')).toBeDefined();
    expect(applyBefore.attributes('title')).toBe('Level 1 must run first');

    const after = await mountReflowed();
    const applyAfter = button(after, 'Apply rules');
    expect(applyAfter.attributes('disabled')).toBeUndefined();
    expect(applyAfter.attributes('title')).toBeUndefined();
  });

  it('runs level 2 from the reflowed pane into the cleaned pane', async () => {
    // The Apply rules button reaches `applyRules`, which hands the drawer's
    // rule ids to `runLevel2`.
    const wrapper = await mountCleaned();

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(CLEANED);
    expect(badge(wrapper, 'Cleaned transcript')).toBe('current');
  });
});

describe('the App pane wiring', () => {
  it('routes a raw-pane edit through `editRaw`', async () => {
    // The textarea's `@update:model-value` reaches the composable: the
    // observable proof is the reflowed pane going stale, which only `editRaw`
    // triggers.
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Raw transcript', `${RAW}\nA later thought.`);

    expect(badge(wrapper, 'Reflowed transcript')).toBe('stale — re-run');
  });

  it('routes a reflowed-pane edit through `editReflowed`', async () => {
    const wrapper = await mountCleaned();

    await typeInto(wrapper, 'Reflowed transcript', 'A hand-repaired paragraph.');

    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });

  it('wires the reflowed pane lock to the composable', async () => {
    const wrapper = await mountWithRaw();

    expect(badge(wrapper, 'Reflowed transcript')).toBe('locked');
  });

  it('wires the cleaned pane lock to the composable', async () => {
    // Keyed on the cleaned pane's own emptiness, so running level 1 must not
    // unlock it.
    const wrapper = await mountReflowed();

    expect(badge(wrapper, 'Cleaned transcript')).toBe('locked');
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

describe('the App rule selection wiring', () => {
  // The preset-replace and toggle-trim behaviour itself — that a preset
  // replaces rather than merges, that a toggle trims one rule and leaves the
  // preset name, restoring a preset, toggling back on — is pinned directly
  // against the composable in `use-rule-selection.test.ts`. What only a
  // mounted `App.vue` can prove is that a drawer click actually reaches it,
  // that the wiring to `markCleanedStale` holds, and that the enabled ids
  // this produces are what `runLevel2` receives.

  it('reaches the composable when a preset is picked, marks the cleaned pane stale, and changes what Apply rules produces', async () => {
    const wrapper = await mountCleaned();
    await openDrawer(wrapper);

    await pickPreset(wrapper, 'Universal (any language)');

    expect(checkedRuleIds(wrapper).sort((a, b) => a - b)).toEqual([3, 5, 9]);
    expect(chip(wrapper).text()).toContain('Universal (any language)');
    expect(chip(wrapper).text()).toContain('3/11 rules');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');

    await button(wrapper, 'Apply rules').trigger('click');

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(CLEANED_WITHOUT_RULE_2);
  });

  it('reaches the composable when a rule is toggled, marks the cleaned pane stale, and changes what Apply rules produces', async () => {
    const wrapper = await mountCleaned();
    await openDrawer(wrapper);

    await toggleRule(wrapper, 2);

    expect(checkedRuleIds(wrapper)).not.toContain(2);
    expect(chip(wrapper).text()).toContain('10/11 rules');
    expect(chip(wrapper).text()).toContain('COGE (English)');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');

    await button(wrapper, 'Apply rules').trigger('click');

    expect(paneText(wrapper, 'Cleaned transcript')).toBe(CLEANED_WITHOUT_RULE_2);
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

  it('underlines the link at rest, not only on hover', () => {
    // issue #33: a link told apart from plain text only by colour and only on
    // hover fails WCAG 1.4.1 for anyone who cannot see the colour or is not
    // hovering it. It must read as a link before either applies.
    expect(rawLink(mountApp()).classes()).toContain('underline');
  });

  it('gives the link distinct hover and focus-visible styles', () => {
    // Neither state may be silent, and each must be visually its own —
    // otherwise a keyboard user cannot tell focus from a mouse hover, or from
    // the resting state.
    const classes = rawLink(mountApp()).classes();

    expect(classes).toContain('hover:decoration-2');
    expect(classes).toContain('focus-visible:outline');
  });
});

describe('the App landmarks', () => {
  it('names the page with a heading', () => {
    // Hidden visually — the toolbar has no room for it — but present for
    // assistive tech, and for the "page has an h1" WCAG check (issue #33).
    const h1 = mountApp().get('h1');

    expect(h1.text()).toBe('Transcript Cleaner');
  });

  it('puts the three panes inside a main landmark', () => {
    const wrapper = mountApp();
    const main = wrapper.get('main');

    expect(main.findAll('section')).toHaveLength(3);
  });

  it('offers a skip link to the main landmark, first in the page', () => {
    // The WCAG 2.4.1 bypass block: the very first focusable thing on the
    // page, pointing at the main landmark it skips to.
    const wrapper = mountApp();
    const skipLink = wrapper.get('a.skip-link');

    expect(skipLink.attributes('href')).toBe('#main-content');
    expect(wrapper.get('#main-content').element.tagName).toBe('MAIN');
  });
});
