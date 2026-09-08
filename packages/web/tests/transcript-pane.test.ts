import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TranscriptPane from '../src/components/TranscriptPane.vue';

/**
 * `TranscriptPane` (issue #23). The badge is the load-bearing part of the
 * design: Q13b settled that an upstream edit marks downstream **stale** rather
 * than clearing it, so the badge is the only thing telling the reader that what
 * they are looking at no longer came from what is above it.
 *
 * Since issue #46 the pane derives no state of its own: it renders the
 * `PaneStatus` it is handed, and `useTranscriptStages` owns the
 * `locked > stale > current > none` precedence that picks it. So the cases
 * here are one per `PaneStatus` value — the badge text and variant, or its
 * absence, and the background classes each value re-keys.
 *
 * The styling assertions here name classes, not computed styles: the web
 * package's Vitest config deliberately leaves Tailwind out (issue #22), so a
 * class is what a test in this suite can honestly observe.
 */

type Props = InstanceType<typeof TranscriptPane>['$props'];

function mountPane(props: Partial<Props> = {}, slots?: Record<string, string>) {
  return mount(TranscriptPane, {
    props: {
      title: 'Reflowed transcript',
      modelValue: '',
      status: 'none',
      ...props,
    },
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
  it('shows no badge for `none`', () => {
    // The starting state of every pane below the raw one, and of a reflowed
    // pane emptied by hand after a run: blank, and not an error.
    expect(badge(mountPane({ status: 'none' })).exists()).toBe(false);
  });

  it('shows `current` with the ok variant', () => {
    const badgeEl = badge(mountPane({ status: 'current' }));

    expect(badgeEl.text()).toBe('current');
    expect(badgeEl.classes()).toContain('badge-ok');
  });

  it('shows `stale — re-run` with no variant, and still shows the value', () => {
    // The Q13b case in full: the pane says the content is old *and* keeps
    // showing it. Asserting only the badge would leave the half of the
    // decision that matters — that nothing was cleared — unpinned.
    const wrapper = mountPane({ modelValue: 'A paragraph.', status: 'stale' });
    const badgeEl = badge(wrapper);

    expect(badgeEl.text()).toBe('stale — re-run');
    expect(wrapper.get('textarea').element.value).toBe('A paragraph.');
    // The bare `.badge` class is the warn styling; `stale` takes no variant.
    expect(badgeEl.classes()).not.toContain('badge-ok');
    expect(badgeEl.classes()).not.toContain('badge-lock');
  });

  it('shows `locked` with the lock variant', () => {
    const badgeEl = badge(mountPane({ status: 'locked' }));

    expect(badgeEl.text()).toBe('locked');
    expect(badgeEl.classes()).toContain('badge-lock');
  });

  it('reads the badge from `status` alone, not from the value it holds', () => {
    // `modelValue` is content I/O only: a filled textarea under `none` still
    // shows no badge, and an empty one under `stale` still asks to be re-run.
    // The precedence that would once have derived these lives in the
    // composable now.
    expect(
      badge(mountPane({ modelValue: 'A paragraph.', status: 'none' })).exists(),
    ).toBe(false);
    expect(badge(mountPane({ modelValue: '', status: 'stale' })).text()).toBe(
      'stale — re-run',
    );
  });
});

describe('the TranscriptPane styling', () => {
  /**
   * issue #33: locking used to dim the whole section with `opacity`, which
   * fades text and background together and fails WCAG contrast once both
   * drift toward the page colour. `bg-panel-locked` is a solid stand-in
   * chosen to keep the same "not ready yet" look without touching opacity.
   */
  it('gives a `locked` section the locked background, not a dimmed one', () => {
    const classes = mountPane({ status: 'locked' }).classes();

    expect(classes).toContain('bg-panel-locked');
    expect(classes).not.toContain('opacity-55');
  });

  it('leaves a non-locked section on the normal panel background', () => {
    const classes = mountPane({ status: 'current' }).classes();

    expect(classes).toContain('bg-panel');
    expect(classes).not.toContain('bg-panel-locked');
  });

  it('gives a `locked` header the locked head background', () => {
    const wrapper = mountPane({ status: 'locked' });

    expect(wrapper.get('header').classes()).toContain('bg-panel-head-locked');
  });

  it('leaves a non-locked header on the normal head background', () => {
    const wrapper = mountPane({ status: 'current' });

    expect(wrapper.get('header').classes()).toContain('bg-panel-head');
  });

  it('mutes the textarea of a `stale` pane', () => {
    // The visual half of the stale badge: the text is greyed rather than
    // removed, so it reads as superseded instead of as absent.
    const classes = mountPane({
      modelValue: 'A paragraph.',
      status: 'stale',
    })
      .get('textarea')
      .classes();

    expect(classes).toContain('bg-[#fbfaf5]');
    expect(classes).toContain('text-[#8b8b84]');
  });

  it('greys the textarea of a `locked` pane', () => {
    // The counterpart to the dimmed section, and the visual half of the
    // `locked` badge.
    expect(
      mountPane({ status: 'locked' }).get('textarea').classes(),
    ).toContain('bg-[#f4f4f0]');
  });

  it('leaves a `current` textarea transparent', () => {
    const classes = mountPane({ modelValue: 'A paragraph.', status: 'current' })
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
