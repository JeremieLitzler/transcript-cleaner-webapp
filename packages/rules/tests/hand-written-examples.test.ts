import { describe, expect, it } from 'vitest';
import { formatLevel1 } from '../src/level-1.js';
import { formatLevel2, ruleById } from '../src/level-2/pipeline.js';
import { Paragraphs } from '../src/level-2/paragraphs.js';
import {
  EXAMPLE_FILES,
  loadCases,
  type Case,
  type Runner,
} from './harness/examples.js';

/**
 * The per-rule specification (Q15c, Q24).
 *
 * The markdown in `hand-written-examples/` is parsed at run time and one test
 * is generated per case, so the markdown is the only copy of each case and
 * cannot drift from the suite.
 *
 * A case is skipped when its status says `unconfirmed`, or when it carries a
 * `Phase:` line naming a phase later than this one. Phase 1 (issue #2) was a
 * faithful port; phase 2 (issue #3) applied the agreed rule changes and dropped
 * the `Phase: 2` lines from the cases that state them. The only case still
 * deferred is rule 7's target, which needs the LLM work in issue #5.
 */

/**
 * The phase whose cases assert. `'1'` is also what a case with no `Phase:` line
 * gets, so every landed case sits here; a case tagged with any other phase is
 * skipped and listed in `DEFERRED`. Issue #3 landed by *deleting* its `Phase: 2`
 * lines, not by moving this constant — bumping it would strip the phase-1 cases
 * instead.
 */
const CURRENT_PHASE = '1';

function run(runner: Runner, input: string): string {
  switch (runner.kind) {
    case 'level-1':
      return formatLevel1(input);
    case 'level-2':
      return formatLevel2(input);
    case 'rule':
      return ruleById(runner.ruleId).apply(Paragraphs.fromText(input)).toText();
  }
}

const cases = loadCases();

/**
 * Cases the suite is knowingly not asserting yet, and the issue that turns each
 * one on. Listed here so that adding a `Phase:` line to a case is a visible,
 * reviewable act rather than a silent way to disable a failing test.
 */
const DEFERRED: Readonly<Record<string, string>> = {
  'RULE-07': 'llm', // the verbless join needs an LLM — issue #5
};

describe('hand-written examples', () => {
  it('finds cases in every example file', () => {
    for (const file of EXAMPLE_FILES) {
      expect(cases.filter((c) => c.file === file).length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate case ids', () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defers exactly the cases listed in this suite', () => {
    const deferredInMarkdown = Object.fromEntries(
      cases.filter((c) => c.phase !== CURRENT_PHASE).map((c) => [c.id, c.phase]),
    );
    expect(deferredInMarkdown).toEqual(DEFERRED);
  });

  it('has no unconfirmed cases left', () => {
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

  describe.each(EXAMPLE_FILES)('%s', (file) => {
    const inFile = (list: Case[]) => list.filter((c) => c.file === file);

    for (const testCase of inFile(asserted)) {
      it(`${testCase.id} — ${testCase.description}`, () => {
        expect(run(testCase.runner, testCase.input)).toBe(testCase.expected);
      });
    }

    for (const testCase of inFile(skipped)) {
      const why = testCase.isConfirmed
        ? `deferred to phase ${testCase.phase}`
        : 'unconfirmed';
      it.skip(`${testCase.id} — ${testCase.description} [${why}]`, () => {});
    }
  });
});
