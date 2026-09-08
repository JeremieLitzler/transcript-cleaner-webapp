import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESET_ID,
  presetById,
  type RuleId,
} from '@transcript-cleaner/rules';
import { useTranscriptStages } from '../src/composables/useTranscriptStages';

/**
 * `useTranscriptStages` (issue #40) — the Q13b three-stage machine, lifted out
 * of `App.vue` so it can be driven without a component. Everything here calls
 * the composable directly and reads the refs it returns: it is Reactivity-only,
 * so that is all a test needs.
 *
 * `app.test.ts` still drives the same behaviour through the rendered app, but
 * only far enough to prove the buttons and textareas reach these actions
 * (issue #41). The gate, the stale propagation and the clearing are pinned
 * here, at the interface.
 *
 * Since issue #46 the display state each pane reports is a single
 * `PaneStatus` computed — `rawStatus`, `reflowedStatus`, `cleanedStatus` —
 * that collapses the machine state under `locked > stale > current > none`.
 * The cases below read those instead of the four booleans they replaced
 * (`reflowedLocked` / `cleanedLocked` / `reflowedStale` / `cleanedStale`).
 */

const ALL_RULES: readonly RuleId[] = presetById(DEFAULT_PRESET_ID).ruleIds;

/** Rule 2 is the join `RAW` exercises; without it the two paragraphs stay split. */
const WITHOUT_RULE_2: readonly RuleId[] = ALL_RULES.filter((id) => id !== 2);

/**
 * A raw transcript small enough to reason about: line 1 has no closing `.`, so
 * a correct reflow glues it to line 2, and line 3 becomes its own paragraph.
 */
const RAW = [
  'This is the first line',
  'of a paragraph.',
  'and the second paragraph follows.',
].join('\n');

/** What level 1 makes of `RAW`. Two paragraphs, no trailing newline (L1-06). */
const REFLOWED =
  'This is the first line of a paragraph.\n\nand the second paragraph follows.';

/** `REFLOWED` under the full rule set: rule 2 joins the `and ` paragraph back. */
const CLEANED =
  'This is the first line of a paragraph and the second paragraph follows.';

describe('the gate', () => {
  it('will not run level 1 on an empty raw pane', () => {
    const s = useTranscriptStages();

    expect(s.canRunLevel1.value).toBe(false);
  });

  it('will not run level 1 on whitespace alone', () => {
    // The gate is `raw.trim()`, not `raw`: a pane holding only newlines has
    // nothing to reflow.
    const s = useTranscriptStages();
    s.editRaw('  \n\n  ');

    expect(s.canRunLevel1.value).toBe(false);
  });

  it('runs level 1 once the raw pane holds text', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);

    expect(s.canRunLevel1.value).toBe(true);
  });

  it('will not run level 2 until level 1 has', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    expect(s.canRunLevel2.value).toBe(false);

    s.runLevel1();
    expect(s.canRunLevel2.value).toBe(true);
  });

  it('makes a direct runLevel1 call inert while the raw pane is blank', () => {
    // The gate lives at the interface, not only on the disabled button.
    const s = useTranscriptStages();
    s.editRaw('  \n\n  ');

    s.runLevel1();

    expect(s.reflowed.value).toBe('');
    expect(s.canRunLevel2.value).toBe(false);
    expect(s.reflowedStatus.value).toBe('locked');
  });

  it('makes a direct runLevel2 call inert until level 1 has run', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);

    s.runLevel2(ALL_RULES);

    expect(s.cleaned.value).toBe('');
    expect(s.cleanedStatus.value).toBe('locked');
  });

  it('locks the reflowed pane until level 1 runs', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    expect(s.reflowedStatus.value).toBe('locked');

    s.runLevel1();
    expect(s.reflowedStatus.value).toBe('current');
  });

  it('locks the cleaned pane until level 2 produces text', () => {
    // The cleaned lock keys on the pane's own emptiness, not a `ranLevel2`
    // flag, so running level 1 must not unlock it.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    expect(s.cleanedStatus.value).toBe('locked');

    s.runLevel2(ALL_RULES);
    expect(s.cleanedStatus.value).toBe('current');
  });
});

describe('the stages', () => {
  it('fills the reflowed pane from the raw pane', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    expect(s.reflowed.value).toBe(REFLOWED);
  });

  it('fills the cleaned pane from the reflowed pane', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);

    expect(s.cleaned.value).toBe(CLEANED);
  });

  it('runs level 2 with only the rule ids it is given', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(WITHOUT_RULE_2);

    // Rule 2 off: the `and ` paragraph is not joined, so the result is the
    // reflowed text unchanged.
    expect(s.cleaned.value).toBe(REFLOWED);
  });

  it('leaves the raw pane untouched by either stage', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);

    expect(s.raw.value).toBe(RAW);
  });

  it('applies level 2 to the reflowed pane as it stands, not a fresh level-1 run', () => {
    // Q13b's repair point: level 2 reads what is in the middle pane, hand edits
    // included; re-running level 1 here would silently discard them.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editReflowed('A hand-repaired paragraph.');
    s.runLevel2(ALL_RULES);

    expect(s.cleaned.value).toBe('A hand-repaired paragraph.');
  });

  it('re-reflows from the edited raw pane', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editRaw('A replacement transcript.');
    s.runLevel1();

    expect(s.reflowed.value).toBe('A replacement transcript.');
  });
});

