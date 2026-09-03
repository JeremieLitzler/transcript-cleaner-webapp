import { normaliseLineEndings } from "./line-endings.js";

/**
 * Level 1 — reflow. A faithful port of `original-scripts/format_transcription.py`.
 *
 * Bug-for-bug by design (issue #2, phase 1). In particular: only `.` ends a
 * paragraph, so a line ending in `?`, `!`, `."` or `...` is glued to the next
 * one. Those are L1-01, L1-02 and L1-03 in `docs/port-divergences.md`; L1-01
 * and L1-02 are intended behaviour, L1-03 is a phase-2 fix (issue #3).
 */

/** `_format_line` — a line becomes a paragraph break, a continuation, or nothing. */
function formatLine(line: string): string {
  const stripped = line.trim();
  if (!stripped) return "";
  if (stripped.endsWith(".")) return stripped + "\n\n";
  return stripped + " ";
}

/**
 * Reflow a raw transcript into blank-line-separated paragraphs.
 *
 * Trailing-newline convention (L1-06): the return value has **no** trailing
 * newline, matching the Python's closing `.rstrip()`. Callers that write a
 * file decide for themselves whether to add one; the golden tests compare
 * after normalising both sides.
 */
export function formatLevel1(rawText: string): string {
  const lines = normaliseLineEndings(rawText).split("\n");
  return lines.map(formatLine).join("").trimEnd();
}
