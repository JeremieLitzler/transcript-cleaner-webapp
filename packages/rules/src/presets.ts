import { LEVEL_2_PIPELINE, type RuleId } from "./level-2/pipeline.js";

/**
 * A preset is a named set of level-2 rules, on by default (Q1, Q12, Q26).
 * Level 1 has nothing to configure, so presets apply to level 2 alone.
 */
export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly ruleIds: readonly RuleId[];
}

/** The rules that carry no English literal, and so are correct in any language. */
const LANGUAGE_AGNOSTIC_RULE_IDS: readonly RuleId[] = LEVEL_2_PIPELINE.filter(
  (rule) => rule.languageAgnostic,
).map((rule) => rule.id);

export const PRESETS: readonly Preset[] = [
  {
    id: "coge-english",
    name: "COGE (English)",
    description:
      "All eleven rules, as written for the COGE sermon corpus. Eight of them key on English literals.",
    ruleIds: LEVEL_2_PIPELINE.map((rule) => rule.id),
  },
  {
    id: "universal",
    name: "Universal (any language)",
    description:
      "The three rules that carry no English literal: remove a repeated paragraph, capitalise a lowercase opening, capitalise after a question mark.",
    ruleIds: LANGUAGE_AGNOSTIC_RULE_IDS,
  },
];

export const DEFAULT_PRESET_ID = "coge-english";

export function presetById(id: string): Preset {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) throw new RangeError(`No preset with id ${id}`);
  return preset;
}
