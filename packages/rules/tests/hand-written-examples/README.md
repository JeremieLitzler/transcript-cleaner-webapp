# Hand-written examples

Q15 settled on **(b) and (c)**: golden transcripts as the regression net, hand-written examples as the per-rule specification. This folder is (c).

`packages/rules/tests/golden-transcripts/` proves the port did not change behaviour on real text. It cannot prove a rule is *correct*, and — measured — it does not even exercise six of the eleven rules. These files carry the cases the corpus does not.

## Files

| File | Covers |
| --- | --- |
| `level-1.md` | Reflow, plus the `L1-*` entries in `docs/port-divergences.md` |
| `level-2-rules.md` | One case per advanced rule, in isolation, from the spec's own examples |
| `level-2-divergences.md` | One case per `L2-*` entry in `docs/port-divergences.md` |

## Format

Every case is a heading that names it, one or more marker lines, and exactly two fenced `text` blocks labelled `IN` and `OUT`. `packages/rules/tests/harness/examples.ts` parses this at run time and `hand-written-examples.test.ts` generates one test per case, so the shape matters more than the prose around it. There is no transcribed second copy of any case: this markdown is the artefact (Q24).

### EXAMPLE-ID — one-line description

Status: `unconfirmed` | `confirmed` | `wont-fix`
Runs: `level-1` | `level-2` | `rule-<n>`
Phase: `2` | `llm`

IN

```text
the input
```

OUT

```text
the expected output
```

Anything else on the page is commentary and is ignored. Marker lines may sit anywhere in the case and in any order; only `Status:` is required.

## Status values

- **`unconfirmed`** — written by Claude from the spec or from running the code. Not yet reviewed by Jérémie. Does not become a test until confirmed.
- **`confirmed`** — Jérémie has read it and it is the intended behaviour. Becomes an asserted test.
- **`wont-fix`** — the current behaviour is known-wrong and deliberately kept. The test asserts what the code *does*, and the heading says why.

The status line carries prose as well as the status word, so the parser only looks for the word `unconfirmed`; anything else asserts.

## `Runs:` — what the case is run through

Optional. When it is absent the runner is inferred from the case id: `L1-*` runs level 1, and `RULE-8` and `L2-R08-01` both run rule 8 on its own.

Give it explicitly when the id does not settle the question. Two situations occur today:

- **`L2-R0X-*`** names a quirk of `joined_onto_last` shared by rules 2, 4, 8 and 10, so no rule number can be read off the id. `L2-R0X-01` carries `Runs: rule-2`.
- **A case whose `OUT` is only reachable through the pipeline.** `L2-R02-01` and `L2-R09-01` both show output that a later rule produces, and both carry `Runs: level-2`. Prefer isolation — see below — but when the point of the case is how two rules interact, say so rather than writing an output the rule alone cannot produce.

## `Phase:` — cases that do not assert yet

Optional; absent means the case asserts today. A case that states behaviour the code does not have yet carries a `Phase:` line naming what has to land first, and the suite skips and counts it instead of failing.

- **`Phase: 2`** — the case states what the phase-2 rule changes (issue #3) will do. Phase 1 is a faithful, bug-for-bug port of the Python (issue #2), so these six cases would otherwise fail by design.
- **`Phase: llm`** — rule 7's target, which needs the LLM work in issue #5.

The suite asserts the deferred set against a list in `hand-written-examples.test.ts`, so adding or removing a `Phase:` line is a visible change and not a quiet way to switch a failing test off. Deleting the line is what turns the case on.

## `IN (escaped)` — writing control characters

A block is literal text by default. Label it `IN (escaped)` or `OUT (escaped)` and `\r`, `\n`, `\t` and `\\` in it are decoded, so a case can state a control character rather than contain one.

Only `L1-05` needs this, and it needs it fundamentally: the case is about CRLF input, which a literal block cannot show — the file's own line endings would be whatever the editor last wrote. Everything else stays literal, which is what keeps the cases readable.

## Two rules for whoever writes cases here

**Test each rule in isolation, not through the pipeline.** The spec's examples are written per rule and do not compose — its rule 2 example shows output that still begins with "And", which rule 1 would later strip. A case that runs the whole pipeline is testing something else, and `packages/rules/tests/golden-transcripts/` already tests that. The two `Runs: level-2` cases above are the exceptions, and each says why in its own note.

**Level 2 assumes level 1 has run.** Inputs here are paragraphs separated by blank lines, never raw Vibe output.
