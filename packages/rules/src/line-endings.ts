/**
 * Line-ending normalisation — L1-05 in `docs/port-divergences.md`.
 *
 * The Python never had to think about this. Reading a file with
 * `Path.read_text` translates `\r\n` and bare `\r` to `\n` on the way in, and
 * `str.strip()` would have removed a stray `\r` anyway. A browser gives us
 * neither: splitting on `'\n'` alone leaves a trailing `\r` on every line of a
 * CRLF transcript, which defeats `endsWith('.')` everywhere and collapses the
 * document into a single paragraph.
 *
 * This is the translation Python's text layer performs, and no more. Level 1
 * needs a wider set — `str.splitlines()` also breaks on `\v`, `\f`, the
 * information separators and NEL — and gets it from `pySplitLines`; level 2
 * splits paragraphs on `\n\n+`, for which those characters are not boundaries,
 * so this is the right tool there.
 */
export function normaliseLineEndings(text: string): string {
  return text.replace(/\r\n|\r/g, '\n');
}
