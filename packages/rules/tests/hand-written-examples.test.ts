import { describe, expect, it } from "vitest";
import { formatLevel1 } from "../src/level-1.js";
import { formatLevel2, ruleById, type RuleId } from "../src/level-2/pipeline.js";
import { Paragraphs } from "../src/level-2/paragraphs.js";
import {
  EXAMPLE_FILES,
  loadCases,
  type Case,
  type Runner,
} from "./harness/examples.js";

/**
 * The per-rule specification (Q15c, Q24).
 *
 * The markdown in `hand-written-examples/` is parsed at run time and one test
 * is generated per case, so the markdown is the only copy of each case and
 * cannot drift from the suite.
 *
 * A case is skipped when its status says `unconfirmed`, or when it carries a
 * `Phase:` line naming a phase later than this one. Phase 1 (issue #2) is a
 * faithful port; the cases that state the behaviour issue #3 will introduce are
 * marked `Phase: 2` and go live when that work lands.
 */

const CURRENT_PHASE = "1";

function run(runner: Runner, input: string): string {
  switch (runner.kind) {
    case "level-1":
      return formatLevel1(input);
    case "level-2":
      return formatLevel2(input);
    case "rule":
      return ruleById(runner.ruleId as RuleId)
        .apply(Paragraphs.fromText(input))
        .toText();
  }
}

const cases = loadCases();

/**
 * Cases the suite is knowingly not asserting yet, and the issue that turns each
 * one on. Listed here so that adding a `Phase:` line to a case is a visible,
 * reviewable act rather than a silent way to disable a failing test.
 */
const DEFERRED: Readonly<Record<string, string>> = {
  "L1-03": "2", // ellipsis must not break a paragraph — issue #3
  "RULE-11": "2", // the redefined trailer anchor — issue #3
  "L2-R06-01": "2", // rule 6 must re-examine a joined paragraph — issue #3
  "L2-R06-02": "2", // rule 6 must handle Mrs./Dr./St. — issue #3
  "L2-R08-01": "2", // rule 8 must ignore punctuation after the pronoun — issue #3
  "RULE-07": "llm", // the verbless join needs an LLM — issue #5
};

describe("hand-written examples", () => {
  it("finds cases in every example file", () => {
    for (const file of EXAMPLE_FILES) {
      expect(cases.filter((c) => c.file === file).length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate case ids", () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defers exactly the cases listed in this suite", () => {
    const deferredInMarkdown = Object.fromEntries(
      cases.filter((c) => c.phase !== CURRENT_PHASE).map((c) => [c.id, c.phase]),
    );
    expect(deferredInMarkdown).toEqual(DEFERRED);
  });

  it("has no unconfirmed cases left", () => {
    // Every case was confirmed in round v05. If one is ever added as
    // `unconfirmed` this fails, which is the reminder to get it reviewed.
    expect(cases.filter((c) => !c.isConfirmed).map((c) => c.id)).toEqual([]);
  });

  const asserted = cases.filter(
    (c) => c.isConfirmed && c.phase === CURRENT_PHASE,
  );
  const skipped = cases.filter(
    (c) => !c.isConfirmed || c.phase !== CURRENT_PHASE,
  );

  describe.each(EXAMPLE_FILES)("%s", (file) => {
    const inFile = (list: Case[]) => list.filter((c) => c.file === file);

    for (const testCase of inFile(asserted)) {
      it(`${testCase.id} — ${testCase.description}`, () => {
        expect(run(testCase.runner, testCase.input)).toBe(testCase.expected);
      });
    }

    for (const testCase of inFile(skipped)) {
      const why = testCase.isConfirmed
        ? `deferred to phase ${testCase.phase}`
        : "unconfirmed";
      it.skip(`${testCase.id} — ${testCase.description} [${why}]`, () => {});
    }
  });
});
