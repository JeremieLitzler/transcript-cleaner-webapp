import { type DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.vue';

/**
 * `App.vue` — the wiring between the toolbar, the rules drawer and the
 * `useTranscriptStages` / `useRuleSelection` composables (issues #24, #40,
 * #41, #44), and the copy buttons it places in two of the panes (issues #76,
 * #77).
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

describe('the App copy buttons', () => {
  // Issues #76 and #77 pin the whole copy behaviour at this seam, not in a
  // `CopyButton` suite: which text a button copies is what `App.vue` wires
  // in. Success uses happy-dom's real clipboard, read back; a refusal is a spy.
  /** A pane's copy button; `exists()` is false on a pane without one. */
  function copyButton(wrapper: Wrapper, title: string) {
    return pane(wrapper, title).find('header button');
  }

  /** The button's visible label, which swaps while its name stays put. */
  function copyLabel(wrapper: Wrapper, title: string): string {
    return copyButton(wrapper, title).text();
  }

  function copyDisabled(wrapper: Wrapper, title: string): boolean {
    return copyButton(wrapper, title).attributes('disabled') !== undefined;
  }

  /** The pane's copy announcement region, which must exist before it speaks. */
  function liveRegion(wrapper: Wrapper, title: string) {
    return pane(wrapper, title).get('header [aria-live="polite"]');
  }

  /** `writeText` is async, so the label only changes once it has settled. */
  async function copy(wrapper: Wrapper, title: string) {
    await copyButton(wrapper, title).trigger('click');
    await flushPromises();
  }

  // happy-dom's clipboard outlives a test; a leftover could pass a read-back.
  beforeEach(() => navigator.clipboard.writeText(''));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('puts a Copy button in the reflowed and cleaned pane headers, and none in the raw pane', () => {
    // Copy takes a stage's result; the raw transcript is the input.
    const wrapper = mountApp();

    expect(copyButton(wrapper, 'Raw transcript').exists()).toBe(false);
    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy');
    expect(copyLabel(wrapper, 'Cleaned transcript')).toBe('Copy');
  });

  it('disables both buttons before any stage has run', () => {
    const wrapper = mountApp();

    expect(copyDisabled(wrapper, 'Reflowed transcript')).toBe(true);
    expect(copyDisabled(wrapper, 'Cleaned transcript')).toBe(true);
  });

  it('enables the reflowed button once level 1 has run, and keeps the cleaned one disabled until level 2 has', async () => {
    const wrapper = await mountReflowed();

    expect(copyDisabled(wrapper, 'Reflowed transcript')).toBe(false);
    expect(copyDisabled(wrapper, 'Cleaned transcript')).toBe(true);

    await button(wrapper, 'Apply rules').trigger('click');

    expect(copyDisabled(wrapper, 'Cleaned transcript')).toBe(false);
  });

  it('keeps a stale pane copyable', async () => {
    // Q13b keeps stale text on screen because it is the only copy the user
    // has until they re-run; refusing to let it be taken would defeat that.
    const wrapper = await mountCleaned();
    await typeInto(wrapper, 'Raw transcript', `${RAW}
A later thought.`);
    await typeInto(wrapper, 'Reflowed transcript', 'A hand-repaired paragraph.');
    await typeInto(wrapper, 'Raw transcript', `${RAW}
Yet another thought.`);

    expect(badge(wrapper, 'Reflowed transcript')).toBe('stale — re-run');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
    expect(copyDisabled(wrapper, 'Reflowed transcript')).toBe(false);
    expect(copyDisabled(wrapper, 'Cleaned transcript')).toBe(false);
  });

  it('disables the reflowed button again once that pane is emptied by hand', async () => {
    const wrapper = await mountReflowed();

    await typeInto(wrapper, 'Reflowed transcript', '');

    expect(copyDisabled(wrapper, 'Reflowed transcript')).toBe(true);
  });

  it('names each button after its pane', () => {
    // Two buttons both called "Copy" are indistinguishable to a screen reader,
    // so each carries its pane in its name, as the textarea already does.
    const wrapper = mountApp();

    expect(
      copyButton(wrapper, 'Reflowed transcript').attributes('aria-label'),
    ).toBe('Copy reflowed transcript');
    expect(
      copyButton(wrapper, 'Cleaned transcript').attributes('aria-label'),
    ).toBe('Copy cleaned transcript');
  });

  it('sits in the right-hand group of the pane header, after the status badge', async () => {
    // The badge is a readout and the button a control; the control comes last.
    const wrapper = await mountCleaned();

    for (const title of ['Reflowed transcript', 'Cleaned transcript']) {
      const group = pane(wrapper, title).get('header .ml-auto');
      const badgeElement = group.get('.badge').element;
      const buttonElement = group.get('button').element;

      expect(
        badgeElement.compareDocumentPosition(buttonElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('puts the exact text of each pane on the clipboard', async () => {
    const wrapper = await mountCleaned();

    await copy(wrapper, 'Reflowed transcript');
    expect(await navigator.clipboard.readText()).toBe(REFLOWED);

    await copy(wrapper, 'Cleaned transcript');
    expect(await navigator.clipboard.readText()).toBe(CLEANED);
  });

  it('copies a hand edit in the reflowed pane as it stands', async () => {
    // The reflowed pane is the repair point (Q13b), so what is on screen is
    // what leaves — not a fresh level-1 run.
    const wrapper = await mountReflowed();
    const edited = `${REFLOWED}

A hand-added paragraph.  `;
    await typeInto(wrapper, 'Reflowed transcript', edited);

    await copy(wrapper, 'Reflowed transcript');

    expect(await navigator.clipboard.readText()).toBe(edited);
  });

  it('confirms a copy on its own label for 1500 ms, then reverts', async () => {
    vi.useFakeTimers();
    const wrapper = await mountReflowed();

    await copy(wrapper, 'Reflowed transcript');
    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copied');

    await vi.advanceTimersByTimeAsync(1499);
    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copied');

    await vi.advanceTimersByTimeAsync(1);
    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy');
  });

  it('restarts the full 1500 ms when a second copy lands before the first expires', async () => {
    vi.useFakeTimers();
    const wrapper = await mountReflowed();

    await copy(wrapper, 'Reflowed transcript');
    await vi.advanceTimersByTimeAsync(1000);
    await copy(wrapper, 'Reflowed transcript');

    await vi.advanceTimersByTimeAsync(1499);
    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copied');

    await vi.advanceTimersByTimeAsync(1);
    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy');
  });

  it('keeps the accessible name while the visible label swaps', async () => {
    // "Copied" is status, not name; the live region is what announces it.
    const wrapper = await mountReflowed();

    await copy(wrapper, 'Reflowed transcript');

    expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copied');
    expect(
      copyButton(wrapper, 'Reflowed transcript').attributes('aria-label'),
    ).toBe('Copy reflowed transcript');
  });

  it('never changes the status badge', async () => {
    // A copy is not a pane state; the badge stays the composable's alone.
    const wrapper = await mountCleaned();

    await copy(wrapper, 'Reflowed transcript');
    await copy(wrapper, 'Cleaned transcript');

    expect(badge(wrapper, 'Reflowed transcript')).toBe('current');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('current');

    await typeInto(wrapper, 'Raw transcript', `${RAW}
A later thought.`);
    await copy(wrapper, 'Reflowed transcript');
    await copy(wrapper, 'Cleaned transcript');

    expect(badge(wrapper, 'Reflowed transcript')).toBe('stale — re-run');
    expect(badge(wrapper, 'Cleaned transcript')).toBe('stale — re-run');
  });

  it('keeps a visually-hidden live region in both panes, empty at rest', () => {
    // Rendered before it has anything to say: a region that appears together
    // with its text is not reliably announced.
    const wrapper = mountApp();

    for (const title of ['Reflowed transcript', 'Cleaned transcript']) {
      const region = liveRegion(wrapper, title);
      expect(region.text()).toBe('');
      expect(region.classes()).toContain('sr-only');
    }
  });

  it('announces "Copied" in the live region, and clears it with the label', async () => {
    vi.useFakeTimers();
    const wrapper = await mountCleaned();

    await copy(wrapper, 'Cleaned transcript');
    expect(liveRegion(wrapper, 'Cleaned transcript').text()).toBe('Copied');
    expect(liveRegion(wrapper, 'Reflowed transcript').text()).toBe('');

    await vi.advanceTimersByTimeAsync(1500);
    expect(liveRegion(wrapper, 'Cleaned transcript').text()).toBe('');
  });

  it('uses the pane-control shape and the focus-visible outline of the header link', () => {
    // `.btn-pane` carries the rectangle and the min-width that fits "Copy
    // failed"; the outline utilities match the Vibe link's (issue #33).
    const classes = copyButton(mountApp(), 'Reflowed transcript').classes();

    expect(classes).toContain('btn-pane');
    expect(classes).toEqual(
      expect.arrayContaining([
        'focus-visible:outline',
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-accent',
      ]),
    );
  });

  describe('when the browser refuses the write', () => {
    // Issue #77. happy-dom grants every permission, so a refusal is made on
    // purpose; the spy is the only test-only thing, and `afterEach` restores it.

    /** What a browser rejects `writeText` with when it refuses the write. */
    function refusal() {
      return new DOMException('Denied', 'NotAllowedError');
    }

    /** Refuse every write until `afterEach` restores the real clipboard. */
    function refuse() {
      return vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValue(refusal());
    }

    it('says "Copy failed" on the label and in the live region, and nowhere else', async () => {
      const wrapper = await mountReflowed();
      refuse();

      await copy(wrapper, 'Reflowed transcript');

      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy failed');
      expect(liveRegion(wrapper, 'Reflowed transcript').text()).toBe(
        'Copy failed',
      );
      // Once on the label, once in the live region.
      expect(wrapper.html().match(/Copy failed/g)).toHaveLength(2);
    });

    it('keeps "Copy failed" well past the 1500 ms that "Copied" gets', async () => {
      // A failure is silent everywhere else, so it waits for the user (Q7).
      vi.useFakeTimers();
      const wrapper = await mountReflowed();
      refuse();

      await copy(wrapper, 'Reflowed transcript');
      await vi.advanceTimersByTimeAsync(1500);
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy failed');

      await vi.advanceTimersByTimeAsync(60_000);
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy failed');
    });

    it('is not cleared by the reset of an earlier success', async () => {
      vi.useFakeTimers();
      const wrapper = await mountReflowed();

      await copy(wrapper, 'Reflowed transcript');
      await vi.advanceTimersByTimeAsync(1000);
      refuse();
      await copy(wrapper, 'Reflowed transcript');
      await vi.advanceTimersByTimeAsync(1500);

      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy failed');
    });

    it('clears as soon as the next attempt starts', async () => {
      // Clearing first also lets a second refusal be announced afresh.
      const wrapper = await mountReflowed();
      const writeText = refuse();
      await copy(wrapper, 'Reflowed transcript');
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy failed');

      // The retry's write stays pending until the test refuses it.
      let refuseRetry: (reason: unknown) => void = () => {};
      writeText.mockImplementationOnce(
        () => new Promise<void>((_, reject) => (refuseRetry = reject)),
      );
      await copyButton(wrapper, 'Reflowed transcript').trigger('click');
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy');
      expect(liveRegion(wrapper, 'Reflowed transcript').text()).toBe('');

      refuseRetry(refusal());
      await flushPromises();
      expect(liveRegion(wrapper, 'Reflowed transcript').text()).toBe(
        'Copy failed',
      );
    });

    it('gives way to "Copied" on a successful retry, which resets as usual', async () => {
      vi.useFakeTimers();
      const wrapper = await mountReflowed();
      // Refused once, then the spy falls through to happy-dom's real clipboard.
      vi.spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValueOnce(refusal());

      await copy(wrapper, 'Reflowed transcript');
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy failed');

      await copy(wrapper, 'Reflowed transcript');
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copied');
      expect(await navigator.clipboard.readText()).toBe(REFLOWED);

      await vi.advanceTimersByTimeAsync(1500);
      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy');
    });

    it('clears when the pane text changes', async () => {
      const wrapper = await mountReflowed();
      refuse();
      await copy(wrapper, 'Reflowed transcript');

      await typeInto(wrapper, 'Reflowed transcript', 'A hand-repaired paragraph.');

      expect(copyLabel(wrapper, 'Reflowed transcript')).toBe('Copy');
      expect(liveRegion(wrapper, 'Reflowed transcript').text()).toBe('');
    });

    it('never changes the status badge', async () => {
      const wrapper = await mountCleaned();
      refuse();

      await copy(wrapper, 'Reflowed transcript');
      await copy(wrapper, 'Cleaned transcript');

      expect(badge(wrapper, 'Reflowed transcript')).toBe('current');
      expect(badge(wrapper, 'Cleaned transcript')).toBe('current');
    });
  });
});
