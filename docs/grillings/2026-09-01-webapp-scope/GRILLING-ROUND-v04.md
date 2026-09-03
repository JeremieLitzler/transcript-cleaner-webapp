# Grilling round v04 — Transcript Cleaner WebApp: what v1 actually is now

## Settled in v03

- **Q3c — Level 1:** (a). Port level 1 as it is; file the punctuation gaps for later.
- **Q11b — Hosting:** (b). Netlify, static only. No `functions` directory until rule 7 has its own round.
- **Q13b — The gate:** (c). Editing the raw pane marks downstream stale without clearing it, and the reflowed pane is editable.
- **Q15 — Verification:** (b) and (c). Golden transcripts as the regression net, hand-written examples as the per-rule specification. You supplied `docs/golden-transcripts/`; I have scaffolded `docs/hand-written-examples/`.
- **Q16 — Presets:** you want the selector after all, plus a prototype. Preset list first; picking one reveals its rules, all checked; the user unchecks what they do not want. That is Q16(b) plus Q12, and it settles the question I left open — the English-only statement now has a named thing to attach to.
- **Q17 — Backlog:** issues for actionable defects, `docs/port-divergences.md` stays the complete record. The list you asked for is below.

## What I did since v03

1. **Verified all three golden pairs against the Python.** They reproduce **exactly** — `english-raw > english-level1`, `english-level1 > english-level2`, and `french-raw > french-level1` are byte-identical to what `format_transcription.py` and `format_advanced.py` produce, with one trivial exception (trailing newline, L1-06). They are valid fixtures and the regression net is real.
2. **Triaged every disposition you wrote into `docs/port-divergences.md`,** as a table at the top of that file, with a measured "does this fire on the golden pair?" column. Your `#### Jeremie's point of view` sections are untouched.
3. **Scaffolded `docs/hand-written-examples/`** — a README stating the format, `level-1.md`, `level-2-rules.md` (all eleven spec examples transcribed, plus two for the redefined rule 11), and `level-2-divergences.md` (one case per catalogue entry, every `IN`/`OUT` measured by running the code). Everything is marked `unconfirmed` except the handful your v03 words settle outright.
4. **Corrected one of my own v03 claims.** I wrote that rule 1 raises `IndexError` on a bare `"And "` paragraph. It does not — `Paragraphs.from_text` strips every paragraph, so the rule sees `"And"`, which fails the `"And "` prefix test and passes through. The fault is real but unreachable while `from_text` is the only entry point. Catalogue and examples both corrected; it is now "harden", not "fix".

## What I found since v03

### Finding 4 — rule 11 has never fired, on anything

Your redefinition is not a tightening of a working rule. It is the first version of it that does anything at all.

`_TRAILER` is the exact paragraph `The Church of God the Eternal.`, and that paragraph **does not exist** in the golden transcript — level 1 glues the short closing lines into one long paragraph beginning `The Church of God the Eternal has just presented What is Partiality? …`. Measured over all 503 paragraphs, rule 11 touches zero. Which is why the trailer is still sitting at the bottom of `english-level2-transcript.md`.

Your wording also matters more than it looks. Paragraph 1 of the same transcript reads `The Church of God the Eternal presents What is Partiality? …`. An anchor of `The Church of God the Eternal` alone matches it, and rule 11 truncates from the first match — so the whole transcript becomes the empty string. `has just presented` is the entire difference between a working rule and total data loss. It is now pinned by two cases in `level-2-rules.md`.

### Finding 5 — six of the eleven rules never fire on the golden pair

Measured per rule, in pipeline order, over the English pair:

| Rule                | Paragraphs touched |     | Rule                   | Paragraphs touched |
| ------------------- | ------------------ | --- | ---------------------- | ------------------ |
| 11 remove trailer   | **0**              |     | 4 `But`…`But`          | **0**              |
| 9 remove duplicates | 5                  |     | 7 verbless join        | 0 (no-op)          |
| 6 `Mr.` join        | **0**              |     | 1 remove `And`         | 80                 |
| 2 `and` join        | **0**              |     | 3 capitalise first     | 5                  |
| 10 `Then` join      | 2                  |     | 5 capitalise after `?` | 1                  |
| 8 `That` + pronoun  | **0**              |     |                        |                    |

Rule 8 declining is correct, not a miss: all six `That …` paragraphs in the transcript are `That was`, `That is`, `That still`, `That trying` — demonstratives that should stay separate.

