<script setup lang="ts">
import { computed } from 'vue';
import type { PaneStatus } from '../composables/useTranscriptStages';

/**
 * One of the three stages, in the shape settled by Q16 variant C: a titled
 * header carrying a state badge, and a monospace pane below it.
 *
 * The badge is the whole point of the design. Q13b settled that an upstream
 * edit marks downstream **stale** rather than clearing it, so a pane has to be
 * able to say "what you are reading did not come from what is above it" while
 * still showing it.
 *
 * This component derives no state of its own: `status` is handed to it already
 * ranked by `useTranscriptStages`, and the badge, the dimmed background and the
 * locked look all follow from it. `modelValue` is the textarea's content
 * binding and nothing else.
 */
const props = defineProps<{
  title: string;
  /**
   * The quiet second line: which stage produced this, and whether it is
   * editable. Optional, because a pane whose subtitle needs more than plain
   * text supplies the `sub` slot instead.
   */
  sub?: string;
  modelValue: string;
  readonly?: boolean;
  /**
   * The pane's whole display state, ranked in `useTranscriptStages` under
   * `locked > stale > current > none`. Orthogonal to `readonly`: `locked`
   * does not imply read-only.
   */
  status: PaneStatus;
  placeholder?: string;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();

/**
 * The subtitle is a slot so a pane can put a link in it. Filling the slot
 * replaces the `sub` prop entirely; the styling stays on the wrapping span so
 * slot content cannot drift from the plain-string panes.
 */
defineSlots<{ sub?: () => unknown }>();

/**
 * The `status` > badge mapping. Text and variant per value are the design's,
 * preserved exactly; `none` shows no badge. The precedence that picks the
 * `status` lives in `useTranscriptStages`, not here.
 */
const BADGE_BY_STATUS: Record<
  PaneStatus,
  { text: string; variant: string } | null
> = {
  none: null,
  current: { text: 'current', variant: 'badge-ok' },
  stale: { text: 'stale — re-run', variant: '' },
  locked: { text: 'locked', variant: 'badge-lock' },
};

const badge = computed(() => BADGE_BY_STATUS[props.status]);
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-line"
    :class="status === 'locked' ? 'bg-panel-locked' : 'bg-panel'"
  >
    <header
      class="flex flex-none items-center gap-2 border-b border-line px-[10px] py-2"
      :class="status === 'locked' ? 'bg-panel-head-locked' : 'bg-panel-head'"
    >
      <span class="text-xs font-[650]">{{ title }}</span>
      <span class="text-[11px] text-muted">
        <slot name="sub">{{ sub }}</slot>
      </span>
      <span v-if="badge" class="badge ml-auto" :class="badge.variant">{{
        badge.text
      }}</span>
    </header>

    <textarea
      class="min-h-0 flex-1 resize-none border-0 p-3 font-mono text-xs leading-[1.65] outline-none"
      :class="[
        status === 'stale' ? 'bg-[#fbfaf5] text-[#8b8b84]' : 'bg-transparent',
        status === 'locked' ? 'bg-[#f4f4f0]' : '',
      ]"
      :value="modelValue"
      :readonly="readonly"
      :aria-label="title"
      :placeholder="placeholder"
      spellcheck="false"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
    ></textarea>
  </section>
</template>
