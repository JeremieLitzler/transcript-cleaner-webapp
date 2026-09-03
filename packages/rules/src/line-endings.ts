/**
 * Line-ending normalisation — L1-05 in `docs/port-divergences.md`.
 *
 * The Python never had to think about this. `str.splitlines()` splits on
 * `\r\n`, `\r` and `\n` alike and keeps none of them, and `str.strip()` would
 * have removed a stray `\r` anyway. A browser gives us neither: splitting on
 * `"\n"` alone leaves a trailing `\r` on every line of a CRLF transcript,
 * which defeats `endsWith(".")` everywhere and collapses the document into a
 * single paragraph.
 *
 * Every raw transcript this project has seen is CRLF, so this runs first,
 * always, on the way into level 1 and level 2.
 */
export function normaliseLineEndings(text: string): string {
  return text.replace(/\r\n|\r/g, "\n");
}
