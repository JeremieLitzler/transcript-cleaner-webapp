import { pySplitLines, pyStrip, pyStripEnd } from './python-strings.js';

/**
 * Level 1 — reflow. Ported from `original-scripts/format_transcription.py`.
 *
 * Only `.` ends a paragraph, so a line ending in `?`, `!` or `."` is glued to
 * the next one — those are L1-01 and L1-02 in `docs/port-divergences.md`, and
 * both are intended behaviour. L1-03 (a trailing ellipsis) was the one
 * exception the Python got wrong: `...` ends with `.`, so a trailing-off
 * sentence was split mid-thought. Issue #3 fixes it — the ellipsis is matched
 * before the period rule and treated as a continuation.
 */

/** `_format_line` — a line becomes a paragraph break, a continuation, or nothing. */
function formatLine(line: string): string {
  const stripped = pyStrip(line);
  if (!stripped) {
    return '';
  }
  // L1-03: an ellipsis is a trailing-off sentence, not a paragraph boundary, so
  // it continues like any non-terminal line. This branch exists only to reach
  // that continuation *before* the period check below, which `...` would
  // otherwise satisfy.
  if (stripped.endsWith('...')) {
    return stripped + ' ';
  }
  if (stripped.endsWith('.')) {
    return stripped + '\n\n';
  }
  return stripped + ' ';
}

/**
 * Reflow a raw transcript into blank-line-separated paragraphs.
 *
 * `pySplitLines` is what L1-05 asks for and then some. The catalogued problem is
 * that every raw transcript is CRLF and a browser, unlike Python, does not hide
 * it: split on `\n` alone and every line keeps a trailing `\r`, the period check
 * fails everywhere, and the whole transcript comes back as one paragraph. But
 * `str.splitlines()` also breaks on `\v`, `\f`, the information separators and
 * NEL, so matching only CRLF would leave a narrower gap of the same kind
 * (L1-07).
 *
 * Trailing-newline convention (L1-06): the return value has **no** trailing
 * newline, matching the Python's closing `.rstrip()`. Callers that write a
 * file decide for themselves whether to add one; the golden tests compare
 * after normalising both sides.
 */
export function formatLevel1(rawText: string): string {
  return pyStripEnd(pySplitLines(rawText).map(formatLine).join(''));
}