**And here is the sharp end of it: of every fix you asked for in v03, only the rule 11 redefinition changes the golden output at all.** No paragraph ends in `Mr.`; there is no `?` followed by two spaces; there is no bare `And`; there is no run of three `But`s; there is not a single `...` in either transcript; and all five rule 3 targets already satisfy the spec condition you asked me to enforce. That is not an argument against the fixes. It is a measurement of how little one transcript proves, and it drives Q20.

### Finding 6 — the raw transcripts are CRLF, and that will break the port

Every file in `docs/golden-transcripts/` uses `\r\n`. Python hides this completely: `splitlines()` drops `\r\n`, `strip()` would remove a stray `\r` anyway, and `write_text` puts `\r\n` back on Windows. None of that is true in a browser.

A TypeScript port that splits on `"\n"` carries a trailing `\r` into every line, which defeats `endsWith(".")` on **every line in the file** — level 1 would return one enormous paragraph and look catastrophically broken. This is not a divergence from the Python; it is one the port will invent if nobody writes it down. It is now `L1-05`, with a test case.

### Finding 7 — joining truncates abbreviations, and nobody has looked at this

```text
IN  : 'He was born in the U.S.A.\n\nand raised in Kent.'
OUT : 'He was born in the U.S.A and raised in Kent.'
```

The period belongs to the abbreviation, not the sentence, but a join cannot tell — the same character ends both. Affects rules 2, 4, 8 and 10. Recorded as `L2-R0X-02`; not proposed for a fix, because deterministically it needs an abbreviation list, which is the same shape of approximation as rule 10's exception list.

---

## The issue list you asked for (Q17)

Tick the ones to open. Each would carry its catalogue ID in the title so `docs/port-divergences.md` and the tracker stay in step.

### Group A — level 2 rule changes from your v03 dispositions

| #    | Title                                                                                                       | Covers               | Changes golden output?        |
| ---- | ----------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- |
| I-01 | Rule 11: anchor on "The Church of God the Eternal has just presented", remove from and including it         | L2-R11-01, L2-R11-02 | **yes** — removes 1 paragraph |
| I-02 | Rule 3: apply the spec prose (previous paragraph must end in a period; exclude a leading "and" in any case) | L2-R03-01, L2-R03-02 | no                            |
| I-03 | Rule 5: capitalise after "?" regardless of intervening whitespace                                           | L2-R05-01            | no                            |
| I-04 | Rule 6: re-examine a joined paragraph so a second "Mr." also matches                                        | L2-R06-01            | no                            |
| I-05 | Rule 6: extend to "Mrs.", "Dr.", "St." and initials                                                         | L2-R06-02            | no                            |
| I-06 | Rule 8: strip punctuation before testing the second word, consistent with `_first_word`                     | L2-R08-01            | no                            |
| I-07 | Rule 1: guard the unguarded index once each rule is separately callable                                     | L2-R01-01            | no                            |

### Group B — level 1

| #    | Title                                                                                         | Covers          | Changes golden output?      |
| ---- | --------------------------------------------------------------------------------------------- | --------------- | --------------------------- |
| I-08 | Level 1: an ellipsis must not end a paragraph; match it before the period rule                | L1-03           | no                          |
| I-09 | Level 1: normalise CRLF and bare CR before splitting                                          | L1-05           | no, but **blocks the port** |
| I-10 | Review level-1 sentence boundaries against a French corpus once more French transcripts exist | Q3c "Finding 2" | n/a                         |

### Group C — deferred features you explicitly asked to be issues

| #    | Title                                                                                               | Covers   |
| ---- | --------------------------------------------------------------------------------------------------- | -------- |
| I-11 | Rule 7 via an LLM: hold its own grilling round (auth, spend cap, failure behaviour), then implement | Q4, Q11b |
| I-12 | Batch re-run of the rules across the whole corpus                                                   | Q9       |

### Group D — testing

| #    | Title                                                                                                               | Covers    |
| ---- | ------------------------------------------------------------------------------------------------------------------- | --------- |
| I-13 | Add golden pairs until every rule fires at least once — rules 2, 4, 6, 8 and 11 are currently untested by real text | Finding 5 |

➡️ Recommendation: **open I-01, I-09, I-11, I-12 and I-13 now — five, not thirteen.**

I-01 changes behaviour and invalidates a fixture. I-09 will break the port on day one if it is not written down. I-11 and I-12 you asked for explicitly, and both are design rounds rather than tasks, so they need somewhere to sit that is not the catalogue. I-13 is the one piece of work Finding 5 proves is missing.

**I-02 through I-08 I would not open**, and the reason is specific rather than tidiness: every one of them is "while porting rule N, implement it this way rather than that way". They are not separable from the port task — you cannot do the port and then do them — and a tracker full of issues that are really acceptance criteria for one commit makes the port look thirteen times bigger than it is. `docs/port-divergences.md` already carries each one with a measured example and a disposition, and `docs/hand-written-examples/` will carry each one as a failing test. That is a better record than an issue.

