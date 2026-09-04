import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TranscriptPane from '../src/components/TranscriptPane.vue';

/**
 * `TranscriptPane` (issue #23). The badge is the load-bearing part of the
 * design: Q13b settled that an upstream edit marks downstream **stale** rather
 * than clearing it, so the badge is the only thing telling the reader that what
 * they are looking at no longer came from what is above it. Its precedence is a
 * small state machine, and a state machine nobody asserts is a state machine
 * that quietly changes.
 *
 * The styling assertions here name classes, not computed styles: the web
 * package's Vitest config deliberately leaves Tailwind out (issue #22), so a
 * class is what a test in this suite can honestly observe.
 */

type Props = InstanceType<typeof TranscriptPane>['$props'];

function mountPane(props: Partial<Props> = {}, slots?: Record<string, string>) {
  return mount(TranscriptPane, {
    props: { title: 'Reflowed transcript', modelValue: '', ...props },
    ...(slots ? { slots } : {}),
  });
}

/**
 * The badge span. A pane showing no badge gives back a wrapper whose
 * `exists()` is false rather than nothing at all, which is what the empty-pane
 * test asserts on.
 */
function badge(wrapper: ReturnType<typeof mountPane>) {
  return wrapper.find('header .badge');
}

/**
 * The subtitle span, found by its styling rather than its position in the
 * header. The badge is a header span too, so a positional selector would
 * silently retarget — and keep passing — if the header were ever reordered.
 */
function subtitle(wrapper: ReturnType<typeof mountPane>) {
  return wrapper.get('header .text-muted');
}

describe('the TranscriptPane badge', () => {
  it('shows nothing on an empty, unlocked pane', () => {
    // The starting state of every pane below the raw one, before anything has
    // been produced and before anything can be stale.
    expect(badge(mountPane({ modelValue: '' })).exists()).toBe(false);
  });

  it('shows `current` once the pane holds a value', () => {
    const badgeEl = badge(mountPane({ modelValue: 'A paragraph.' }));

    expect(badgeEl.text()).toBe('current');
    expect(badgeEl.classes()).toContain('badge-ok');
  });

  it('shows `stale` over a value, and still shows the value', () => {
    // The Q13b case in full: the pane says the content is old *and* keeps
    // showing it. Asserting only the badge would leave the half of the
    // decision that matters — that nothing was cleared — unpinned.
    const wrapper = mountPane({ modelValue: 'A paragraph.', stale: true });
    const badgeEl = badge(wrapper);

    expect(badgeEl.text()).toBe('stale — re-run');
    expect(wrapper.get('textarea').element.value).toBe('A paragraph.');
    // The bare `.badge` class is the warn styling; `stale` takes no variant.
    expect(badgeEl.classes()).not.toContain('badge-ok');
    expect(badgeEl.classes()).not.toContain('badge-lock');
  });

  it('shows `stale` on a pane that has been emptied but not re-run', () => {
    // Follows from the precedence above rather than from a rule of its own:
    // `stale` is checked before the value is, so an emptied pane still asks
    // to be re-run instead of falling back to the no-badge state.
    expect(badge(mountPane({ modelValue: '', stale: true })).text()).toBe(
      'stale — re-run',
    );
  });

  it('shows `locked` over both `stale` and a value', () => {
    // A stage that has never run cannot meaningfully be stale, so `locked`
    // wins whatever else is set.
    const badgeEl = badge(
      mountPane({ modelValue: 'A paragraph.', stale: true, locked: true }),
    );

    expect(badgeEl.text()).toBe('locked');
    expect(badgeEl.classes()).toContain('badge-lock');
  });
});

