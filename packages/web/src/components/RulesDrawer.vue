<script setup lang="ts">
import {
  LEVEL_2_PIPELINE,
  PRESETS,
  type RuleId,
} from '@transcript-cleaner/rules';

/**
 * The right-hand drawer from Q16 variant C: presets on the left, the eleven
 * rules on the right, all checked by default and unchecked one at a time
 * (Q12).
 *
 * Both lists come from `@transcript-cleaner/rules`. The prototype carried its
 * own copies of the rule names and a `Conservative` preset that Q26 did not
 * ship; taking the look from it does not mean taking its data, and a second
 * copy of the rule list is exactly the drift the package boundary exists to
 * prevent.
 *
 * The prototype also rendered a per-rule count of paragraphs touched. That is
 * deliberately absent — issue #8.
 */
defineProps<{
  presetId: string;
  enabledRuleIds: readonly RuleId[];
}>();

defineEmits<{
  close: [];
  pickPreset: [id: string];
  toggleRule: [id: RuleId];
}>();
</script>

<template>
  <div
    class="fixed inset-0 z-40 bg-[rgba(20,20,18,0.34)]"
    @click="$emit('close')"
  ></div>

  <aside
    class="fixed inset-y-0 right-0 z-41 grid w-[min(620px,92vw)] grid-rows-[auto_1fr] bg-panel shadow-[-12px_0_40px_rgba(0,0,0,0.16)]"
  >
    <div class="flex items-center gap-[10px] border-b border-line px-4 py-[14px]">
      <h2 class="m-0 text-sm">Rules</h2>
      <button
        class="ml-auto cursor-pointer border-0 bg-transparent text-xl leading-none text-muted"
        aria-label="Close"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <div class="grid min-h-0 grid-cols-[230px_1fr]">
      <div class="overflow-auto border-r border-line p-[14px]">
        <div class="rulehead">Presets</div>
        <label
          v-for="preset in PRESETS"
          :key="preset.id"
          class="preset"
          :class="{ 'preset-on': preset.id === presetId }"
          @click="$emit('pickPreset', preset.id)"
        >
          <div class="text-[13px] font-[650]">
            {{ preset.id === presetId ? '◉' : '○' }} {{ preset.name }}
          </div>
          <div class="mt-0.5 text-[11.5px] text-muted">
            {{ preset.description }}
          </div>
        </label>
      </div>

      <div class="overflow-auto p-[14px]">
        <div class="rulehead">
          {{ enabledRuleIds.length }} of {{ LEVEL_2_PIPELINE.length }} on
        </div>
        <label
          v-for="rule in LEVEL_2_PIPELINE"
          :key="rule.id"
          class="rule"
          :class="{ 'rule-off': !enabledRuleIds.includes(rule.id) }"
        >
          <input
            type="checkbox"
            :checked="enabledRuleIds.includes(rule.id)"
            @change="$emit('toggleRule', rule.id)"
          />
          <span
            class="flex-none basis-[22px] text-muted [font-variant-numeric:tabular-nums]"
            >{{ rule.id }}.</span
          >
          <span class="rule-name min-w-0 flex-1">{{ rule.name }}</span>
        </label>

        <p class="mt-3 text-[11.5px] leading-relaxed text-muted">
          The rules run in pipeline order, not in the order numbered here.
          Unticking one skips it and leaves the rest untouched.
        </p>
      </div>
    </div>
  </aside>
</template>
