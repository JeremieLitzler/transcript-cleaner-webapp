# Port divergences

Q8 settled that the webapp ports the **code's** behaviour, not the spec's intent, and that each divergence is recorded as an issue rather than silently fixed during the port. This file is that record, and the source list for those issues.

Two documents disagree:

- **The spec** — `coge-transcriptions/docs/formatting/README.md`. Prose, with before/after examples. Describes intent.
- **The code** — `original-scripts/format_transcription.py` (level 1) and `original-scripts/format_advanced.py` (level 2). Deterministic. Describes what actually produced the existing corpus.

Every entry below was verified by running the code, not by reading it. Verified behaviour is quoted as a Python repr so the exact whitespace is visible.

Severity is about the port, not about the corpus:

- **data loss** means output is destroyed;
- **wrong output** means the rule produces text the spec says it should not;
- **missed** means the rule fails to fire where the spec says it should;
- **unimplementable** means the spec condition is a semantic judgement and no deterministic rule can make (the rule 7 problem).

---

## Triage — your calls from round v03

Your `#### Jeremie's point of view` notes below are the source of this table; it exists so the dispositions can be read in one place. Three entries turned out **not to be defects at all** — your intended behaviour and the code's behaviour agree, and I had mis-read intent as a bug.

The **fires on real text?** column is measured, not guessed: each rule was run in isolation over both English golden pairs — *What is Partiality?* (503 paragraphs) and *Do You See Christ?* (819 paragraphs) — and the touched-paragraph count recorded. `ex.2` means the second transcript covers it and the first does not.

| ID | Disposition | Fires on real text? |
| --- | --- | --- |
| L1-01 `?` / `!` do not end a paragraph | **Not a defect.** Intended: the paragraph continues. | n/a — 79 of 503 paragraphs carry a mid-paragraph `? ` |
| L1-02 period inside closing punctuation | **Not a defect.** Intended: the paragraph continues. | n/a |
| L1-03 ellipsis forces a break | **Fix.** Match the ellipsis explicitly, before the period rule. Ships with L2-R0X-01. | no — zero `...` in any transcript |
| L1-04 no language-specific behaviour | Not a defect. Recorded to close an assumption. | n/a |
| L1-05 CRLF must be normalised before splitting | **Port-only. Fixed in phase 1** — a browser does not hide line endings the way Python does. | yes — every CRLF transcript |
| L1-07 Python vs. JavaScript string methods | **Port-only. Fixed in phase 1** — a divergence between the two implementations is the one defect phase 1 cannot carry. | no — needs a control character, a BOM, or an astral script |
| L2-R11-01 / -02 rule 11 | **Fix, redefined.** Remove from and including `The Church of God the Eternal has just presented`. | 1x in **both** transcripts, but only once redefined |
| L2-R02-01 rule 2 ignores the preceding dot | **Not a defect.** The joined output is what you want. | ex.2 — 1x |
| L2-R02-02 "carry related meaning" | **Keep in the spec as an aspiration**, implemented when rule 7's machinery exists (v04 Q21b). | n/a |
| L2-R0X-01 `rstrip(".")` eats ellipses | **Leave as is**, relying on L1-03 to make it unreachable — the two ship together (v04 Q22b). | no |
| L2-R03-01 / -02 rule 3 | **Fix per the spec prose.** | no — all 5 targets already satisfy the spec's condition |
| L2-R04-01 "But" cascade | **Leave as is for now.** | ex.2 — 2 pairs, still no run of 3+ |
| L2-R05-01 rule 5 whitespace | **Fix per the spec prose.** | no — no `?` with 2+ spaces |
| L2-R06-01 rule 6 skips a second hit | **Fix.** The second hit must match. | **never, and never will** — see below |
| L2-R06-02 `Mrs.` / `Dr.` / `St.` | **Extend the rule.** Scope change, not a bug fix. | no |
| L2-R08-01 punctuation after the pronoun | **Fix.** Be consistent with `_first_word`. | ex.2 — rule 8 fires 1x |
| L2-R08-02 `_PRONOUNS` contains determiners | **Keep the list; amend the spec** to say "a pronoun or determiner" (v04 Q21a). | ex.2 — and the only hit uses a determiner |
| L2-R09-01 duplicate comparison | **Won't fix for now.** | yes — removes 5 paragraphs |
| L2-R10-01 the "Then" exception list | **Unimplementable, agreed.** | yes — joins 2 paragraphs |
| L2-R01-01 unguarded index in rule 1 | **Harden.** Corrected since v03 — it does not crash; the fault is latent. | no — no bare `And` paragraph |

