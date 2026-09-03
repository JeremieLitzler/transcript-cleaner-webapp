import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TranscriptPane from '../src/components/TranscriptPane.vue';

/**
 * The smoke test for the harness itself (issue #22). It exists to prove that a
 * `.vue` SFC compiles, mounts and renders under this config — not to cover
 * `TranscriptPane`, whose behaviour belongs to whichever test is written for
 * it. A config nobody has watched execute is not known to work.
 *
 * Hence the filename: the real `TranscriptPane` suite should be free to claim
 * `transcript-pane.test.ts` without colliding with this one.
 */
describe('the web test harness', () => {
  it('mounts a component and renders its title', () => {
    const wrapper = mount(TranscriptPane, {
      props: { title: 'Raw transcript', modelValue: '' },
    });

    // The title span specifically, not the pane's text as a whole: an
    // assertion that would pass on any text anywhere proves less than it looks.
    expect(wrapper.get('header > span:first-child').text()).toBe(
      'Raw transcript',
    );
  });
});
