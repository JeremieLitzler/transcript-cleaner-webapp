import { Paragraphs } from "./paragraphs.js";
import {
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
} from "./rules.js";

/** The rule numbers as the spec and `docs/port-divergences.md` name them. */
export type RuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface RuleDefinition {
  /** The rule's number in the spec. Stable — the UI and the presets key on it. */
  readonly id: RuleId;
  /** Short label for the rule drawer. */
  readonly name: string;
  readonly apply: (paras: Paragraphs) => Paragraphs;
  /**
   * Whether the rule can fire on a language other than English. Eight of the
   * eleven key on English literals ("And ", "But ", "Then ", "Mr.", the pronoun
   * list, the trailer); rules 3, 5 and 9 do not. This is what the Universal
   * preset selects on (Q26).
   */
  readonly languageAgnostic: boolean;
}

/**
 * `_PIPELINE` — the eleven rules in execution order.
 *
 * The order is the Python's and is load-bearing: rule 9 must run before any
 * join so that paragraphs are still close to sentences, and rules 1, 3 and 5
 * run last so they clean up after the joins. Sorting this list by rule number
 * would change the output.
 */
export const LEVEL_2_PIPELINE: readonly RuleDefinition[] = [
  { id: 11, name: "Remove the closing trailer", apply: rule11RemoveTrailer, languageAgnostic: false },
  { id: 9, name: "Remove an immediately repeated paragraph", apply: rule9RemoveDuplicates, languageAgnostic: true },
  { id: 6, name: 'Join a paragraph ending in "Mr."', apply: rule6MrJoin, languageAgnostic: false },
  { id: 2, name: 'Join a paragraph starting with "and"', apply: rule2AndJoin, languageAgnostic: false },
  { id: 10, name: 'Join a paragraph starting with "Then"', apply: rule10ThenJoin, languageAgnostic: false },
  { id: 8, name: 'Join "That" followed by a pronoun', apply: rule8ThatPronounJoin, languageAgnostic: false },
  { id: 4, name: 'Join two consecutive "But" paragraphs', apply: rule4ButButJoin, languageAgnostic: false },
  { id: 7, name: "Join a verbless sentence (needs an LLM — no-op)", apply: rule7VerblessJoinLLM, languageAgnostic: false },
  { id: 1, name: 'Remove a leading "And"', apply: rule1RemoveAnd, languageAgnostic: false },
  { id: 3, name: "Capitalise a paragraph starting in lowercase", apply: rule3CapitaliseFirst, languageAgnostic: true },
  { id: 5, name: 'Capitalise the word after a "?"', apply: rule5CapitaliseAfterQuestion, languageAgnostic: true },
];

/** Look a rule up by its number, whatever its position in the pipeline. */
export function ruleById(id: RuleId): RuleDefinition {
  const rule = LEVEL_2_PIPELINE.find((r) => r.id === id);
  if (!rule) throw new RangeError(`No level-2 rule with id ${id}`);
  return rule;
}

export interface Level2Options {
  /**
   * Which rules to run. Defaults to all eleven, which is what the Python does
   * and what the golden transcripts assert. Order is ignored — the pipeline
   * order always wins.
   */
  readonly enabledRuleIds?: readonly RuleId[];
}

/**
 * Level 2 — the advanced rules. A faithful port of `format_advanced`.
 *
 * Assumes level 1 has already run: the input is blank-line-separated
 * paragraphs, never raw transcript. As with level 1, the return value has no
 * trailing newline (L1-06).
 */
export function formatLevel2(text: string, options: Level2Options = {}): string {
  const enabled = options.enabledRuleIds;
  const rules =
    enabled === undefined
      ? LEVEL_2_PIPELINE
      : LEVEL_2_PIPELINE.filter((rule) => enabled.includes(rule.id));

  let paras = Paragraphs.fromText(text);
  for (const rule of rules) {
    paras = rule.apply(paras);
  }
  return paras.toText();
}