### Answer to Q17

Go for recommendation

---

## Q18 - Q8 is dead. Say what v1 is instead.

Q8 settled: port the code's behaviour, bug-for-bug, and file every divergence. Your v03 dispositions then changed rules 1, 3, 5, 6 (twice), 8 and 11, plus level 1's ellipsis handling. That is seven changes across a majority of the pipeline. What is left being ported unchanged is rules 2, 4, 9 and 10 — and three of those are "won't fix" or "unimplementable" rather than "faithful".

**So v1 is not a port. It is a reimplementation of the spec, with a handful of deliberate exceptions.** That is a perfectly good thing to build, but it should be said out loud, because two things depend on it: v1 output will not match the published corpus, so any corpus re-run becomes a re-publish; and the level-2 golden stops being a target and becomes a baseline (which is Q19).

- **a)** Accept it. v1 is "the spec, as amended in v03". Rewrite Q8's answer, and let `docs/port-divergences.md` document where the app departs from the Python.
- **b)** Two phases. Port faithfully first and watch all three goldens go green byte-for-byte. Then apply the seven fixes as a second commit, regenerating the goldens with a reviewed diff.
- **c)** Revert to Q8 as written: port as-is, file everything, ship v1 identical to the Python.

➡️ Recommendation: **(b)**. It costs one extra commit and buys the only thing you cannot get retroactively: proof that the TypeScript and the Python agree. Once the fixes are in, a golden diff is ambiguous forever — you will not be able to tell a fix you chose from a port bug you did not notice, and the divergences you are fixing are exactly the fiddly, easy-to-mistranslate ones. Do the faithful port, go green, then fix. (a) throws that proof away for nothing, since you end up in the same place a day later. (c) ignores decisions you have already made and I am not going to argue you back into it.

### Answer to Q18

go for (b). That means two issues.

---

## Q19 - Once a rule is fixed, what do the golden files assert?

The moment I-01 lands, `english-level2-transcript.md` is stale by exactly one paragraph. This will happen again with every fix that touches real text, so the policy matters more than this instance.

- **a)** Goldens are frozen as the Python's behaviour, permanently. Fixed rules are asserted only in `docs/hand-written-examples/`. The level-2 golden test becomes a port-fidelity test that is expected to fail once and then be retired.
- **b)** Goldens track desired behaviour. They are regenerated whenever a fix justifies it, in the same commit as the fix, with the diff in the commit message.
- **c)** Keep both files: `english-level2-python.md` frozen, `english-level2-expected.md` current.

➡️ Recommendation: **(b)**, and it composes with Q18(b): phase one asserts the frozen goldens, phase two regenerates them once, and from then on a golden is only ever regenerated in the same commit as the change that justifies it. The discipline that makes this safe is the "same commit" part — a regeneration in its own commit is unreviewable, because the diff has nothing to be explained by. (c) doubles the fixture for a distinction that only matters during the port week.

### Answer to Q19

Go for recommendation.

---

## Q20 - How many more golden pairs, and which?

Finding 5 measured it: rules 2, 4, 6, 8 and 11 are exercised by no real text you have given me, and rule 11 is the one you just redefined. In v03 I guessed twenty to thirty pairs. That was wrong in both directions — you do not need thirty, and one is not enough.

- **a)** Accept the current pair. Hand-written examples cover the untested rules; goldens are only a net for what real text happens to contain.
- **b)** Add English pairs until every rule fires at least once — probably two to four more, chosen by which rules they trigger rather than at random.
- **c)** Add pairs opportunistically, whenever a transcript happens to break something.

➡️ Recommendation: **(b)**. The distinction that matters is what the two kinds of test can prove: a hand-written example proves a rule does the right thing to text I wrote to make it do the right thing; a golden pair proves a rule does the right thing to text nobody was thinking about when they wrote the rule. Rules 6, 8 and 11 are precisely where I would expect real sermons to surprise you, and they currently have zero real-text coverage. Two to four transcripts is an hour of your time and it closes the gap permanently.

One thing to keep as it is: **the French pair should stay level-1 only.** It is doing a different job — proving level 1 is language-agnostic — and it does that well. Level 2 is English-only by Q3b, so a French level-2 golden would assert something you have decided not to support.

### Answer to Q20

I added example 2 in @docs/golden-transcripts with the actual sermon I used for establishing all the rules.

---

## Q21 - Your two questions, answered — and the decision each one leaves

