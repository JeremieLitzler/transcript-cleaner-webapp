# CONTEXT — Transcript Cleaner WebApp

Project glossary and settled decisions. Written from the grilling rounds in `docs/grillings/2026-09-01-webapp-scope/`. This is a living document: it records what is decided, not what is proposed. Anything still open lives in the current grilling round, not here.

## The three artefacts

The word "transcript" names three different things in this project. It is never used unqualified in code, UI labels or docs.

| Term | What it is | Produced by |
| --- | --- | --- |
| **Raw transcript** | What Vibe exports. One utterance per line, mid-sentence line breaks, stray blank lines, no paragraph structure. | The transcription tool |
| **Reflowed transcript** | Blank-line-separated paragraphs. Whitespace normalised, empty lines dropped, mid-sentence lines joined. No advanced rules applied. | Level 1 |
| **Cleaned transcript** | The reflowed transcript with the advanced rules applied. | Level 2 |

"Raw" is the word already used in `coge-transcriptions` (`docs/formatting/README.md`, "Raw Formatting Rules"). The two repos describe the same file with the same word.

## The two levels

| Term | Script it ports | Scope | Language |
| --- | --- | --- | --- |
| **Level 1** | `original-scripts/format_transcription.py` | Reflow. Universal — works on any transcript. | Language-agnostic. English and French both in scope. |
| **Level 2** | `original-scripts/format_advanced.py` | The eleven advanced rules. Corpus-specific. | English only, because only one corpus exists today. |

Level 2 only operates correctly on output that level 1 has produced. That ordering is guaranteed by construction in the webapp.

## Preset

A **preset** is a named set of level-2 rules with a default on/off state for each. Level 1 has nothing to configure, so presets apply to level 2 alone. v1 ships one preset: COGE (English).

## Settled scope for v1

| Decision | Value | Source |
| --- | --- | --- |
| Rule set | Corpus-specific now, structured as a named preset | Q1 |
| Input | Plain text only: paste into a textarea, plus optional `.txt` drop | Q2 |
| Language | Level 1 any language; level 2 English only, stated where rules are chosen | Q3, Q3b |
| Rule 7 (LLM) | Out of scope for v1. Postponed, not cancelled. | Q4 |
| Presentation | Side-by-side input and output | Q5 |
| Export | Copy to clipboard **and** download `.txt` | Q6 |
| Python scripts | Ported to the webapp; `original-scripts/` frozen as provenance | Q7 |
| Spec vs. code | Port the code's behaviour; every divergence recorded as an issue | Q8 |
| Other script copy | `coge-transcriptions/transcripts-processing/` stays as it is | Q9 |
| Stack | Vue 3 + Vite + TypeScript + Tailwind 4 + Vitest | Q10 |
| Rule control | A checkbox per level-2 rule, all on by default | Q12 |
| Hosting | Netlify, static only. No `functions` directory until rule 7 has its own round. | Q11b |
| Stages | Two visible stages with a gate: level 2 cannot run before level 1. Editing the raw pane marks downstream **stale** (dimmed, with a re-run badge) without clearing it. | Q13b |
| Middle pane | The reflowed pane is editable, and "Apply rules" uses its current content, not a fresh level-1 run. It is the repair point between two lossy stages. | Q13b |
| Verification | Golden transcripts (`docs/golden-transcripts/`) as the regression net, hand-written examples (`docs/hand-written-examples/`) as the per-rule specification. | Q15 |
| Preset UI | A preset list. Picking one reveals its rules, all checked; the user unchecks what they do not want. | Q16 |
| Backlog | Issues for actionable defects; `docs/port-divergences.md` stays the complete record. | Q17 |

## Deferred to v2

- Diff view of raw vs. cleaned, behind a toggle (Q5).
- Rule 7 via an LLM call (Q4).
- Batch re-run of the rules across the whole corpus (Q9).

## Where things live

| Path | What it holds |
| --- | --- |
| `original-scripts/` | The Python being ported. Frozen as provenance (Q7). |
| `docs/port-divergences.md` | Every place the code and the spec disagree, each with a measured example and a disposition. The complete record. |
| `docs/golden-transcripts/` | Real before/after pairs. Verified byte-identical to the Python's output. |
| `docs/hand-written-examples/` | One case per rule and per divergence, in isolation. |
| `docs/grillings/` | The scope grilling, one file per round. |

## Reading the pipeline

Two facts that are not obvious from the code and cost time to rediscover:

- **Rule 11 has never fired.** Its anchor is the exact paragraph `The Church of God the Eternal.`, which level 1 never produces — it glues the short closing lines into one long paragraph. The redefined anchor is `The Church of God the Eternal has just presented`, and the `has just presented` part is load-bearing: the same transcript *opens* with `The Church of God the Eternal presents …`, and a shorter anchor truncates the document to nothing.
- **Five of the eleven rules do real work on a typical transcript.** Rules 2, 4, 6, 8 and 11 fire on none of the real text captured so far, which is why the hand-written examples are load-bearing rather than decorative.

## Related repos

- **`coge-transcriptions`** — the corpus these rules were written for. Holds the authoritative prose spec at `docs/formatting/README.md`, and a second copy of both scripts at `transcripts-processing/`. That copy stays; it is the batch tool.
