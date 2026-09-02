# Port divergences

Q8 settled that the webapp ports the **code's** behaviour, not the spec's intent, and that each divergence is recorded as an issue rather than silently fixed during the port. This file is that record, and the source list for those issues.

Two documents disagree:

- **The spec** — `coge-transcriptions/docs/formatting/README.md`. Prose, with before/after examples. Describes intent.
- **The code** — `original-scripts/format_transcription.py` (level 1) and `original-scripts/format_advanced.py` (level 2). Deterministic. Describes what actually produced the existing corpus.

Every entry below was verified by running the code, not by reading it. Verified behaviour is quoted as a Python repr so the exact whitespace is visible.

Severity is about the port, not about the corpus: **data loss** means output is destroyed; **wrong output** means the rule produces text the spec says it should not; **missed** means the rule fails to fire where the spec says it should; **unimplementable** means the spec condition is a semantic judgement no deterministic rule can make (the rule 7 problem).

---

## Level 1 — reflow

### L1-01 — `?` and `!` do not end a paragraph — _wrong output, highest impact_

`_format_line` breaks a paragraph only on `.`. A line ending in `?` or `!` is glued to the next line with a space.

```text
IN  : "What is that foundation?\nLet's do a quick summary.\nNext sentence here."
OUT : "What is that foundation? Let's do a quick summary.\n\nNext sentence here."
```

The spec agrees with the code here ("A sentence-ending line ends with a period"), so this is a divergence from _intent_, not from the written spec. It is listed first because it fires on essentially every transcript, and because level 2's rule 5 (capitalise after `?`) exists only to clean up after it.

### L1-02 — a period inside closing punctuation is not a sentence end — _wrong output_

`stripped.endswith(".")` fails when the period is followed by a closing quote, bracket or parenthesis.

```text
IN  : 'He said "I will come."\nThen he left.'
OUT : 'He said "I will come." Then he left.'
```

### L1-03 — an ellipsis forces a paragraph break — _wrong output_

`...` ends with `.`, so a trailing-off sentence is treated as a paragraph boundary mid-thought.

```text
IN  : 'Il a dit...\nEt puis il est parti.'
OUT : 'Il a dit...\n\nEt puis il est parti.'
```

### L1-04 — level 1 has no language-specific behaviour — _not a defect_

Recorded to close an open assumption from Q3b. Level 1 was tested against French input and behaves identically to English: `.` ends a paragraph, everything else is glued. There is no character class, locale, pronoun list or word list anywhere in the script. French exposes no gap that English does not already expose — L1-01 through L1-03 are the whole list, and all three are language-neutral.

---

## Level 2 — advanced rules

### L2-R11-01 — rule 11 can destroy the entire document — _data loss_

Rule 11 truncates from the first paragraph equal to `The Church of God the Eternal.`, wherever it occurs. When the trailer opens the file — which is exactly the shape of the spec's own example — the whole transcript is discarded.

```text
IN  : 'The Church of God the Eternal.\n\nReal content follows here.\n\nMore content.'
OUT : ''
```

### L2-R11-02 — rule 11 matches only an exact whole paragraph — _missed_

`p == _TRAILER`. Any trailing whitespace, casing difference, or the trailer glued to adjacent text by level 1 leaves the entire trailer block in place.

### L2-R02-01 — rule 2 ignores "follows a line ending with a dot" — _wrong output_

The spec requires the preceding line to end with a period. The code checks only `p.startswith("and ")`.

```text
IN  : 'Is that so?\n\nand yet here we are.'
OUT : 'Is that so? And yet here we are.'
```

Note the join is then masked by rule 5, which capitalises after the `?` — so the incorrect join produces text that looks deliberate.

### L2-R02-02 — rule 2's "carry related meaning" is not implemented — _unimplementable_

The spec's third condition is a semantic judgement, the same class of problem as rule 7. The code joins on the literal prefix alone.

### L2-R0X-01 — `rstrip(".")` silently eats ellipses — _wrong output; affects rules 2, 4, 8, 10_

`Paragraphs.joined_onto_last` calls `rstrip(".")` on the previous paragraph, which removes _every_ trailing dot, not one.

```text
IN  : 'He paused there...\n\nand then went on.'
OUT : 'He paused there and then went on.'
```