Two consequences worth stating plainly:

1. **Rule 11 as currently coded never fires on real data.** `_TRAILER` is the exact paragraph `The Church of God the Eternal.`, and that paragraph exists in neither transcript — level 1 glues the short closing lines into one long paragraph reading `The Church of God the Eternal has just presented …`. Your redefinition is therefore not a tightening of a working rule, it is the first version of it that does anything. Your wording also matters more than it looks: both transcripts *open* with `The Church of God the Eternal presents …` at paragraph 0, so an anchor of `The Church of God the Eternal` alone would truncate either document to nothing. `has just presented` is what separates the closing from the opening.
2. **Most of the fixes you asked for still change nothing on real text.** Only the rule 11 redefinition alters either transcript's output. That is not an argument against the fixes — it is a measurement of how little coverage even two transcripts give, and it is why the hand-written examples are load-bearing rather than a nice-to-have.

### Coverage of the golden pairs

Measured per rule, in pipeline order, over each English pair. Both reproduce the Python byte-for-byte, so these are the real numbers, not estimates.

| Rule | Ex. 1 — *What is Partiality?* (503 ¶) | Ex. 2 — *Do You See Christ?* (819 ¶) |
| --- | --- | --- |
| 11 remove trailer | **0** | **0** |
| 9 remove duplicates | 5 | 6 |
| 6 `Mr.` join | **0** | **0** |
| 2 `and` join | **0** | 1 |
| 10 `Then` join | 2 | 1 |
| 8 `That` + pronoun | **0** | 1 |
| 4 `But` … `But` | **0** | 2 |
| 7 verbless join | 0 | 0 — no-op by design |
| 1 remove `And` | 80 | 125 |
| 3 capitalise first | 5 | 17 |
| 5 capitalise after `?` | 1 | 2 |

Example 2 closes the gap for rules 2, 4 and 8. **Two rules still have no real-text coverage, for two different reasons.**

**Rule 11 will get coverage the moment I-01 lands.** Both transcripts have exactly one paragraph matching the redefined anchor `The Church of God the Eternal has just presented`, and neither contains the exact paragraph `The Church of God the Eternal.` that the current code looks for. Both also *open* with the `presents` variant at paragraph 0, so both would be destroyed by a shortened anchor. That is now a confirmed pattern rather than a single sample.

**Rule 6 cannot get real-text coverage by adding transcripts, and this is worth understanding before anyone tries.** Its trigger is a paragraph *ending* in `Mr.`, which only occurs when the transcription tool happens to place a line break immediately after `Mr.` on a line that ends with a period. Measured:

| | `Mr.` occurrences in raw | raw lines *ending* in `Mr.` |
| --- | --- | --- |
| Example 1 | 4 | **0** |
| Example 2 | 67 | **0** |

Sixty-seven `Mr.` in example 2 and not one of them at a line end. More striking: the spec's own rule 6 example is drawn from this very sermon —

> `My personal resolve, brethren, is that I will tenaciously defend the truth that God has preserved through Mr.` / `Raymond Cole all of these years.`

— and in the current transcription that sentence arrives **already joined**, as paragraph 756, because this run broke the line at `is that I will tenaciously` instead. The spec's example came from an older transcription of the same audio.

