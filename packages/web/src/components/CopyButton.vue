<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTimeoutFn } from '@vueuse/core';

/**
 * Copies one pane's current text, placed into the pane header's `actions`
 * slot by `App.vue` (issue #76). Only the reflowed and cleaned panes get one:
 * copy takes a stage's result, and the raw transcript is the input.
 *
 * The write is `navigator.clipboard.writeText`, not VueUse's `useClipboard`:
 * that one falls back to `execCommand` on a refused write and reports success
 * anyway (ADR-0001). The click is the permission, so there is no permission code.
 */
const props = defineProps<{
  /**
   * The pane's current text. `disabled` is derived from it rather than passed
   * in, so the button cannot disagree with what is on screen.
   */
  source: string;
  /**
   * The accessible name, naming the pane so a screen reader does not meet two
   * buttons both called "Copy". It stays put while the visible label swaps.
   */
  label: string;
}>();

const copied = ref(false);

// `start()` clears a running timer first, so a second copy restarts the full 1500 ms.
const reset = useTimeoutFn(() => (copied.value = false), 1500, {
  immediate: false,
});

// One source for the label and the live region, so the two cannot drift apart.
const announcement = computed(() => (copied.value ? 'Copied' : ''));

async function copy() {
  try {
    await navigator.clipboard.writeText(props.source);
    copied.value = true;
    reset.start();
  } catch {
    // A refused write is reported by issue #77, which lands with this one.
  }
}
</script>

<template>
  <button
    type="button"
    class="btn-pane focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    :disabled="source === ''"
    :aria-label="label"
    @click="copy"
  >
    {{ announcement || 'Copy' }}
  </button>
  <!-- Always rendered: a live region that appears with its text is not reliably announced. -->
  <span class="sr-only" aria-live="polite">{{ announcement }}</span>
</template>
