import { describe, expect, it } from 'vitest';
import { formatLevel1 } from '../src/level-1.js';
import { Paragraphs } from '../src/level-2/paragraphs.js';
import {
  rule1RemoveAnd,
  rule3CapitaliseFirst,
} from '../src/level-2/rules.js';

/**
 * The places Python and JavaScript quietly disagree — `L1-07` in
 * `docs/port-divergences.md`.
 *
 * Phase 1 is worth doing only if the TypeScript and the Python actually agree,
 * and the golden transcripts cannot show that they do here: every expectation
 * below needs a control character, a byte-order mark, or a script outside the
 * Basic Multilingual Plane, and the corpus is ASCII and Latin-1 throughout. All
 * of them are ordinary in pasted text.
 *
 * Every expectation was measured by running the original scripts under CPython
 * 3.14, not read out of the documentation.
 */

describe('str.splitlines() breaks on more than \\n, \\r and \\r\\n', () => {
  // Measured: l1("x\x85y.") == "x y." in Python, where splitting on "\n" alone
  // leaves "x\x85y." untouched.
  it.each([
    ['NEL', 'x\x85y.', 'x y.'],
    ['vertical tab', 'vert\vtab.', 'vert tab.'],
    ['form feed', 'form\ffeed.', 'form feed.'],
    ['file separator', 'a\x1cb.', 'a b.'],
    ['group separator', 'a\x1db.', 'a b.'],
    ['record separator', 'a\x1eb.', 'a b.'],
    ['line separator', 'a\u2028b.', 'a b.'],
    ['paragraph separator', 'a\u2029b.', 'a b.'],
  ])('%s ends a line', (_name, input, expected) => {
    expect(formatLevel1(input)).toBe(expected);
  });

  it('the unit separator is whitespace but not a line boundary', () => {
    // \x1f is in str.isspace() and not in str.splitlines(), so it survives
    // mid-line where its three siblings do not.
    expect(formatLevel1('a\x1f b.')).toBe('a\x1f b.');
  });
});

describe('str.strip() is not String.prototype.trim()', () => {
  it('keeps a byte-order mark, which trim() would remove', () => {
    expect(formatLevel1('\uFEFFbom line.')).toBe('\uFEFFbom line.');
  });

  it('strips NEL and the information separators, which trim() would keep', () => {
    expect(formatLevel1('\x85padded line.\x1c')).toBe('padded line.');
  });
});

describe('Python indexes strings by code point, JavaScript by code unit', () => {
  // U+10428 DESERET SMALL LETTER LONG I uppercases to U+10400. Reading p[0] as
  // a UTF-16 code unit takes half the surrogate pair and changes nothing.
  const deseretLower = '\u{10428}pple starts here.';
  const deseretUpper = '\u{10400}pple starts here.';

  it('rule 3 capitalises an astral lowercase opening', () => {
    expect(
      rule3CapitaliseFirst(Paragraphs.fromText(deseretLower)).toText(),
    ).toBe(deseretUpper);
  });

  it('rule 1 capitalises an astral word after removing "And "', () => {
    expect(
      rule1RemoveAnd(Paragraphs.fromText('And \u{10428}pple.')).toText(),
    ).toBe('\u{10400}pple.');
  });
});

describe('Paragraphs.at() reproduces __getitem__', () => {
  const paras = new Paragraphs(['first', 'second']);

  it('counts negative indices back from the end', () => {
    expect(paras.at(-1)).toBe('second');
  });

  it('throws out of range rather than returning undefined', () => {
    expect(() => paras.at(2)).toThrow(RangeError);
    expect(() => new Paragraphs([]).at(0)).toThrow(RangeError);
  });
});
