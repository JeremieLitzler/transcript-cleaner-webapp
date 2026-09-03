import { normaliseLineEndings } from "../line-endings.js";

/**
 * `Paragraphs` — a faithful port of the class of the same name in
 * `original-scripts/format_advanced.py`.
 *
 * Immutable, as in the Python: every operation returns a new instance, and the
 * rules are written as `result = result.withX(...)` accumulations.
 */
export class Paragraphs {
  private readonly items: readonly string[];

  constructor(items: readonly string[]) {
    this.items = [...items];
  }

  /**
   * `Paragraphs.from_text` — split on runs of two or more newlines, strip each
   * block, drop the empties.
   *
   * The line-ending normalisation is the port's own addition (L1-05): the
   * Python's `re.split(r"\n\n+")` never meets a `\r\n\r\n` separator because
   * level 1 wrote the file through Python's text layer. Level 2 here can be
   * handed anything — a pasted transcript, an edited middle pane — so it
   * normalises on the way in.
   */
  static fromText(text: string): Paragraphs {
    const normalised = normaliseLineEndings(text).trim();
    const parts = normalised.split(/\n\n+/).map((p) => p.trim());
    return new Paragraphs(parts.filter((p) => p !== ""));
  }

  toText(): string {
    return this.items.join("\n\n");
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  lastEquals(paragraph: string): boolean {
    return !this.isEmpty() && this.items[this.items.length - 1] === paragraph;
  }

  lastStartsWith(prefix: string): boolean {
    return (
      !this.isEmpty() && this.items[this.items.length - 1]!.startsWith(prefix)
    );
  }

  truncatedTo(index: number): Paragraphs {
    return new Paragraphs(this.items.slice(0, index));
  }

  withAppended(paragraph: string): Paragraphs {
    return new Paragraphs([...this.items, paragraph]);
  }

  /**
   * `joined_onto_last` — glue `continuation` onto the last paragraph.
   *
   * The `rstrip(".")` is greedy in Python: it removes *every* trailing dot, not
   * one. That is L2-R0X-01 (an ellipsis is swallowed whole) and L2-R0X-02 (a
   * trailing abbreviation loses its period). Both are deliberately preserved.
   */
  joinedOntoLast(separator: string, continuation: string): Paragraphs {
    const last = this.items[this.items.length - 1]!;
    const joined = last.replace(/\.+$/, "") + separator + continuation;
    return new Paragraphs([...this.items.slice(0, -1), joined]);
  }

  at(index: number): string {
    return this.items[index]!;
  }

  get length(): number {
    return this.items.length;
  }

  toArray(): string[] {
    return [...this.items];
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.items[Symbol.iterator]();
  }
}
