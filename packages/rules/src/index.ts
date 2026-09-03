/**
 * `@transcript-cleaner/rules` — the transcript pipeline, with no UI and no
 * dependencies. `packages/web` imports this; nothing here imports the web app.
 *
 * Phase 1 (issue #2) is a faithful, bug-for-bug port of
 * `original-scripts/format_transcription.py` and `format_advanced.py`. The
 * quirks are catalogued in `docs/port-divergences.md` and each is named in a
 * comment on the code that reproduces it.
 */

export { normaliseLineEndings } from "./line-endings.js";
export { formatLevel1 } from "./level-1.js";
export { Paragraphs } from "./level-2/paragraphs.js";
export {
  rule1RemoveAnd,
  rule2AndJoin,
  rule3CapitaliseFirst,
  rule4ButButJoin,
  rule5CapitaliseAfterQuestion,
  rule6MrJoin,
  rule7VerblessJoinLLM,
  rule8ThatPronounJoin,
  rule9RemoveDuplicates,
  rule10ThenJoin,
  rule11RemoveTrailer,
} from "./level-2/rules.js";
export {
  formatLevel2,
  ruleById,
  LEVEL_2_PIPELINE,
  type Level2Options,
  type RuleDefinition,
  type RuleId,
} from "./level-2/pipeline.js";
export {
  presetById,
  DEFAULT_PRESET_ID,
  PRESETS,
  type Preset,
} from "./presets.js";
