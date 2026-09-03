# CONTEXT — Transcript Cleaner WebApp

Project glossary and settled decisions. Written from the grilling rounds in `docs/grillings/2026-09-01-webapp-scope/`. This is a living document: it records what is decided, not what is proposed. Anything still open lives in the current grilling round, not here.

## The three artefacts

The word "transcript" names three different things in this project. It is never used unqualified in code, UI labels or docs.

| Term                    | What it is                                                                                                                                              | Produced by            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Raw transcript**      | What [Vibe](https://thewh1teagle.github.io/vibe/) exports. One utterance per line, mid-sentence line breaks, stray blank lines, no paragraph structure. | The transcription tool |
| **Reflowed transcript** | Blank-line-separated paragraphs. Whitespace normalised, empty lines dropped, mid-sentence lines joined. No advanced rules applied.                      | Level 1                |
| **Cleaned transcript**  | The reflowed transcript with the advanced rules applied.                                                                                                | Level 2                |

"Raw" is the word already used in `coge-transcriptions` (`docs/formatting/README.md`, "Raw Formatting Rules"). The two repos describe the same file with the same word.

## The two levels

| Term        | Script it ports                            | Scope                                        | Language                                             |
| ----------- | ------------------------------------------ | -------------------------------------------- | ---------------------------------------------------- |
| **Level 1** | `original-scripts/format_transcription.py` | Reflow. Universal — works on any transcript. | Language-agnostic. English and French both in scope. |
| **Level 2** | `original-scripts/format_advanced.py`      | The eleven advanced rules. Corpus-specific.  | English only, because only one corpus exists today.  |

Level 2 only operates correctly on output that level 1 has produced. That ordering is guaranteed by construction in the webapp.

## Preset

A **preset** is a named set of level-2 rules with a default on/off state for each. Level 1 has nothing to configure, so presets apply to level 2 alone. v1 ships two: **COGE (English)** and **Universal (any language)** — see *Presets shipped* below.

## Settled scope for v1

- **Rule set** — Corpus-specific now, structured as a named preset. *(Q1)*
- **Input** — Plain text only: paste into a textarea, plus optional `.txt` drop. *(Q2)*
- **Language** — Level 1 any language. Level 2 is English-only **by default preset, not by construction** (amended by Q26): eight of its eleven rules key on English literals and cannot fire on other languages, but rules 3, 5 and 9 are language-agnostic and correct anywhere. *(Q3, Q3b, Q26)*
- **Rule 7 (LLM)** — Out of scope for v1. Postponed, not cancelled. *(Q4)*
- **Presentation** — Side-by-side input and output. *(Q5)*
- **Export** — Copy to clipboard **and** download `.txt`. *(Q6)*
- **Python scripts** — Ported to the webapp; `original-scripts/` frozen as provenance. *(Q7)*
- **Spec vs. code** — Port the code's behaviour; every divergence recorded as an issue. *(Q8)*
- **Other script copy** — `coge-transcriptions/transcripts-processing/` stays as it is. *(Q9)*
- **Stack** — Vue 3 + Vite + TypeScript + Tailwind 4 + Vitest. *(Q10)*
- **Rule control** — A checkbox per level-2 rule, all on by default. *(Q12)*
- **Hosting** — Netlify, static only. No `functions` directory until rule 7 has its own round. *(Q11b)*
- **Stages** — Two visible stages with a gate: level 2 cannot run before level 1. Editing the raw pane marks downstream **stale** (dimmed, with a re-run badge) without clearing it. *(Q13b)*
- **Middle pane** — The reflowed pane is editable, and "Apply rules" uses its current content, not a fresh level-1 run. It is the repair point between two lossy stages. *(Q13b)*
- **Verification** — Golden transcripts (`packages/rules/tests/golden-transcripts/`) as the regression net, hand-written examples (`packages/rules/tests/hand-written-examples/`) as the per-rule specification. *(Q15)*
- **Preset UI** — A preset list. Picking one reveals its rules, all checked; the user unchecks what they do not want. Shape chosen from the prototype: **variant C** — a toolbar chip (`COGE (English) · 11/11 rules`) opening a drawer with presets on the left and rules on the right. Chosen because it leaves the most room for the transcripts. *(Q16, prototype)*
- **Backlog** — Issues for actionable defects; `docs/port-divergences.md` stays the complete record. *(Q17)*
- **Build order** — **Two phases.** Phase 1 ports the Python faithfully and all golden pairs must go green byte-for-byte. Phase 2 applies the agreed rule changes and regenerates the goldens. The point of phase 1 is proof that the TypeScript and the Python agree — it cannot be obtained retroactively. *(Q18)*
- **Golden policy** — Goldens track **desired** behaviour. A golden is only ever regenerated in the same commit as the change that justifies it, with the diff explained in the commit message. A regeneration in its own commit is unreviewable. *(Q19)*
- **Rule 2 spec** — "Carry related meaning" stays in the spec as an aspiration, implemented when rule 7's machinery exists. The code joins on the bare `and ` prefix. *(Q21)*
- **Rule 8 spec** — Keep the code's word list; amend the spec to say "a pronoun **or determiner**". The only real-text hit in 1,322 paragraphs uses a determiner (`That his incapacity …`), so narrowing to true pronouns would give rule 8 zero coverage. *(Q21)*
- **Ellipsis** — `rstrip(".")` is left as it is. L1-03 makes the level-2 case unreachable, and the two ship in the same deliverable. *(Q22)*
- **Repo layout** — A workspace with two packages: `packages/rules` (pure TypeScript, no dependencies) and `packages/web` (Vue). The rule engine is importable with no UI. *(Q23)*
- **Tests** — A Vitest suite parses `hand-written-examples/` markdown at run time and generates one test per case. The markdown is the artefact that is maintained; there is no transcribed second copy. `confirmed` and `wont-fix` assert, `unconfirmed` is skipped. Every case is currently `confirmed`. *(Q24)*
- **Fixture location** — Both the golden transcripts and the hand-written examples live under `packages/rules/tests/`, next to the tests that read them. I had proposed keeping the goldens in `docs/` because Q27 makes them a contract shared with the Python batch tool; that was overruled — proximity to the tests wins, and the Python side reaches across repositories either way. *(Q23, Q24, Q27)*
- **File drop** — A drop fills the raw pane and stops; it does not run level 1. It marks reflowed and cleaned stale rather than clearing them, matching Q13b's policy for edits. Drops are accepted anywhere on the page and always target the raw pane; per-pane drop targets were rejected because they add a second entry point to the gate. The filename is remembered and reused for the download (`sermon.txt` > `sermon-cleaned.txt`). *(Q25)*
- **Presets shipped** — **COGE (English)**, all eleven rules. **Universal (any language)**, rules 3, 5 and 9 — the language-agnostic ones. (**Conservative**, from the prototype, is optional.) *(Q26)*
- **Batch** — Stays Python, in `coge-transcriptions/transcripts-processing/`. It is a rare maintenance operation over a git checkout, and git is its undo. The golden transcripts are asserted against both implementations, so drift is detected rather than prevented. *(Q27)*

## Deferred to v2

- Diff view of raw vs. cleaned, behind a toggle (Q5).
- Rule 7 via an LLM call (Q4).
- Batch re-run of the rules across the whole corpus (Q9).

## Where things live

| Path                                          | What it holds                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `original-scripts/`                           | The Python being ported. Frozen as provenance (Q7).                                                              |
| `docs/port-divergences.md`                    | Every place the code and the spec disagree, each with a measured example and a disposition. The complete record. |
| `packages/rules/tests/golden-transcripts/`    | Real before/after pairs. Verified byte-identical to the Python's output.                                         |
| `packages/rules/tests/hand-written-examples/` | One case per rule and per divergence, in isolation.                                                              |
| `docs/grillings/`                             | The scope grilling, one file per round.                                                                          |

## Reading the pipeline

Two facts that are not obvious from the code and cost time to rediscover:

- **Rule 11 has never fired.** Its anchor is the exact paragraph `The Church of God the Eternal.`, which level 1 never produces — it glues the short closing lines into one long paragraph. The redefined anchor is `The Church of God the Eternal has just presented`, and the `has just presented` part is load-bearing: the same transcript _opens_ with `The Church of God the Eternal presents …`, and a shorter anchor truncates the document to nothing.
- **Rule 6 will never have real-text coverage, and that is not a gap to fill.** Its trigger is a paragraph _ending_ in `Mr.`, which only happens when the transcription tool puts a line break right after `Mr.` on a line ending in a period. Example 2 contains 67 `Mr.` and not one at a line end. The spec's own rule 6 example comes from that very sermon, but the current transcription joined it already — the example was captured from an older run of the same audio. Re-transcribe and the trigger moves. Rule 6 is covered by hand-written example only.
- **Of the eleven rules, nine do real work across the two English transcripts.** Rule 7 is a no-op by design; rule 11 gets its coverage the moment the redefined anchor lands. That leaves rule 6 as the only permanently uncovered one, which is why the hand-written examples are load-bearing rather than decorative.

## Related repos

- **`coge-transcriptions`** — the corpus these rules were written for. Holds the authoritative prose spec at `docs/formatting/README.md`, and a second copy of both scripts at `transcripts-processing/`. That copy stays; it is the batch tool.