**You asked, on L2-R02-02: "Why is it _unimplementable_?"**

Fair challenge, and my word was too strong. It is not impossible; it is undecidable _deterministically_. To know whether "and especially for those of you, that are looking to me for that leadership" continues the previous sentence's thought, you have to understand both sentences. String rules can approximate it — does the previous paragraph end mid-clause, is the "and" followed by a noun phrase — and every approximation has counterexamples in both directions. It is the same class of problem as rule 7, so it needs the same tool: a model, or a human.

But that answer raises a better question. You already told me R02-01 is **not** a defect — you are happy with rule 2 joining on the bare `and ` prefix. So what work is the "carry related meaning" condition doing in the spec at all?

- **a)** Strike it from the spec. The prefix is the rule, and that is what has produced every transcript you have published.
- **b)** Keep it as an aspiration, implemented when rule 7's machinery exists.
- **c)** Keep it, and gate rule 2 behind the LLM when rule 7 ships.

➡️ Recommendation: **(a)**. You have watched the prefix-only behaviour run over a real corpus and accepted the result. A spec condition that is never implemented, never missed, and never noticed is not an aspiration — it is a line in the document that is not true. (c) is worse than it sounds: it would make your cheapest, most reliable rule depend on a network call.

**You asked, on L2-R08-02: "the spec gives only the `they` example while the code lists more. Is that the issue."**

Yes, exactly that. The spec says "a pronoun" and illustrates with `they`. The code turns "a pronoun" into sixteen words, and nine of them — `his`, `her`, `their`, `our`, `my`, `your`, `this`, `these`, `those` — are determiners in that slot, not pronouns. So the rule fires on constructions the spec never described. Verified:

```text
IN  : 'He set out the whole argument.\n\nThat this was never about the money.'
OUT : 'He set out the whole argument that this was never about the money.'
```

Whether that is wrong is genuinely your call, and I will say plainly that it reads fine to me. Measured, rule 8 never fires on the golden transcript at all.

- **a)** Keep the list as it is, and amend the spec to say "a pronoun or determiner", listing them.
- **b)** Narrow the code to true pronouns — `he`, `she`, `it`, `they`, `we`, `I`, `you` — matching the spec as written.
- **c)** Widen it: join whenever the word after "That" is not a verb.

➡️ Recommendation: **(a)**. Zero observed misfires, and the determiner joins are grammatical English. (b) would delete correct behaviour to satisfy a word choice in a prose document — the spec is the thing that is imprecise here, not the code. (c) needs to know what a verb is, which is rule 7 again.

### Answer to Q21

(b) and (a)

---

## Q22 - You have given the ellipsis two opposite fates

On **L1-03** you asked for the ellipsis to be matched explicitly so it does not end a paragraph — `Il a dit...` keeps its dots and the sentence continues. On **L2-R0X-01** you said the expected output is `He paused there and then went on.` — where the ellipsis is deleted outright.

Both cannot be the principle. There is a resolution by construction: once L1-03 lands, level 1 has already joined `He paused there...` to its successor, so no paragraph reaching level 2 ends in an ellipsis and `rstrip(".")` never sees one. But relying on that leaves a rule that is wrong on its own terms, in code that Q10 says you will come back to in a year.

- **a)** Make the join preserve a trailing ellipsis — join with a space and keep the dots — and strip a single sentence-ending period otherwise.
- **b)** Leave `rstrip(".")` as it is and rely on L1-03 making the ellipsis case unreachable.
- **c)** Leave it entirely; L2-R0X-01's output is fine as you said.

➡️ Recommendation: **(a)**. It makes the two decisions agree, and it costs one conditional. What it does _not_ fix is Finding 7 — `U.S.A.` still becomes `U.S.A` when joined, and that is unfixable without an abbreviation list. Worth knowing that (a) is a consistency fix, not a correctness one. If you would rather not touch it, (b) is honest as long as L1-03 actually ships, and the risk is simply that the two land in different weeks.

### Answer to Q22

(b) joining the L1-03 and L2-R0X-01 in the same deliverable.

---

## Held for v05

**The Q16 prototype.** You asked for one, and it is the natural next artefact — a preset list, a rule list that appears when a preset is picked, the Q13b gate with its stale badge, and the editable middle pane. That is a build task rather than a question, so it is not asked here; say the word and it goes ahead on the Q10 stack.

Also deliberately not asked yet: **what the README becomes** at the end of the grilling; **how the `.txt` drop from Q2 interacts with the gate**; and **whether batch re-run is a browser feature at all** — four thousand files through a directory picker is a different app from a textarea, and it may want to stay Python.