describe('stale propagation', () => {
  it('marks the reflowed pane stale when the raw pane is edited after a reflow', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editRaw(`${RAW}\nA later thought.`);

    expect(s.reflowedStatus.value).toBe('stale');
  });

  it('keeps the reflowed text while it is stale', () => {
    // The half of Q13b easiest to lose: an upstream edit marks, it never
    // clears. Re-running is the user's decision to discard.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editRaw('A replacement transcript.');

    expect(s.reflowed.value).toBe(REFLOWED);
  });

  it('does not mark the reflowed pane stale for an edit before the first reflow', () => {
    // A stage that has never run cannot be out of date.
    const s = useTranscriptStages();
    s.editRaw(RAW);

    s.editRaw(`${RAW}\nA later thought.`);

    // `locked` wins: a stage that has never run is not stale.
    expect(s.reflowedStatus.value).toBe('locked');
  });

  it('marks both downstream panes stale on one raw edit', () => {
    // The two flags share a handler, and this is the case a user hits:
    // everything has run, then the raw pane changes.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);

    s.editRaw(`${RAW}\nA later thought.`);

    expect(s.reflowedStatus.value).toBe('stale');
    expect(s.cleanedStatus.value).toBe('stale');
    expect(s.cleaned.value).toBe(CLEANED);
  });

  it('marks the cleaned pane stale when the reflowed pane is edited', () => {
    // The middle pane is editable, which makes it an upstream of its own.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);

    s.editReflowed('A hand-repaired paragraph.');

    expect(s.cleanedStatus.value).toBe('stale');
  });

  it('marks the cleaned pane stale when level 1 is re-run', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);

    s.runLevel1();

    expect(s.cleanedStatus.value).toBe('stale');
  });

  it('marks the cleaned pane stale on demand, for a rule-set change the caller owns', () => {
    // The caller owns the preset and the per-rule checkboxes; when that set
    // changes it tells the composable, which owns the staleness bookkeeping.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);

    s.markCleanedStale();

    expect(s.cleanedStatus.value).toBe('stale');
  });

  it('leaves an empty cleaned pane locked rather than stale', () => {
    // `markCleanedStale` guards on the pane holding something; the pane locks
    // on the same emptiness. A stage that has produced nothing is not stale.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editReflowed('A replacement paragraph.');
    s.markCleanedStale();

    expect(s.cleanedStatus.value).toBe('locked');
  });
});

describe('clearing stale', () => {
  it('clears the reflowed stale flag when level 1 is re-run', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.editRaw('A replacement transcript.');

    s.runLevel1();

    expect(s.reflowedStatus.value).toBe('current');
  });

  it('clears the cleaned stale flag when level 2 is re-run', () => {
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);
    s.editReflowed('A hand-repaired paragraph.');

    s.runLevel2(ALL_RULES);

    expect(s.cleanedStatus.value).toBe('current');
  });

  it('does not clear the cleaned stale flag when only level 1 is re-run', () => {
    // Re-running the upstream stage is one more upstream change, not a fix.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.runLevel2(ALL_RULES);
    s.editRaw('A replacement transcript.');

    s.runLevel1();

    expect(s.reflowedStatus.value).toBe('current');
    expect(s.cleanedStatus.value).toBe('stale');
  });
});

describe('the pane statuses', () => {
  it('moves the raw pane from `none` to `current` when it gets text', () => {
    // The raw pane's whole status range: `none` while blank, `current` once
    // it holds something to reflow (#43 Q11).
    const s = useTranscriptStages();
    expect(s.rawStatus.value).toBe('none');

    s.editRaw(RAW);
    expect(s.rawStatus.value).toBe('current');
  });

  it('leaves the raw pane `none` for whitespace alone', () => {
    // Same trim gate as `canRunLevel1`: newlines are not content to reflow.
    const s = useTranscriptStages();
    s.editRaw('  \n\n  ');

    expect(s.rawStatus.value).toBe('none');
  });

  it('reports `none` for a reflowed pane emptied by hand after a run', () => {
    // The value the four booleans could not name: level 1 has run, so the
    // pane is not locked; nothing upstream changed, so it is not stale; it is
    // blank, and that is the user's own deletion, not an error.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editReflowed('');

    expect(s.reflowedStatus.value).toBe('none');
  });

  it('ranks `stale` over `none` for a reflowed pane emptied while stale', () => {
    // The other side of the emptied-pane case: once the raw pane has changed
    // under it, an emptied reflowed pane still asks to be re-run rather than
    // falling back to `none`. `stale` is checked before emptiness.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();
    s.editRaw(`${RAW}\nA later thought.`);

    s.editReflowed('');

    expect(s.reflowedStatus.value).toBe('stale');
  });

  it('ranks `stale` over `current` while the reflowed pane still holds text', () => {
    // Both conditions hold — the pane has a value *and* the raw pane changed
    // under it — and `stale` wins, so the reader is told the text is old.
    const s = useTranscriptStages();
    s.editRaw(RAW);
    s.runLevel1();

    s.editRaw(`${RAW}\nA later thought.`);

    expect(s.reflowed.value).toBe(REFLOWED);
    expect(s.reflowedStatus.value).toBe('stale');
  });
});
