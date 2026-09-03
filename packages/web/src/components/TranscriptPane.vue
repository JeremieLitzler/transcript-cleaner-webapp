<script setup lang="ts">
import { computed } from 'vue';

/**
 * One of the three stages, in the shape settled by Q16 variant C: a titled
 * header carrying a state badge, and a monospace pane below it.
 *
 * The badge is the whole point of the design. Q13b settled that an upstream
 * edit marks downstream **stale** rather than clearing it, so a pane has to be
 * able to say "what you are reading did not come from what is above it" while
 * still showing it.
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
  /** The stage has never run. The pane is dimmed and says so. */
  locked?: boolean;
  /** Something upstream changed since this was produced. */
  stale?: boolean;
  placeholder?: string;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();

/**
 * The subtitle is a slot so a pane can put a link in it. Filling the slot
 * replaces the `sub` prop entirely; the styling stays on the wrapping span so
 * slot content cannot drift from the plain-string panes.
 */
defineSlots<{ sub?: () => unknown }>();

const badge = computed(() => {
  if (props.locked) return { text: 'locked', variant: 'badge-lock' };
  if (props.stale) return { text: 'stale — re-run', variant: '' };
  if (props.modelValue !== '') return { text: 'current', variant: 'badge-ok' };
  return null;
});
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-panel"
    :class="{ 'opacity-55': locked }"
  >
    <header
      class="flex flex-none items-center gap-2 border-b border-line bg-panel-head px-[10px] py-2"
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
        stale ? 'bg-[#fbfaf5] text-[#8b8b84]' : 'bg-transparent',
        locked ? 'bg-[#f4f4f0]' : '',
      ]"
      :value="modelValue"
      :readonly="readonly"
      :placeholder="placeholder"
      spellcheck="false"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
    ></textarea>
  </section>
</template>
