import { Paragraphs } from './paragraphs.js';
import {
  pyFirstCharacter,
  pyIsLower,
  pySplitWhitespace,
} from '../python-strings.js';

/**
 * The eleven level-2 rules — a faithful port of the rule functions in
 * `original-scripts/format_advanced.py`.
 *
 * Phase 1 (issue #2) ports them bug-for-bug. Every entry in
 * `docs/port-divergences.md` with a "Fix" disposition is deliberately absent
 * here and lands in phase 2 (issue #3); each one is named in the comment on the
 * rule it belongs to, so nobody has to guess whether a quirk is intentional.
 *
 * Each rule takes and returns a `Paragraphs`, and each is exported so it can be
 * tested in isolation — `packages/rules/tests/hand-written-examples/` does
 * exactly that.
 */

/** `_PRONOUNS` — what may follow "That" for rule 8 to fire. */
const PRONOUNS: ReadonlySet<string> = new Set([
  'he', 'she', 'it', 'they', 'we', 'i', 'you',
  'his', 'her', 'their', 'our', 'my', 'your',
  'this', 'these', 'those',
]);

/**
 * `_TRAILER` — rule 11's anchor.
 *
 * This exact paragraph occurs in neither golden transcript, so rule 11 has
 * never fired on real text (L2-R11-01/-02). The redefined anchor,
 * `The Church of God the Eternal has just presented`, is a phase-2 change.
 */
const TRAILER = 'The Church of God the Eternal.';

/** `_THEN_EXCEPTION_WORDS` — words after "Then " that keep the paragraph separate. */
const THEN_EXCEPTION_WORDS: ReadonlySet<string> = new Set([
  'how', 'what', 'why', 'when', 'where', 'who', // interrogatives > new sentence
  'lastly',                                     // sequential marker > new thought
]);

/**
 * `_first_word` — the first whitespace-delimited token with every
 * non-ASCII-letter stripped out, lowercased.
 *
 * Throws on an all-whitespace input, exactly as the Python's `text.split()[0]`
 * raises `IndexError`. Unreachable through `Paragraphs.fromText`, which drops
 * empty paragraphs.
 */