### L2-R03-01 — rule 3 ignores "follows a line ending with a dot" — _wrong output_

The code capitalises any paragraph whose first character is lowercase, regardless of what precedes it.

```text
IN  : 'Is that so?\n\nyes it is.'
OUT : 'Is that so?\n\nYes it is.'
```

### L2-R03-02 — rule 3 has no "and" exclusion — _wrong output_

The spec excludes a leading "and" in any case. The code does not. Rule 2 normally consumes those paragraphs first, but it cannot join a paragraph with no predecessor, so a document opening with lowercase "and" is capitalised into "And".

```text
IN  : 'and so it begins.\n\nSecond para.'
OUT : 'And so it begins.\n\nSecond para.'
```

### L2-R04-01 — rule 4 cascades past a pair — _wrong output_

The spec describes joining one "But" line to the preceding "But" line. The code tests the accumulated result, so a run of three or more collapses into a single run-on.

```text
IN  : "But they haven't.\n\nBut no one else has.\n\nBut we do."
OUT : "But they haven't and no one else has and we do."
```

### L2-R05-01 — rule 5 matches exactly one space — _missed_

`re.sub(r"\? ([a-z])", ...)`. Two spaces, a tab, or no space at all are not matched.

```text
IN  : "What is that?  let's see."
OUT : "What is that?  let's see."
```

### L2-R06-01 — rule 6 does not re-examine a joined paragraph — _missed_

`_consume_mr_pair` advances the index by two after a join, so if the joined result itself ends in `Mr.`, it is never tested.

```text
IN  : 'Preserved through Mr.\n\nRaymond Cole and Mr.\n\nJohn Brisby spoke.'
OUT : 'Preserved through Mr. Raymond Cole and Mr.\n\nJohn Brisby spoke.'
```

### L2-R06-02 — rule 6 handles only `Mr.` — _scope, not a defect_

`Mrs.`, `Dr.`, `St.` and initials produce the same broken line break and are not handled. The spec also names only `Mr.`, so the code matches the spec; recorded because the underlying problem is broader than the rule.

### L2-R08-01 — rule 8 fails when punctuation follows the pronoun — _missed_

`_is_that_pronoun` compares `words[1].lower()` against `_PRONOUNS` without stripping punctuation, unlike `_first_word` which rule 10 uses. `"they,"` is not in the set.

```text
IN  : "They all proved sooner or later.\n\nThat they, in the end, didn't love it."
OUT : "They all proved sooner or later.\n\nThat they, in the end, didn't love it."

IN  : "They all proved sooner or later.\n\nThat they didn't love it."
OUT : "They all proved sooner or later that they didn't love it."
```

This is the clearest internal inconsistency in the file: two rules solve the same sub-problem, one of them correctly.

### L2-R08-02 — `_PRONOUNS` contains determiners and possessives — _wrong output_

The spec says "followed by a pronoun". The set includes `his`, `her`, `their`, `our`, `my`, `your`, `this`, `these`, `those`, which are determiners or possessive adjectives in this position. The rule fires on constructions the spec does not describe.

### L2-R09-01 — rule 9 compares paragraphs, exactly — _missed_

The spec says "a sentence followed by the exact same sentence". The code compares whole paragraphs with `==`. Duplicates that differ by whitespace or capitalisation survive. In practice rule 9 runs second in the pipeline, before any joins, so paragraphs are still close to sentences — but the two are not the same thing once L1-01 has glued a `?` line onto its successor.

### L2-R10-01 — rule 10's exception is a fixed seven-word list — _unimplementable_

The spec says the exception is "a word implying that the sentence MUST NOT join". The code uses `{how, what, why, when, where, who, lastly}`. Same class as rules 2 and 7.

### L2-R01-01 — rule 1 raises on a bare `"And "` paragraph — _crash_

`_strip_leading_and` indexes `body[0]` without checking that `body` is non-empty. A paragraph consisting of exactly `"And "` raises `IndexError`. Low likelihood, one-line guard.

---

## Spec-internal inconsistency

The spec's rule 2 example shows output that retains a leading "And", which rule 1 — running later in the documented execution order — would strip. The spec's examples are written per rule in isolation and do not compose. Any test derived from a spec example must account for the rest of the pipeline.
