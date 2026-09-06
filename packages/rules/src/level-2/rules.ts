import { Paragraphs } from './paragraphs.js';
import {
  pyFirstCharacter,
  pyIsLower,
  pySplitWhitespace,
} from '../python-strings.js';

/**
 * The eleven level-2 rules — ported from the rule functions in
 * `original-scripts/format_advanced.py`.
 *
 * Phase 1 (issue #2) ported them bug-for-bug. Phase 2 (issue #3) applied every
 * "Fix" disposition in `docs/port-divergences.md`: rule 11's redefined anchor
 * (L2-R11-01/-02), rule 3's spec prose (L2-R03-01/-02), rule 5's whitespace
 * (L2-R05-01), rule 6 re-examining a joined paragraph and recognising more
 * titles (L2-R06-01/-02), rule 8 stripping punctuation after the pronoun
 * (L2-R08-01), and rule 1's index guard (L2-R01-01). The dispositions left as
 * is — rule 4's cascade, rule 9's exact compare, rule 10's exception list — are
 * still named in the comment on the rule they belong to.
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
 * Rule 11's anchor (L2-R11-01/-02).
 *
 * The Python's `_TRAILER` was a paragraph *equal to* `The Church of God the
 * Eternal.`, which level 1 never produces — it glues the short closing lines
 * into one long paragraph — so rule 11 never fired. Issue #3 redefines it:
 * remove from and including the first paragraph that *contains* this phrase.
 * `has just presented` is load-bearing: both transcripts also *open* with
 * `The Church of God the Eternal presents …`, and a shorter anchor would
 * truncate the whole document to nothing.
 */
const TRAILER_ANCHOR = 'The Church of God the Eternal has just presented';

/** `_THEN_EXCEPTION_WORDS` — words after "Then " that keep the paragraph separate. */
const THEN_EXCEPTION_WORDS: ReadonlySet<string> = new Set([
  'how', 'what', 'why', 'when', 'where', 'who', // interrogatives > new sentence
  'lastly',                                     // sequential marker > new thought
]);

/**
 * `_first_word`'s normalisation — a token with every non-ASCII-letter stripped
 * out, lowercased. Shared by `firstWord`, `firstWordIsAnd` and `isThatPronoun`
 * so the three stay consistent (that consistency is the point of L2-R08-01).
 */
