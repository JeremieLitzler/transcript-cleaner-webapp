/**
 * Python string semantics that JavaScript's look-alikes do not share.
 *
 * The port is only worth something if the TypeScript and the Python agree
 * (issue #2), and the places they quietly disagree are all in the string
 * methods the two scripts lean on. Each function here is named after the Python
 * method it reproduces, and each one is measured against CPython rather than
 * read out of the docs — `L1-07` in `docs/port-divergences.md` records what was
 * measured.
 *
 * None of this matters for ASCII or Latin-1 transcripts, which is why it is
 * easy to miss: thousands of generated ASCII and Latin-1 cases run through both
 * implementations with zero mismatches. Every divergence below needs a control
 * character, a byte-order mark, or a script outside the Basic Multilingual
 * Plane — all of which a pasted transcript can contain.
 */

/**
 * The characters for which Python's `str.isspace()` is true, and so the
 * characters `str.strip()` removes and `str.split()` splits on.
 *
 * It differs from JavaScript's `\s` at both ends: Python includes the four
 * information separators `\x1c`–`\x1f` and NEL `\x85`, and excludes the
 * byte-order mark `\uFEFF`, which `String.prototype.trim` removes.
 */
const PY_SPACE =
  '\\t\\n\\v\\f\\r \\x1c\\x1d\\x1e\\x1f\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';

const PY_STRIP_LEADING = new RegExp(`^[${PY_SPACE}]+`);
const PY_STRIP_TRAILING = new RegExp(`[${PY_SPACE}]+$`);
const PY_SPACE_RUN = new RegExp(`[${PY_SPACE}]+`);

/**
 * The characters Python's `str.splitlines()` treats as a line boundary.
 *
 * A near-miss of `PY_SPACE`, not a copy of it: `\x1f` is whitespace but not a
 * line boundary, while `\v`, `\f`, `\x1c`–`\x1e`, `\x85`, `\u2028` and
 * `\u2029` are line boundaries that splitting on `\n` does not see.
 */
const PY_LINE_BOUNDARY = /\r\n|[\n\v\f\r\x1c\x1d\x1e\x85\u2028\u2029]/;

/** Python's `str.strip()`. */
export function pyStrip(text: string): string {
  return text.replace(PY_STRIP_LEADING, '').replace(PY_STRIP_TRAILING, '');
}

/** Python's `str.rstrip()`. */
export function pyStripEnd(text: string): string {
  return text.replace(PY_STRIP_TRAILING, '');
}

/**
 * Python's `str.splitlines()`.
 *
 * Two behaviours beyond the wider boundary set: an empty string yields no lines
 * at all, and a trailing boundary does not produce a trailing empty line, where
 * splitting `'a\n'` on `\n` would give `['a', '']`.
 */
export function pySplitLines(text: string): string[] {
  if (text === '') {
    return [];
  }
  const lines = text.split(PY_LINE_BOUNDARY);
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

/**
 * Python's `str.split()` with no argument: split on runs of whitespace,
 * discarding leading and trailing empties. Splitting on JavaScript's `\s+`
 * would yield a leading `''` instead, which the callers would read as a word.
 */
export function pySplitWhitespace(text: string): string[] {
  const stripped = pyStrip(text);
  return stripped === '' ? [] : stripped.split(PY_SPACE_RUN);
}

/**
 * Python's `text[0]` — the first **code point**, not the first UTF-16 code
 * unit, and an error when there is none.
 *
 * The difference shows on any script outside the Basic Multilingual Plane:
 * `p[0].upper()` capitalises a Deseret or Adlam opening in Python, while
 * `p[0].toUpperCase()` in JavaScript takes half a surrogate pair and changes
 * nothing. Rules 1 and 3 both index this way, and rule 3 is one of the three
 * the Universal preset claims are correct in any language.
 *
 * Throws where Python raises `IndexError`, which keeps `L2-R01-01`'s latent
 * fault latent rather than papering over it.
 */
export function pyFirstCharacter(text: string): string {
  const codePoint = text.codePointAt(0);
  if (codePoint === undefined) {
    throw new RangeError('pyFirstCharacter: string index out of range');
  }
  return String.fromCodePoint(codePoint);
}

/** Python's `str.islower()` for a single character. */
export function pyIsLower(character: string): boolean {
  return (
    character !== character.toUpperCase() &&
    character === character.toLowerCase()
  );
}
