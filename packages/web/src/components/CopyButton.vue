<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

type Outcome = 'copied' | 'failed';

/** `null` at rest: before any attempt, after the reset, or once a failure clears. */
const outcome = ref<Outcome | null>(null);

// `start()` clears a running timer first, so a second copy restarts the full 1500 ms.
const reset = useTimeoutFn(() => (outcome.value = null), 1500, {
  immediate: false,
});

// A failure has no timer (issue #77); editing the text is one way the user clears it.
watch(() => props.source, clearFailure);

const ANNOUNCEMENT_BY_OUTCOME: Record<Outcome, string> = {
  copied: 'Copied',
  failed: 'Copy failed',
};

// One source for the label and the live region, so the two cannot drift apart.
const announcement = computed(() =>
  outcome.value ? ANNOUNCEMENT_BY_OUTCOME[outcome.value] : '',
);

function clearFailure() {
  if (outcome.value === 'failed') outcome.value = null;
}

async function copy() {
  // The next attempt clears a failure whatever its own outcome (issue #77).
  clearFailure();
  try {
    await navigator.clipboard.writeText(props.source);
    outcome.value = 'copied';
    reset.start();
  } catch {
    // Stopped, or an earlier success's timer would clear the failure early.
    reset.stop();
    outcome.value = 'failed';
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