describe('the TranscriptPane styling', () => {
  /**
   * issue #33: locking used to dim the whole section with `opacity`, which
   * fades text and background together and fails WCAG contrast once both
   * drift toward the page colour. `bg-panel-locked` is a solid stand-in
   * chosen to keep the same "not ready yet" look without touching opacity.
   */
  it('gives a locked section the locked background, not a dimmed one', () => {
    const classes = mountPane({ locked: true }).classes();

    expect(classes).toContain('bg-panel-locked');
    expect(classes).not.toContain('opacity-55');
  });

  it('leaves an unlocked section on the normal panel background', () => {
    const classes = mountPane({ locked: false }).classes();

    expect(classes).toContain('bg-panel');
    expect(classes).not.toContain('bg-panel-locked');
  });

  it('gives a locked header the locked head background', () => {
    const wrapper = mountPane({ locked: true });

    expect(wrapper.get('header').classes()).toContain('bg-panel-head-locked');
  });

  it('leaves an unlocked header on the normal head background', () => {
    const wrapper = mountPane({ locked: false });

    expect(wrapper.get('header').classes()).toContain('bg-panel-head');
  });

  it('mutes the textarea of a stale pane', () => {
    // The visual half of the stale badge: the text is greyed rather than
    // removed, so it reads as superseded instead of as absent.
    const classes = mountPane({
      modelValue: 'A paragraph.',
      stale: true,
    })
      .get('textarea')
      .classes();

    expect(classes).toContain('bg-[#fbfaf5]');
    expect(classes).toContain('text-[#8b8b84]');
  });

  it('greys the textarea of a locked pane', () => {
    // The counterpart to the dimmed section, and the visual half of the
    // `locked` badge. A pane that is locked *and* stale emits both background
    // classes, and which one wins is decided by stylesheet order — something a
    // suite that never computes styles cannot observe. So that combination is
    // asserted on the badge, where the precedence is decided in code, and
    // deliberately not here.
    expect(mountPane({ locked: true }).get('textarea').classes()).toContain(
      'bg-[#f4f4f0]',
    );
  });

  it('leaves a current textarea transparent', () => {
    const classes = mountPane({ modelValue: 'A paragraph.' })
      .get('textarea')
      .classes();

    expect(classes).toContain('bg-transparent');
    expect(classes).not.toContain('text-[#8b8b84]');
  });
});

describe('the TranscriptPane textarea', () => {
  it('is editable by default', () => {
    const textarea = mountPane().get('textarea').element;

    expect(textarea.readOnly).toBe(false);
  });

  it('passes `readonly` through to the textarea', () => {
    // The cleaned pane is read-only: it is output, and editing it would have
    // nowhere to go.
    const textarea = mountPane({ readonly: true }).get('textarea').element;

    expect(textarea.readOnly).toBe(true);
  });

  it('emits `update:modelValue` with what was typed', async () => {
    const wrapper = mountPane({ modelValue: 'before' });

    await wrapper.get('textarea').setValue('after');

    expect(wrapper.emitted('update:modelValue')).toEqual([['after']]);
  });

  it('shows the placeholder and the value it is given', () => {
    const textarea = mountPane({
      modelValue: 'A paragraph.',
      placeholder: 'Paste a transcript here',
    }).get('textarea');

    expect(textarea.element.value).toBe('A paragraph.');
    expect(textarea.attributes('placeholder')).toBe('Paste a transcript here');
  });

  it('names itself for assistive tech from the title, not the visible header text alone', () => {
    // issue #33: the title is a plain `<span>`, not a `<label>`, so without
    // this the textarea has no accessible name at all.
    const textarea = mountPane({ title: 'Cleaned transcript' }).get('textarea');

    expect(textarea.attributes('aria-label')).toBe('Cleaned transcript');
  });
});

describe('the TranscriptPane subtitle', () => {
  it('renders the `sub` prop as text', () => {
    expect(subtitle(mountPane({ sub: 'level 1 · editable' })).text()).toBe(
      'level 1 · editable',
    );
  });

  it('renders no subtitle text when the prop is absent', () => {
    expect(subtitle(mountPane()).text()).toBe('');
  });

  it('lets the `sub` slot replace the prop', () => {
    // The slot exists so a pane can put a link in its subtitle. Passing the
    // prop as well is the point: the slot has to replace it, not render beside
    // it. Finding the anchor *inside* the muted span is also what proves the
    // styling stays on the wrapper, so slot content cannot drift from the
    // plain-string panes.
    const wrapper = mountPane(
      { sub: 'paste from Vibe' },
      { sub: '<a href="https://example.invalid">Vibe</a>' },
    );
    const sub = subtitle(wrapper);

    expect(sub.text()).toBe('Vibe');
    expect(sub.get('a').attributes('href')).toBe('https://example.invalid');
  });
});
