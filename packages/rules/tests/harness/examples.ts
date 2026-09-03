import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * The parser for `packages/rules/tests/hand-written-examples/`.
 *
 * Q24 settled that the markdown is the artefact that is maintained and that the
 * tests read it at run time — there is no transcribed second copy that can
 * drift. This file turns each `## ` section into a `Case`, and
 * `hand-written-examples.test.ts` turns each `Case` into a test.
 *
 * The shape it expects, per the folder's README:
 *
 *     ## <ID> — <description>
 *
 *     Status: confirmed | unconfirmed | wont-fix
 *     Runs: level-1 | level-2 | rule-<n>        (optional — inferred from <ID>)
 *     Phase: 2 | llm                            (optional — see `phase` below)
 *
 *     IN
 *
 *     ```text
 *     ...
 *     ```
 *
 *     OUT
 *
 *     ```text
 *     ...
 *     ```
 *
 * Everything else on the page is commentary and is ignored.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

/** `packages/rules/tests/hand-written-examples/`. */
export const EXAMPLES_DIR = join(HERE, "..", "hand-written-examples");

export const EXAMPLE_FILES = [
  "level-1.md",
  "level-2-rules.md",
  "level-2-divergences.md",
] as const;

export type ExampleFile = (typeof EXAMPLE_FILES)[number];

/** What to run the case's input through. */
export type Runner =
  | { readonly kind: "level-1" }
  | { readonly kind: "level-2" }
  | { readonly kind: "rule"; readonly ruleId: number };

export interface Case {
  readonly file: ExampleFile;
  readonly id: string;
  readonly description: string;
  /** The raw `Status:` line, which carries prose as well as the status word. */
  readonly statusLine: string;
  /**
   * False when the status line says `unconfirmed`: written from the spec or from
   * running the code, not yet reviewed. `confirmed` and `wont-fix` both assert.
   */
  readonly isConfirmed: boolean;
  /**
   * The phase at which this case starts asserting, from an optional `Phase:`
   * line. Absent (or `1`) means it asserts today. `2` means it states the
   * behaviour that issue #3 will introduce; `llm` means rule 7's target, which
   * needs issue #5. Anything other than `1` is skipped and counted.
   */
  readonly phase: string;
  readonly runner: Runner;
  readonly input: string;
  readonly expected: string;
}

/** Decode the six visible characters `\r\n` and friends in an `(escaped)` block. */
function decodeEscapes(block: string): string {
  return block.replace(/\\(.)/g, (match, char: string) => {
    switch (char) {
      case "r":
        return "\r";
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "\\":
        return "\\";
      default:
        return match;
    }
  });
}

/**
 * Pull out a labelled fenced block. The label is a line of its own — `IN`, or
 * `IN (escaped)` when the block writes control characters as escape sequences
 * rather than as themselves, which `L1-05` needs to state CRLF input at all.
 */
function fencedBlock(body: string, label: "IN" | "OUT"): string {
  const pattern = new RegExp(
    String.raw`^${label}(?<escaped> \(escaped\))?\s*\n+\x60\x60\x60text\n(?<content>[\s\S]*?)\x60\x60\x60`,
    "m",
  );
  const match = pattern.exec(body);
  if (!match?.groups) {
    throw new Error(`No ${label} block found`);
  }
  // The newline before the closing fence belongs to the fence, not the content.
  const content = match.groups["content"]!.replace(/\n$/, "");
  return match.groups["escaped"] ? decodeEscapes(content) : content;
}

/** A single-value marker line such as `Runs: rule-2`. */
function markerLine(body: string, name: string): string | undefined {
  const match = new RegExp(String.raw`^${name}:[ \t]*(.+)$`, "m").exec(body);
  return match?.[1]!.trim();
}

/**
 * What a case runs, when it does not say so itself.
 *
 * `L1-*` is level 1. `RULE-8` and `L2-R08-01` both name rule 8. `L2-R0X-*`
 * names a quirk shared by rules 2, 4, 8 and 10 and so cannot be inferred — those
 * cases carry an explicit `Runs:` line.
 */
function inferRunner(id: string): Runner {
  if (/^L1\b/.test(id)) return { kind: "level-1" };

  const match = /^(?:RULE-|L2-R)(\d+)/.exec(id);
  if (match) return { kind: "rule", ruleId: Number(match[1]) };

  throw new Error(
    `Cannot infer what to run for "${id}" — add an explicit "Runs:" line`,
  );
}

function parseRunner(value: string, id: string): Runner {
  if (value === "level-1") return { kind: "level-1" };
  if (value === "level-2") return { kind: "level-2" };

  const match = /^rule-(\d+)$/.exec(value);
  if (match) return { kind: "rule", ruleId: Number(match[1]) };

  throw new Error(
    `${id}: unknown "Runs: ${value}" — expected level-1, level-2 or rule-<n>`,
  );
}

function parseFile(file: ExampleFile): Case[] {
  const text = readFileSync(join(EXAMPLES_DIR, file), "utf8").replace(
    /\r\n|\r/g,
    "\n",
  );

  // Section headings are `## <ID> — <description>`; the leading chunk is the
  // file's own preamble and carries no case.
  const sections = text.split(/^## /m).slice(1);

  return sections.map((section) => {
    const [heading = "", ...rest] = section.split("\n");
    const body = rest.join("\n");

    const [id = "", ...descriptionParts] = heading.split(" — ");
    const description = descriptionParts.join(" — ").trim();

    const statusLine = markerLine(body, "Status");
    if (statusLine === undefined) {
      throw new Error(`${file}: case "${id}" has no "Status:" line`);
    }

    const runsValue = markerLine(body, "Runs");

    try {
      return {
        file,
        id: id.trim(),
        description,
        statusLine,
        // "confirmed" and "wont-fix" both assert; only "unconfirmed" does not.
        isConfirmed: !/\bunconfirmed\b/.test(statusLine),
        phase: markerLine(body, "Phase") ?? "1",
        runner:
          runsValue === undefined
            ? inferRunner(id.trim())
            : parseRunner(runsValue, id.trim()),
        input: fencedBlock(body, "IN"),
        expected: fencedBlock(body, "OUT"),
      };
    } catch (cause) {
      throw new Error(`${file}: case "${id.trim()}": ${(cause as Error).message}`, {
        cause,
      });
    }
  });
}

export function loadCases(): Case[] {
  return EXAMPLE_FILES.flatMap(parseFile);
}
