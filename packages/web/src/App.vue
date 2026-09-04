<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  DEFAULT_PRESET_ID,
  formatLevel1,
  formatLevel2,
  LEVEL_2_PIPELINE,
  presetById,
  type RuleId,
} from '@transcript-cleaner/rules';
import TranscriptPane from './components/TranscriptPane.vue';
import RulesDrawer from './components/RulesDrawer.vue';

/**
 * Q16 variant C: a toolbar chip that opens a rules drawer, and the three
 * stages of Q13b filling everything the toolbar leaves. Variant C won because
 * it gives the transcripts the most room, so the panes get the window and the
 * configuration is somewhere you visit.
 *
 * The look comes from `docs/prototypes/q16-preset-rules.prototype.html`. The
 * behaviour underneath is `@transcript-cleaner/rules` — the prototype hand-ported
 * the Python and predates the fidelity fixes in L1-07, so its pipeline is not
 * worth carrying over.
 *
 * Still to come, each its own piece of work: the `.txt` drop (Q25), copy and
 * download (Q6), and the per-rule fire counts the prototype showed (issue #8).
 */

const raw = ref('');
const reflowed = ref('');
const cleaned = ref('');

/** The Q13b gate: level 2 cannot run until level 1 has. */
const ranLevel1 = ref(false);
const reflowedStale = ref(false);
const cleanedStale = ref(false);

const presetId = ref(DEFAULT_PRESET_ID);
const enabledRuleIds = ref<RuleId[]>([...presetById(DEFAULT_PRESET_ID).ruleIds]);
const drawerOpen = ref(false);

const preset = computed(() => presetById(presetId.value));

/**
 * Q13b: an upstream change marks what follows stale, it never clears it. The
 * cleaned text is the only copy the user has until they re-run, and throwing it
 * away to signal "this is out of date" costs them more than the signal is worth.
 */
function markCleanedStale() {
  if (cleaned.value !== '') {
    cleanedStale.value = true;
  }
}

function onRawInput(value: string) {
  raw.value = value;
  if (ranLevel1.value) {
    reflowedStale.value = true;
  }
  markCleanedStale();
}

function onReflowedInput(value: string) {
  reflowed.value = value;
  markCleanedStale();
}

function runLevel1() {
  reflowed.value = formatLevel1(raw.value);
  ranLevel1.value = true;
  reflowedStale.value = false;
  markCleanedStale();
}

/**
 * Q13b again: this reads the reflowed pane as it stands, not a fresh level-1
 * run. That pane is the repair point between two lossy stages, and re-running
 * level 1 here would silently discard whatever was fixed by hand.
 */
function runLevel2() {
  cleaned.value = formatLevel2(reflowed.value, {
    enabledRuleIds: enabledRuleIds.value,
  });
  cleanedStale.value = false;
}

function pickPreset(id: string) {
  presetId.value = id;
  enabledRuleIds.value = [...presetById(id).ruleIds];
  markCleanedStale();
}

function toggleRule(id: RuleId) {
  enabledRuleIds.value = enabledRuleIds.value.includes(id)
    ? enabledRuleIds.value.filter((ruleId) => ruleId !== id)
    : [...enabledRuleIds.value, id];
  markCleanedStale();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <header
      class="flex flex-none items-center gap-[14px] border-b border-line bg-panel px-4 py-[10px]"
    >
      <!-- First in the header, and so first in focus order, so it is the
           very first stop for a keyboard user (issue #33). Kept inside the
           banner landmark rather than floating outside every landmark. -->
      <a href="#main-content" class="skip-link">Skip to main content</a>

      <h1 class="sr-only">Transcript Cleaner</h1>

      <button class="btn" :disabled="raw.trim() === ''" @click="runLevel1">
        Reflow
      </button>
      <button
        class="btn"
        :class="{ 'btn-ghost': !ranLevel1 }"
        :disabled="!ranLevel1"
        :title="ranLevel1 ? undefined : 'Level 1 must run first'"
        @click="runLevel2"
      >
        Apply rules
      </button>

      <button class="chip" @click="drawerOpen = true">
        <b>{{ preset.name }}</b>
        <span class="text-muted [font-variant-numeric:tabular-nums]">
          {{ enabledRuleIds.length }}/{{ LEVEL_2_PIPELINE.length }} rules
        </span>
        <span class="text-muted">▸</span>
      </button>
    </header>

    <main
      id="main-content"
      tabindex="-1"
      class="grid min-h-0 flex-1 grid-cols-3 gap-[10px] p-[10px]"
    >
      <TranscriptPane
        title="Raw transcript"
        placeholder="Paste a transcript here"
        :model-value="raw"
        @update:model-value="onRawInput"
      >
        <!-- The space in `'paste '` is authored, not left to the compiler's
             whitespace handling, so only `from Vibe` is the link. -->
        <template #sub>
          {{ 'paste ' }}<a
            class="text-accent underline underline-offset-2 hover:text-accent-dark hover:decoration-2 focus-visible:rounded-sm focus-visible:text-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href="https://github.com/thewh1teagle/vibe/releases/tag/v3.0.23"
            target="_blank"
            rel="noopener noreferrer"
            title="v3.0.23 is the preferred stable version; the v3.1.x line is not considered stable."
          >from Vibe</a>
        </template>
      </TranscriptPane>
      <TranscriptPane
        title="Reflowed transcript"
        sub="level 1 · editable"
        :model-value="reflowed"
        :locked="!ranLevel1"
        :stale="reflowedStale"
        @update:model-value="onReflowedInput"
      />
      <TranscriptPane
        title="Cleaned transcript"
        sub="level 2 · read-only"
        :model-value="cleaned"
        readonly
        :locked="cleaned === ''"
        :stale="cleanedStale"
      />
    </main>

    <RulesDrawer
      v-if="drawerOpen"
      :preset-id="presetId"
      :enabled-rule-ids="enabledRuleIds"
      @close="drawerOpen = false"
      @pick-preset="pickPreset"
      @toggle-rule="toggleRule"
    />
  </div>
</template>
