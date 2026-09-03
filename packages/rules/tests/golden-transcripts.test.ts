import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatLevel1 } from "../src/level-1.js";
import { formatLevel2 } from "../src/level-2/pipeline.js";

/**
 * The regression net (Q15b) and the acceptance criterion for issue #2: the
 * TypeScript must reproduce the Python's output on real transcripts.
 *
 * Each pair is asserted independently — level 1 against the committed level-1
 * file, level 2 against the committed level-2 file *starting from* the
 * committed level-1 file. Chaining the stages instead would let a level-1
 * regression masquerade as a level-2 one.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(HERE, "golden-transcripts");

/**
 * Two conventions have to be reconciled before a comparison means anything.
 *
 * **Line endings (L1-05).** The transcripts are a mix: the two `*-vibe-*` files
 * and the French pair are CRLF, example 2 is LF. Python never saw the
 * difference; the port normalises on the way in, so the goldens are normalised
 * on the way out too.
 *
 * **The trailing newline (L1-06).** `format_transcription.py` ends with
 * `.rstrip()`, so the Python's output carries no final newline, while the
 * committed goldens all do — that is the only byte that differs between them.
 * The port keeps the Python's convention and the comparison drops the trailing
 * newline from the golden. Nothing else is stripped: any other whitespace
 * difference is a real one and must fail.
 */
function readGolden(name: string): string {
  return readFileSync(join(GOLDEN_DIR, name), "utf8")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n$/, "");
}

interface GoldenPair {
  readonly name: string;
  readonly raw: string;
  readonly level1: string;
  /** French has no level-2 golden: level 2 is English-only by default preset (Q3b, Q26). */
  readonly level2?: string;
}

const PAIRS: readonly GoldenPair[] = [
  {
    name: "English — What is Partiality?",
    raw: "english-raw-vibe-transcript.md",
    level1: "english-level1-transcript.md",
    level2: "english-level2-transcript.md",
  },
  {
    name: "English — Do You See Christ?",
    raw: "english-raw-transcript-example-2.md",
    level1: "english-level1-transcript-example-2.md",
    level2: "english-level2-transcript-example-2.md",
  },
  {
    name: "French",
    raw: "french-raw-vibe-transcript.md",
    level1: "french-level1-transcript.md",
  },
];

describe.each(PAIRS)("$name", (pair) => {
  it("level 1 reproduces the golden reflowed transcript", () => {
    expect(formatLevel1(readGolden(pair.raw))).toBe(readGolden(pair.level1));
  });

  const level2 = pair.level2;
  if (level2 === undefined) return;

  it("level 2 reproduces the golden cleaned transcript", () => {
    expect(formatLevel2(readGolden(pair.level1))).toBe(readGolden(level2));
  });

  it("the two stages compose: raw through level 1 then level 2", () => {
    expect(formatLevel2(formatLevel1(readGolden(pair.raw)))).toBe(
      readGolden(level2),
    );
  });
});

describe("golden transcripts as fixtures", () => {
  it("are CRLF in places, which is what L1-05 is about", () => {
    const crlf = readFileSync(
      join(GOLDEN_DIR, "english-raw-vibe-transcript.md"),
      "utf8",
    );
    expect(crlf).toContain("\r\n");
  });

  it("level 1 on the CRLF file is not one enormous paragraph", () => {
    // The specific regression L1-05 predicts: split on "\n" alone and every
    // line keeps a trailing "\r", `endsWith(".")` fails everywhere, and the
    // whole transcript comes back as a single paragraph.
    const raw = readFileSync(
      join(GOLDEN_DIR, "english-raw-vibe-transcript.md"),
      "utf8",
    );
    const paragraphs = formatLevel1(raw).split("\n\n");
    expect(paragraphs.length).toBeGreaterThan(400);
  });
});