function normaliseToken(token: string): string {
  return token.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

/**
 * `_first_word` — the first whitespace-delimited token, normalised.
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
  return normaliseToken(words[0]!);
}

/** Rule 11 — remove the closing trailer paragraph and everything after it. */
export function rule11RemoveTrailer(paras: Paragraphs): Paragraphs {
  for (let i = 0; i < paras.length; i += 1) {
    if (paras.at(i).includes(TRAILER_ANCHOR)) {
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

/**
 * Titles rule 6 treats the way the Python treated `Mr.` — a line broken
 * straight after any of them is a transcription artefact, not a sentence end
 * (L2-R06-02). The spec names only `Mr.`; extending it is a scope change agreed
 * in issue #3, not a bug fix.
 */
const HONORIFICS: readonly string[] = ['Mr.', 'Mrs.', 'Dr.', 'St.'];

/** A lone capital-letter initial closing the paragraph, e.g. `… preserved through J.` */
const TRAILING_INITIAL = /(?:^|\s)[A-Z]\.$/;

/** Whether a paragraph ends on a title or initial that a line break should not follow. */
function endsWithHonorific(paragraph: string): boolean {
  return (
    HONORIFICS.some((title) => paragraph.endsWith(title)) ||
    TRAILING_INITIAL.test(paragraph)
  );
}

/**
 * Rule 6 — join a paragraph ending in a title (`Mr.`, `Mrs.`, `Dr.`, `St.`) or
 * an initial onto the next.
 *
 * The join is re-examined: if the joined paragraph itself ends on a title, it
 * absorbs the following paragraph too (L2-R06-01, an issue #3 fix — the Python
 * advanced by two and never looked again).
 */
export function rule6MrJoin(paras: Paragraphs): Paragraphs {
  let result = new Paragraphs([]);
  let i = 0;
  while (i < paras.length) {
    let current = paras.at(i);
    i += 1;
    while (endsWithHonorific(current) && i < paras.length) {
      current = current + ' ' + paras.at(i);
      i += 1;
    }
    result = result.withAppended(current);
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
 * Punctuation is stripped from the second word before the lookup, consistent
 * with `firstWord`, so `That they, in the end, …` now matches (L2-R08-01, an
 * issue #3 fix).
 */
function isThatPronoun(paragraph: string): boolean {
  const words = pySplitWhitespace(paragraph);
  return (
    words.length >= 2 &&
    words[0] === 'That' &&
    PRONOUNS.has(normaliseToken(words[1]!))
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
 * The Python indexed `body[0]` unguarded (L2-R01-01): unreachable through
 * `Paragraphs.fromText`, which strips each paragraph so `'And '` arrives as
 * `'And'` and fails the prefix test, but a real fault now that each rule is a
 * public, individually callable function. Issue #3 adds the one-line guard —
 * `'And '` with nothing after it becomes empty rather than throwing.
 */
function stripLeadingAnd(paragraph: string): string {
  if (!paragraph.startsWith('And ')) {
    return paragraph;
  }
  const body = paragraph.slice(4);
  if (body === '') {
    return body;
  }
  const first = pyFirstCharacter(body);
  return first.toUpperCase() + body.slice(first.length);
}

/** Rule 1 — remove a leading `And ` and capitalise the next word. */
export function rule1RemoveAnd(paras: Paragraphs): Paragraphs {
  return new Paragraphs(paras.toArray().map(stripLeadingAnd));
}

/** Whether a paragraph's first word is "and", in any case — rule 3's exclusion. */
function firstWordIsAnd(paragraph: string): boolean {
  const words = pySplitWhitespace(paragraph);
  return words.length > 0 && normaliseToken(words[0]!) === 'and';
}

/**
 * Rule 3 — capitalise a paragraph that starts in lowercase.
 *
 * Follows the spec prose (L2-R03-01/-02, issue #3 fixes): the previous
 * paragraph must end with a period, and a leading "and" in any case is
 * excluded. The Python capitalised any lowercase opening regardless of what
 * came before it.
 */
export function rule3CapitaliseFirst(paras: Paragraphs): Paragraphs {
  const items = paras.toArray();
  return new Paragraphs(
    items.map((paragraph, index) => {
      if (paragraph === '') {
        return paragraph;
      }
      const previous = index > 0 ? items[index - 1]! : undefined;
      if (previous === undefined || !previous.endsWith('.')) {
        return paragraph;
      }
      const first = pyFirstCharacter(paragraph);
      if (!pyIsLower(first) || firstWordIsAnd(paragraph)) {
        return paragraph;
      }
      return first.toUpperCase() + paragraph.slice(first.length);
    }),
  );
}

/**
 * Rule 5 — capitalise the word immediately after a `?` within a paragraph.
 *
 * Fires regardless of the intervening spaces or tabs — one space, several, or a
 * tab (L2-R05-01, an issue #3 fix; the Python matched a single space only). The
 * gap is limited to spaces and tabs, not `\s`: level 2 also runs on pasted
 * middle-pane text where a paragraph can hold a bare newline, and a `?` at a
 * line break is not the "same sentence" the spec's rule 5 is about. The
 * whitespace itself is preserved.
 */
export function rule5CapitaliseAfterQuestion(paras: Paragraphs): Paragraphs {
  return new Paragraphs(
    paras
      .toArray()
      .map((p) =>
        p.replace(
          /\?([ \t]+)([a-z])/g,
          (_match, gap: string, letter: string) =>
            '?' + gap + letter.toUpperCase(),
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
