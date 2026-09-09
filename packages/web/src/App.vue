<script setup lang="ts">
import { ref } from 'vue';
import { LEVEL_2_PIPELINE, type RuleId } from '@transcript-cleaner/rules';
import TranscriptPane from './components/TranscriptPane.vue';
import RulesDrawer from './components/RulesDrawer.vue';
import { useTranscriptStages } from './composables/useTranscriptStages';
import { useRuleSelection } from './composables/useRuleSelection';

/**
 * Q16 variant C: a toolbar chip that opens a rules drawer, and the three
 * stages of Q13b filling everything the toolbar leaves. Variant C won because
 * it gives the transcripts the most room, so the panes get the window and the
 * configuration is somewhere you visit.
 *
 * The look comes from `docs/prototypes/q16-preset-rules.prototype.html`. The
 * three-stage machine underneath it is `useTranscriptStages` (issue #40); the
 * preset and per-rule state is `useRuleSelection` (issue #44); this component
 * holds no array logic of its own — only the drawer and the wiring between
 * the two composables, which is why `pickPreset` / `toggleRule` below also
 * call `markCleanedStale`.
 *
 * Still to come, each its own piece of work: the `.txt` drop (Q25), copy and
 * download (Q6), and the per-rule fire counts the prototype showed (issue #8).
 */

const {
  raw,
  reflowed,
  cleaned,
  canRunLevel1,
  canRunLevel2,
  rawStatus,
  reflowedStatus,
  cleanedStatus,
  editRaw,
  editReflowed,
  runLevel1,
  runLevel2,
  markCleanedStale,
} = useTranscriptStages();

const ruleSelection = useRuleSelection();
const { presetId, preset, enabledRuleIds, enabledCount, isEnabled } =
  ruleSelection;

const drawerOpen = ref(false);

function pickPreset(id: string) {
  ruleSelection.pickPreset(id);
  markCleanedStale();
}

function toggleRule(id: RuleId) {
  ruleSelection.toggleRule(id);
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

      <button class="btn" :disabled="!canRunLevel1" @click="runLevel1">
        Reflow
      </button>
      <button
        class="btn"
        :class="{ 'btn-ghost': !canRunLevel2 }"
        :disabled="!canRunLevel2"
        :title="canRunLevel2 ? undefined : 'Level 1 must run first'"
        @click="runLevel2(enabledRuleIds)"
      >
        Apply rules
      </button>

      <button class="chip" @click="drawerOpen = true">
        <b>{{ preset.name }}</b>
        <span class="text-muted [font-variant-numeric:tabular-nums]">
          {{ enabledCount }}/{{ LEVEL_2_PIPELINE.length }} rules
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
        :status="rawStatus"
        @update:model-value="editRaw"
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
        :status="reflowedStatus"
        @update:model-value="editReflowed"
      />
      <TranscriptPane
        title="Cleaned transcript"
        sub="level 2 · read-only"
        :model-value="cleaned"
        readonly
        :status="cleanedStatus"
      />
    </main>

    <RulesDrawer
      v-if="drawerOpen"
      :preset-id="presetId"
      :is-enabled="isEnabled"
      :enabled-count="enabledCount"
      @close="drawerOpen = false"
      @pick-preset="pickPreset"
      @toggle="toggleRule"
    />
  </div>
</template>