So rule 6's trigger is a property of a particular transcription run, not of the sermons. Re-transcribe and it moves. Its coverage has to come from `packages/rules/tests/hand-written-examples/` permanently, and that is a fact about the rule rather than a gap to be filled.

Rule 8 declining on example 1 is correct behaviour, not a miss: all six `That …` paragraphs there are `That was`, `That is`, `That still`, `That trying` — demonstrative sentences that should stay separate. The rule is right to leave them alone, and it does fire once on example 2.

---

## Level 1 — reflow

### L1-01 — `?` and `!` do not end a paragraph — _wrong output, highest impact_

`_format_line` breaks a paragraph only on `.`. A line ending in `?` or `!` is glued to the next line with a space.

```text
IN  : "What is that foundation?\nLet's do a quick summary.\nNext sentence here."
OUT : "What is that foundation? Let's do a quick summary.\n\nNext sentence here."
```

The spec agrees with the code here ("A sentence-ending line ends with a period"), so this is a divergence from _intent_, not from the written spec. It is listed first because it fires on essentially every transcript, and because level 2's rule 5 (capitalise after `?`) exists only to clean up after it.

#### Jeremie's point of view on L1-01

The example is fine.

If I have

```plaintext
What is that foundation?
Let's do a quick summary.
Next sentence here.
```

It should become:

```plaintext
What is that foundation? Let's do a quick summary.

Next sentence here.
```

What's wrong with that?

### L1-02 — a period inside closing punctuation is not a sentence end — _wrong output_

`stripped.endswith(".")` fails when the period is followed by a closing quote, bracket or parenthesis.

```text
IN  : 'He said "I will come."\nThen he left.'
OUT : 'He said "I will come." Then he left.'
```

#### Jeremie's point of view on L1-02

Same as L1-01:

```plaintext
He said "I will come."
Then he left.
```

should become:

```plaintext
He said "I will come." Then he left.
```

### L1-03 — an ellipsis forces a paragraph break — _wrong output_

`...` ends with `.`, so a trailing-off sentence is treated as a paragraph boundary mid-thought.

```text
IN  : 'Il a dit...\nEt puis il est parti.'
OUT : 'Il a dit...\n\nEt puis il est parti.'
```

#### Jeremie's point of view on L1-03

Match exactly the ellipsis and apply **before** period rule?

### L1-04 — level 1 has no language-specific behaviour — _not a defect_

Recorded to close an open assumption from Q3b. Level 1 was tested against French input and behaves identically to English: `.` ends a paragraph, everything else is glued. There is no character class, locale, pronoun list or word list anywhere in the script. French exposes no gap that English does not already expose — L1-01 through L1-03 are the whole list, and all three are language-neutral.

### L1-05 — the raw transcripts are CRLF, and the port must normalise them — _new, found while verifying the golden pair_

Every file in `packages/rules/tests/golden-transcripts/` ends its lines with `\r\n`. Python hides this twice over: `str.splitlines()` splits on `\r\n` and drops it, `str.strip()` would remove a stray `\r` anyway, and `Path.write_text` re-inserts `\r\n` on Windows. None of that is true in a browser. A TypeScript port that splits on `"\n"` will carry a trailing `\r` into every paragraph, which then defeats `endsWith(".")` on _every single line_ — level 1 would produce one enormous paragraph.

The port must normalise `\r\n` and bare `\r` to `\n` before splitting. This is not a divergence from the Python; it is a divergence the port will introduce if nobody writes it down.

### L1-06 — trailing-newline convention — _settled during the phase-1 port_

`format_transcription.py` ends with `.rstrip()`, so the Python output has no final newline. The golden files as committed do have one. This is the only difference between the Python's output and the committed goldens — content is otherwise byte-identical for all three pairs.

**Settled:** `formatLevel1` and `formatLevel2` return text with **no** trailing newline, keeping the Python's convention. Adding one is a decision for whoever writes a file — the download in the webapp, or the Python batch tool — not for the rule engine, which has no idea whether its output is a file or a textarea.

