<script setup lang="ts">
import { computed, ref } from "vue";
import {
  DEFAULT_PRESET_ID,
  formatLevel1,
  formatLevel2,
  LEVEL_2_PIPELINE,
  presetById,
} from "@transcript-cleaner/rules";

/**
 * A scaffold, not the shipping UI.
 *
 * Issue #2 asks for the workspace and the faithful port; the interface settled
 * in the grilling rounds — the two-stage gate and staleness of Q13b, the preset
 * drawer of Q16, the file drop of Q25, the export of Q6 — is a later issue.
 * What this screen is for is proving the dependency direction end to end:
 * `packages/web` imports `packages/rules`, and the rule engine runs unchanged in
 * a browser.
 */

const preset = presetById(DEFAULT_PRESET_ID);

const raw = ref("");
const reflowed = ref("");
const cleaned = ref("");

const rulesInPipelineOrder = computed(() =>
  LEVEL_2_PIPELINE.filter((rule) => preset.ruleIds.includes(rule.id)),
);

function runLevel1() {
  // Q13b: a re-run marks the downstream pane stale, it does not clear it — the
  // cleaned text is the user's only copy until they re-run level 2. The
  // staleness affordance itself (dimmed, with a re-run badge) belongs to the UI
  // issue; what matters here is not cementing the opposite policy.
  reflowed.value = formatLevel1(raw.value);
}

function runLevel2() {
  cleaned.value = formatLevel2(reflowed.value, {
    enabledRuleIds: preset.ruleIds,
  });
}
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-semibold">Transcript Cleaner</h1>
      <p class="text-sm text-slate-600">
        Scaffold — {{ preset.name }} · {{ rulesInPipelineOrder.length }}/{{
          LEVEL_2_PIPELINE.length
        }}
        rules. The rule engine is <code>@transcript-cleaner/rules</code>; this page
        only calls it.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <section class="flex flex-col gap-2">
        <label class="text-sm font-medium" for="raw">Raw transcript</label>
        <textarea
          id="raw"
          v-model="raw"
          class="h-96 w-full rounded border border-slate-300 p-2 font-mono text-xs"
          placeholder="Paste Vibe output here"
        ></textarea>
        <button
          class="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
          :disabled="raw.trim() === ''"
          @click="runLevel1"
        >
          Run level 1 — reflow
        </button>
      </section>

      <section class="flex flex-col gap-2">
        <label class="text-sm font-medium" for="reflowed">Reflowed transcript</label>
        <textarea
          id="reflowed"
          v-model="reflowed"
          class="h-96 w-full rounded border border-slate-300 p-2 font-mono text-xs"
          placeholder="Level 1 output — editable"
        ></textarea>
        <button
          class="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
          :disabled="reflowed.trim() === ''"
          @click="runLevel2"
        >
          Run level 2 — apply rules
        </button>
      </section>

      <section class="flex flex-col gap-2">
        <span class="text-sm font-medium">Cleaned transcript</span>
        <pre
          class="h-96 w-full overflow-auto rounded border border-slate-300 p-2 font-mono text-xs whitespace-pre-wrap"
          >{{ cleaned }}</pre
        >
      </section>
    </div>
  </main>
</template>