function firstWord(text: string): string {
  const words = pySplitWhitespace(text);
  if (words.length === 0) {
    throw new RangeError('firstWord: no words in the given text');
  }
  return words[0]!.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

/** Rule 11 — remove `The Church of God the Eternal.` and everything after it. */
export function rule11RemoveTrailer(paras: Paragraphs): Paragraphs {
  for (let i = 0; i < paras.length; i += 1) {
    if (paras.at(i) === TRAILER) {
      return paras.truncatedTo(i);
    }
  }
  return paras;
}

/**
 * Rule 9 — remove a paragraph identical to the one immediately before it.
 *
 * The comparison is exact, so duplicates differing only in case or whitespace
 * survive (L2-R09-01, won't-fix).
 */
export function rule9RemoveDuplicates(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  for (const p of paras) {
    if (result.lastEquals(p)) {
      continue;
    }
    result = result.withAppended(p);
  }
  return result;
}

/** `_consume_mr_pair` — take one paragraph, or a joined pair, and say how far to advance. */
function consumeMrPair(
  result: Paragraphs,
  paras: Paragraphs,
  i: number,
): [Paragraphs, number] {
  if (paras.at(i).endsWith('Mr.') && i + 1 < paras.length) {
    return [result.withAppended(paras.at(i) + ' ' + paras.at(i + 1)), i + 2];
  }
  return [result.withAppended(paras.at(i)), i + 1];
}

/**
 * Rule 6 — join a paragraph ending in `Mr.` to the next.
 *
 * Advancing by two means a joined paragraph that itself ends in `Mr.` is never
 * re-examined (L2-R06-01, a phase-2 fix), and only `Mr.` is recognised — not
 * `Mrs.`, `Dr.` or `St.` (L2-R06-02, a phase-2 scope extension).
 */
export function rule6MrJoin(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  let i = 0;
  while (i < paras.length) {
    const [next, advanced] = consumeMrPair(result, paras, i);
    result = next;
    i = advanced;
  }
  return result;
}

/**
 * Rule 2 — join a paragraph starting with lowercase `and ` onto the previous one.
 *
 * The spec also requires the previous paragraph to end with a period; the code
 * checks the prefix alone (L2-R02-01, confirmed as intended).
 */
export function rule2AndJoin(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  for (const p of paras) {
    if (p.startsWith('and ') && !result.isEmpty()) {
      result = result.joinedOntoLast(' ', p);
      continue;
    }
    result = result.withAppended(p);
  }
  return result;
}

/** Whether a `Then ` paragraph joins, or is held back by the exception list. */
function thenJoins(paragraph: string): boolean {
  if (!paragraph.startsWith('Then ')) {
    return false;
  }
  return !THEN_EXCEPTION_WORDS.has(firstWord(paragraph.slice(5)));
}

/**
 * Rule 10 — join a paragraph starting with `Then ` onto the previous one as `then`.
 *
 * The exception is a fixed seven-word list, which the spec describes as a
 * semantic judgement (L2-R10-01, agreed unimplementable).
 */
export function rule10ThenJoin(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  for (const p of paras) {
    if (thenJoins(p) && !result.isEmpty()) {
      result = result.joinedOntoLast(' then ', p.slice(5));
      continue;
    }
    result = result.withAppended(p);
  }
  return result;
}

/**
 * `_is_that_pronoun` — "That" followed by something in `PRONOUNS`.
 *
 * Unlike `firstWord`, this does not strip punctuation, so `That they, ...`
 * fails to match (L2-R08-01, a phase-2 fix).
 */
function isThatPronoun(paragraph: string): boolean {
  const words = pySplitWhitespace(paragraph);
  return (
    words.length >= 2 &&
    words[0] === 'That' &&
    PRONOUNS.has(words[1]!.toLowerCase())
  );
}

/** Rule 8 — join `That <pronoun> ...` onto the previous paragraph as `that <pronoun> ...`. */
export function rule8ThatPronounJoin(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  for (const p of paras) {
    if (isThatPronoun(p) && !result.isEmpty()) {
      const continuation = pySplitWhitespace(p).slice(1).join(' ');
      result = result.joinedOntoLast(' that ', continuation);
      continue;
    }
    result = result.withAppended(p);
  }
  return result;
}

/**
 * Rule 4 — join two consecutive `But ...` paragraphs with `and`.
 *
 * The test is against the accumulated result, so a run of three or more
 * collapses into one (L2-R04-01, left as is).
 */
export function rule4ButButJoin(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  for (const p of paras) {
    if (p.startsWith('But ') && result.lastStartsWith('But ')) {
      result = result.joinedOntoLast(' and ', p.slice(4));
      continue;
    }
    result = result.withAppended(p);
  }
  return result;
}

/**
 * `_strip_leading_and` — drop a leading `And ` and capitalise what follows.
 *
 * `body[0]` is unguarded, exactly as in the Python (L2-R01-01), and
 * `pyFirstCharacter` throws where Python raises `IndexError`. It cannot be
 * reached through `Paragraphs.fromText`, which strips each paragraph, so
 * `'And '` arrives as `'And'` and fails the prefix test. Hardening it is a
 * phase-2 task.
 */
function stripLeadingAnd(paragraph: string): string {
  if (!paragraph.startsWith('And ')) {
    return paragraph;
  }
  const body = paragraph.slice(4);
  const first = pyFirstCharacter(body);
  return first.toUpperCase() + body.slice(first.length);
}

/** Rule 1 — remove a leading `And ` and capitalise the next word. */
export function rule1RemoveAnd(paras: Paragraphs): Paragraphs {
  return new Paragraphs(paras.toArray().map(stripLeadingAnd));
}

/**
 * Rule 3 — capitalise a paragraph that starts in lowercase.
 *
 * Fires regardless of what precedes it and with no `and` exclusion, both of
 * which the spec asks for (L2-R03-01 and -02, phase-2 fixes).
 */
export function rule3CapitaliseFirst(paras: Paragraphs): Paragraphs {
  return new Paragraphs(
    paras.toArray().map((p) => {
      if (p === '') {
        return p;
      }
      const first = pyFirstCharacter(p);
      return pyIsLower(first)
        ? first.toUpperCase() + p.slice(first.length)
        : p;
    }),
  );
}

/**
 * Rule 5 — capitalise the word immediately after a `?` within a paragraph.
 *
 * Matches exactly one space, so two spaces or a tab are missed (L2-R05-01,
 * confirmed as the wanted behaviour).
 */
export function rule5CapitaliseAfterQuestion(paras: Paragraphs): Paragraphs {
  return new Paragraphs(
    paras
      .toArray()
      .map((p) =>
        p.replace(
          /\? ([a-z])/g,
          (_match, letter: string) => '? ' + letter.toUpperCase(),
        ),
      ),
  );
}

/**
 * Rule 7 — join a verbless sentence onto the previous paragraph with a comma.
 *
 * *** REQUIRES AN LLM *** and is a no-op in the Python and here. Deciding
 * whether a sentence has a finite verb is a semantic judgement; even a POS
 * tagger is unreliable on short noun phrases. Out of scope for v1 (Q4);
 * tracked in issue #5.
 */
export function rule7VerblessJoinLLM(paras: Paragraphs): Paragraphs {
  return paras;
}