The comparison in `packages/rules/tests/golden-transcripts.test.ts` therefore normalises the golden on the way in: line endings to `\n` (L1-05), then **one** trailing newline removed. Nothing else is stripped, so any other whitespace difference still fails.

### L1-07 — Python and JavaScript string methods are not the same methods — _new, found by the phase-1 code review; closed in the port_

The same family as L1-05, and found the same way: not a disagreement between the code and the spec, but a disagreement the port introduces if nobody measures it. `str.strip()`, `str.splitlines()`, `str.split()` and `s[0]` all have JavaScript look-alikes that behave differently, and none of the differences show on ASCII or Latin-1 text — thousands of generated ASCII and Latin-1 cases run through both implementations with zero mismatches. The corpus cannot expose any of this; a pasted transcript can.

Measured against CPython 3.14, all four reachable through the public API:

| What | Python | JavaScript look-alike | Example |
| --- | --- | --- | --- |
| Line boundaries | `str.splitlines()` also breaks on `\v`, `\f`, `\x1c`–`\x1e`, `\x85`, `\u2028`, `\u2029` | `split("\n")` sees none of them | `'x\x85y.'` > Python `'x y.'`, naïve TypeScript `'x\x85y.'` |
| Whitespace | `str.strip()` strips `\x1c`–`\x1f` and `\x85`, keeps the BOM | `trim()` strips the BOM, keeps those | `'\uFEFFbom line.'` > Python keeps the BOM, `trim()` eats it |
| Indexing | `s[0]` is the first **code point** | `s[0]` is the first UTF-16 **code unit** | Rule 3 on a Deseret opening: Python capitalises, TypeScript takes half a surrogate pair and changes nothing |
| Bare `split()` | splits on runs, discards leading empties | `split(/\s+/)` yields a leading `''` | `'  a b'` > Python `['a', 'b']`, JavaScript `['', 'a', 'b']` |

The indexing one is the most consequential: rule 3 is one of the three the **Universal (any language)** preset ships as correct in any language, and it would have been silently wrong for every script outside the Basic Multilingual Plane — Deseret, Adlam, Osage, Vithkuqi.

**Closed in the port**, not deferred: phase 1 exists to prove the two implementations agree, so a divergence between them is the one kind of defect it cannot carry. `packages/rules/src/python-strings.ts` reproduces each Python method, and `packages/rules/tests/python-semantics.test.ts` asserts every row above. A differential fuzz of 6,000 generated documents — each of the characters in this table appearing in over a thousand of them — reports zero mismatches at both levels.

---

## Level 2 — advanced rules

### L2-R11-01 — rule 11 can destroy the entire document — _data loss_

Rule 11 truncates from the first paragraph equal to `The Church of God the Eternal.`, wherever it occurs. When the trailer opens the file — which is exactly the shape of the spec's own example — the whole transcript is discarded.

```text
IN  : 'The Church of God the Eternal.\n\nReal content follows here.\n\nMore content.'
OUT : ''
```

#### Jeremie's point of view on L2-R11-01

This rule is to remove the end generic and everything that follows.

It is not the beginning.

Originally, there was a `.` on the last occurence of `The Church of God the Eternal.`. As described in the example of rule 11 and as you can see in the golden transcript, the `.` doesn't exists, so rule 11 should become "Remove anything after and including `The Church of God the Eternal has just presented`".

### L2-R11-02 — rule 11 matches only an exact whole paragraph — _missed_

`p == _TRAILER`. Any trailing whitespace, casing difference, or the trailer glued to adjacent text by level 1 leaves the entire trailer block in place.

#### Jeremie's point of view on L2-R11-02

See comment on L2-R11-01.

### L2-R02-01 — rule 2 ignores "follows a line ending with a dot" — _wrong output_

The spec requires the preceding line to end with a period. The code checks only `p.startswith("and ")`.

```text
IN  : 'Is that so?\n\nand yet here we are.'
OUT : 'Is that so? And yet here we are.'
```

