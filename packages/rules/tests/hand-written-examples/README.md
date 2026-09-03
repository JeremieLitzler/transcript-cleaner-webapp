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

Every case is three things: a heading that names it, a status line, and exactly two fenced `text` blocks labelled `IN` and `OUT`. The tests parse this, so the shape matters more than the prose around it.

### EXAMPLE-ID — one-line description

Status: `unconfirmed` | `confirmed` | `wont-fix`

IN

```text
the input
```

OUT

```text
the expected output
```

Anything else on the page is commentary and is ignored.

## Status values

- **`unconfirmed`** — written by Claude from the spec or from running the code. Not yet reviewed by Jérémie. Does not become a test until confirmed.
- **`confirmed`** — Jérémie has read it and it is the intended behaviour. Becomes an asserted test.
- **`wont-fix`** — the current behaviour is known-wrong and deliberately kept. The test asserts what the code *does*, and the heading says why.

## Two rules for whoever writes cases here

**Test each rule in isolation, not through the pipeline.** The spec's examples are written per rule and do not compose — its rule 2 example shows output that still begins with "And", which rule 1 would later strip. A case that runs the whole pipeline is testing something else, and `packages/rules/tests/golden-transcripts/` already tests that.

**Level 2 assumes level 1 has run.** Inputs here are paragraphs separated by blank lines, never raw Vibe output.