Note the join is then masked by rule 5, which capitalises after the `?` — so the incorrect join produces text that looks deliberate.

#### Jeremie's point of view on L2-R02-01

Why wrong input? The OUT in the example is correct.

### L2-R02-02 — rule 2's "carry related meaning" is not implemented — _unimplementable_

The spec's third condition is a semantic judgement, the same class of problem as rule 7. The code joins on the literal prefix alone.

#### Jeremie's point of view on L2-R02-02

Why is it _unimplementable_?

### L2-R0X-01 — `rstrip(".")` silently eats ellipses — _wrong output; affects rules 2, 4, 8, 10_

`Paragraphs.joined_onto_last` calls `rstrip(".")` on the previous paragraph, which removes _every_ trailing dot, not one.

```text
IN  : 'He paused there...\n\nand then went on.'
OUT : 'He paused there and then went on.'
```

#### Jeremie's point of view on L2-R0X-01

Again, the example shows the expected OUT from IN

### L2-R0X-02 — joining truncates a trailing abbreviation — _new, wrong output; affects rules 2, 4, 8, 10_

Found while working out whether `rstrip(".")` should be greedy. It is a separate problem and nobody has looked at it.

```text
IN  : 'He was born in the U.S.A.\n\nand raised in Kent.'
OUT : 'He was born in the U.S.A and raised in Kent.'

IN  : 'She joined at 9 a.m.\n\nand left at noon.'
OUT : 'She joined at 9 a.m and left at noon.'
```

The period after `U.S.A` and `a.m` belongs to the abbreviation, not to the sentence, but a join cannot tell the difference — the same character ends both. Greedy or single-character stripping behaves identically here, so this is not fixed by anything proposed for L2-R0X-01.

Deterministically this needs an abbreviation list, which is the same shape of approximation as rule 10's exception list. Recorded, not proposed.

### L2-R03-01 — rule 3 ignores "follows a line ending with a dot" — _wrong output_

The code capitalises any paragraph whose first character is lowercase, regardless of what precedes it.

```text
IN  : 'Is that so?\n\nyes it is.'
OUT : 'Is that so?\n\nYes it is.'
```

#### Jeremie's point of view on L2-R03-01

I know this goes against a decision I took but the @/e/git/github/coge-transcriptions/docs/formatting/README.md rules describe well what I had in mind (expect for rule 11 update above)

So apply Rule 3 per specification prose.

### L2-R03-02 — rule 3 has no "and" exclusion — _wrong output_

The spec excludes a leading "and" in any case. The code does not. Rule 2 normally consumes those paragraphs first, but it cannot join a paragraph with no predecessor, so a document opening with lowercase "and" is capitalised into "And".

```text
IN  : 'and so it begins.\n\nSecond para.'
OUT : 'And so it begins.\n\nSecond para.'
```

#### Jeremie's point of view on L2-R03-02

So apply Rule 3 per specification prose.

### L2-R04-01 — rule 4 cascades past a pair — _wrong output_

The spec describes joining one "But" line to the preceding "But" line. The code tests the accumulated result, so a run of three or more collapses into a single run-on.

```text
IN  : "But they haven't.\n\nBut no one else has.\n\nBut we do."
OUT : "But they haven't and no one else has and we do."
```

#### Jeremie's point of view on L2-R04-01

Leave as is for now. I haven't seen this example you gave.

### L2-R05-01 — rule 5 matches exactly one space — _missed_

`re.sub(r"\? ([a-z])", ...)`. Two spaces, a tab, or no space at all are not matched.

```text
IN  : "What is that?  let's see."
OUT : "What is that?  let's see."
```

#### Jeremie's point of view on L2-R05-01

Example should output :

```text
IN  : "What is that?  let's see."
OUT : "What is that?  Let's see."
```

The @/e/git/github/coge-transcriptions/docs/formatting/README.md describes well the rule

### L2-R06-01 — rule 6 does not re-examine a joined paragraph — _missed_

`_consume_mr_pair` advances the index by two after a join, so if the joined result itself ends in `Mr.`, it is never tested.

```text
IN  : 'Preserved through Mr.\n\nRaymond Cole and Mr.\n\nJohn Brisby spoke.'
OUT : 'Preserved through Mr. Raymond Cole and Mr.\n\nJohn Brisby spoke.'
```

#### Jeremie's point of view on L2-R06-01

So the second hit must match indeed

### L2-R06-02 — rule 6 handles only `Mr.` — _scope, not a defect_

`Mrs.`, `Dr.`, `St.` and initials produce the same broken line break and are not handled. The spec also names only `Mr.`, so the code matches the spec; recorded because the underlying problem is broader than the rule.

#### Jeremie's point of view on L2-R06-02

Fair point to add support `Mrs.`, `Dr.`, `St.` and initials.

### L2-R08-01 — rule 8 fails when punctuation follows the pronoun — _missed_

`_is_that_pronoun` compares `words[1].lower()` against `_PRONOUNS` without stripping punctuation, unlike `_first_word` which rule 10 uses. `"they,"` is not in the set.

```text
IN  : "They all proved sooner or later.\n\nThat they, in the end, didn't love it."
OUT : "They all proved sooner or later.\n\nThat they, in the end, didn't love it."

IN  : "They all proved sooner or later.\n\nThat they didn't love it."
OUT : "They all proved sooner or later that they didn't love it."
```

This is the clearest internal inconsistency in the file: two rules solve the same sub-problem, one of them correctly.

#### Jeremie's point of view on L2-R08-01

Let's be consistence then

### L2-R08-02 — `_PRONOUNS` contains determiners and possessives — _wrong output_

The spec says "followed by a pronoun". The set includes `his`, `her`, `their`, `our`, `my`, `your`, `this`, `these`, `those`, which are determiners or possessive adjectives in this position. The rule fires on constructions the spec does not describe.

#### Jeremie's point of view on L2-R08-02

Fair, the spec gives only the `they` example while the code lists more. Is that the issue.

### L2-R09-01 — rule 9 compares paragraphs, exactly — _missed_

The spec says "a sentence followed by the exact same sentence". The code compares whole paragraphs with `==`. Duplicates that differ by whitespace or capitalisation survive. In practice rule 9 runs second in the pipeline, before any joins, so paragraphs are still close to sentences — but the two are not the same thing once L1-01 has glued a `?` line onto its successor.

#### Jeremie's point of view on L2-R09-01

Won't fix for now.

### L2-R10-01 — rule 10's exception is a fixed seven-word list — _unimplementable_

The spec says the exception is "a word implying that the sentence MUST NOT join". The code uses `{how, what, why, when, where, who, lastly}`. Same class as rules 2 and 7.

#### Jeremie's point of view on L2-R10-01

I agree > _unimplementable_.

### L2-R01-01 — rule 1 has an unguarded index, reachable only outside the pipeline — _latent, not a crash in practice_

**Corrected since v03.** I wrote that a paragraph of exactly `"And "` raises `IndexError`. It does not. `Paragraphs.from_text` strips every paragraph on the way in, so the rule sees `"And"`, which fails `startswith("And ")` and passes through untouched:

```text
IN  : 'And \n\nSecond para.'
OUT : 'And\n\nSecond para.'
```

`_strip_leading_and` does still index `body[0]` without checking that `body` is non-empty, so the fault is real — it is simply unreachable while `from_text` is the only entry point. In TypeScript each rule becomes an exported, individually testable function, at which point the guard stops being theoretical. One line, worth having, but this is hardening rather than a defect.

#### Jeremie's point of view on L2-R01-01

I haven't add this, but OK for strengthing the rule.

---

## Spec-internal inconsistency

The spec's rule 2 example shows output that retains a leading "And", which rule 1 — running later in the documented execution order — would strip. The spec's examples are written per rule in isolation and do not compose. Any test derived from a spec example must account for the rest of the pipeline.
