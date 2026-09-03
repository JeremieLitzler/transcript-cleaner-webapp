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

A **preset** is a named set of level-2 rules with a default on/off state for each. Level 1 has nothing to configure, so presets apply to level 2 alone. v1 ships two: **COGE (English)** and **Universal (any language)** — see _Presets shipped_ below.

## Settled scope for v1

- **Rule set** — Corpus-specific now, structured as a named preset. _(Q1)_
- **Input** — Plain text only: paste into a textarea, plus optional `.txt` drop. _(Q2)_
- **Language** — Level 1 any language. Level 2 is English-only **by default preset, not by construction** (amended by Q26): eight of its eleven rules key on English literals and cannot fire on other languages, but rules 3, 5 and 9 are language-agnostic and correct anywhere. _(Q3, Q3b, Q26)_
- **Rule 7 (LLM)** — Out of scope for v1. Postponed, not cancelled. _(Q4)_
- **Presentation** — Side-by-side input and output. _(Q5)_
- **Export** — Copy to clipboard **and** download `.txt`. _(Q6)_
- **Python scripts** — Ported to the webapp; `original-scripts/` frozen as provenance. _(Q7)_
- **Spec vs. code** — Port the code's behaviour; every divergence recorded as an issue. _(Q8)_
- **Other script copy** — `coge-transcriptions/transcripts-processing/` stays as it is. _(Q9)_
- **Stack** — Vue 3 + Vite + TypeScript + Tailwind 4 + Vitest. _(Q10)_
- **Rule control** — A checkbox per level-2 rule, all on by default. _(Q12)_
- **Hosting** — Netlify, static only. No `functions` directory until rule 7 has its own round. _(Q11b)_
- **Stages** — Two visible stages with a gate: level 2 cannot run before level 1. Editing the raw pane marks downstream **stale** (dimmed, with a re-run badge) without clearing it. _(Q13b)_
- **Middle pane** — The reflowed pane is editable, and "Apply rules" uses its current content, not a fresh level-1 run. It is the repair point between two lossy stages. _(Q13b)_
- **Verification** — Golden transcripts (`packages/rules/tests/golden-transcripts/`) as the regression net, hand-written examples (`packages/rules/tests/hand-written-examples/`) as the per-rule specification, and `packages/rules/tests/python-semantics.test.ts` for the places Python and JavaScript string methods disagree, which no transcript in the corpus can reach. The UI has a fourth means: component tests in `packages/web/tests/`, mounting SFCs under **`happy-dom`** — chosen over `jsdom` for startup speed, to be revisited only if a test needs a DOM API it lacks. Its Vitest config carries the `vue()` plugin but deliberately not `tailwindcss()`, because these tests assert rendered structure and never computed styles. _(Q15, L1-07, issue #22)_
- **Preset UI** — A preset list. Picking one reveals its rules, all checked; the user unchecks what they do not want. Shape chosen from the prototype: **variant C** — a toolbar chip (`COGE (English) · 11/11 rules`) opening a drawer with presets on the left and rules on the right. Chosen because it leaves the most room for the transcripts. _(Q16, prototype)_
- **Backlog** — Issues for actionable defects; `docs/port-divergences.md` stays the complete record. _(Q17)_
- **Build order** — **Two phases.** Phase 1 ports the Python faithfully and all golden pairs must go green byte-for-byte. Phase 2 applies the agreed rule changes and regenerates the goldens. The point of phase 1 is proof that the TypeScript and the Python agree — it cannot be obtained retroactively. _(Q18)_
- **Trailing newline** — `formatLevel1` and `formatLevel2` return text with no trailing newline, keeping the Python's closing `.rstrip()`. Adding one belongs to whoever writes a file, not to the rule engine, which cannot know whether its output is a file or a textarea. The golden comparison normalises line endings and drops one trailing newline before asserting, and nothing else. _(L1-06, issue #2)_
- **Golden policy** — Goldens track **desired** behaviour. A golden is only ever regenerated in the same commit as the change that justifies it, with the diff explained in the commit message. A regeneration in its own commit is unreviewable. _(Q19)_
- **Rule 2 spec** — "Carry related meaning" stays in the spec as an aspiration, implemented when rule 7's machinery exists. The code joins on the bare `and ` prefix. _(Q21)_
- **Rule 8 spec** — Keep the code's word list; amend the spec to say "a pronoun **or determiner**". The only real-text hit in 1,322 paragraphs uses a determiner (`That his incapacity …`), so narrowing to true pronouns would give rule 8 zero coverage. _(Q21)_
- **Ellipsis** — `rstrip(".")` is left as it is. L1-03 makes the level-2 case unreachable, and the two ship in the same deliverable. _(Q22)_
- **Repo layout** — A workspace with two packages: `packages/rules` (pure TypeScript, no dependencies) and `packages/web` (Vue). The rule engine is importable with no UI. **npm workspaces**, chosen during the phase-1 port because it needs no install step of its own; two packages with one internal dependency do not need pnpm's strictness. _(Q23)_
- **Tests** — A Vitest suite parses `hand-written-examples/` markdown at run time and generates one test per case. The markdown is the artefact that is maintained; there is no transcribed second copy. `confirmed` and `wont-fix` assert, `unconfirmed` is skipped. Every case is currently `confirmed`. Three marker lines were added during the phase-1 port and are documented in that folder's README: `Runs:` (what the case is run through, inferred from the case id when absent), `Phase:` (a case that states behaviour a later issue will introduce — skipped and counted, never silently failing), and an `IN (escaped)` block label so `L1-05` can state CRLF input at all. _(Q24, issue #2)_
- **Fixture location** — Both the golden transcripts and the hand-written examples live under `packages/rules/tests/`, next to the tests that read them. I had proposed keeping the goldens in `docs/` because Q27 makes them a contract shared with the Python batch tool; that was overruled — proximity to the tests wins, and the Python side reaches across repositories either way. _(Q23, Q24, Q27)_
- **File drop** — A drop fills the raw pane and stops; it does not run level 1. It marks reflowed and cleaned stale rather than clearing them, matching Q13b's policy for edits. Drops are accepted anywhere on the page and always target the raw pane; per-pane drop targets were rejected because they add a second entry point to the gate. The filename is remembered and reused for the download (`sermon.txt` > `sermon-cleaned.txt`). _(Q25)_
- **Presets shipped** — **COGE (English)**, all eleven rules. **Universal (any language)**, rules 3, 5 and 9 — the language-agnostic ones. (**Conservative**, from the prototype, is optional.) _(Q26)_
- **Batch** — Stays Python, in `coge-transcriptions/transcripts-processing/`. It is a rare maintenance operation over a git checkout, and git is its undo. The golden transcripts are asserted against both implementations, so drift is detected rather than prevented. _(Q27)_
- **Branch model** — Two branches. `develop` takes the day-to-day work; `main` is what has been released. Adopted together with the release pipeline, because a release triggered by a pull request needs a source and a target, and one branch is neither. _(issue #13)_
- **CI** — A `PR Test & Build Check` workflow on every pull request into `develop` or `main`: `npm ci`, `npm audit signatures`, `npm run check`, `npm run build`. It runs `check` and not `test` because `npm run build` only typechecks `packages/web`; `packages/rules` has no build step, so its `tsc --noEmit` would otherwise never run in CI at all. _(issue #11)_
- **Dependency updates** — Dependabot, weekly, over both the npm workspace and the GitHub Actions pins, targeting `develop`. No `labels:` block: Dependabot applies `dependencies` on its own and creates that label if it is missing, whereas a label named in the config that does not exist is skipped silently. _(issue #12)_
- **Deploy** — Netlify's own Git integration, not a GitHub Actions job. This is Q11b's "Netlify, static only" turned into a mechanism: `netlify.toml` holds the build contract, Netlify holds the trigger. Chosen because the integration gives a deploy preview per pull request for free, which is the part that pays off for a UI whose whole point is visual, and because the two options are alternatives — running both would give one deploy two sources of truth. _(Q11b, issue #13)_
- **Releases** — Conventional commits, read by a vendored `scripts/release/release.sh` (pinned; provenance and setup in `scripts/release/VENDORED.md`). A pull request from `develop` into `main` previews the version and notes that merging would produce; merging it tags and publishes the GitHub release. No changelog is committed back — the GitHub release is the artefact. Ported from `french-gas-stations-scraper` with one deliberate divergence: the source branch is filtered on rather than only declared, so `develop` > `main` is the only thing that cuts a release. Under the reference's logic any branch merged into `main` publishes one, including a `patch-1` branch from a web edit. _(issue #13)_

## Deferred to v2

- Diff view of raw vs. cleaned, behind a toggle (Q5).
- Rule 7 via an LLM call (Q4).
- Batch re-run of the rules across the whole corpus (Q9).

## Where things live

| Path                                          | What it holds                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/rules/src/`                         | The pipeline. No dependencies, no Vue, no DOM. Level 1, the eleven level-2 rules, the presets.                    |
| `packages/rules/src/python-strings.ts`        | Python string semantics JavaScript does not share. Each function is measured against CPython, not read from docs. |
| `packages/rules/tests/harness/`               | The parser that turns the hand-written examples markdown into tests.                                             |
| `packages/web/`                               | The Vue app. Imports `packages/rules`; the dependency never runs the other way.                                  |
| `packages/web/tests/`                         | The component suite, run by `packages/web/vitest.config.ts`. Mounts components under `happy-dom`.                 |
| `original-scripts/`                           | The Python being ported. Frozen as provenance (Q7).                                                              |
| `docs/port-divergences.md`                    | Every place the code and the spec disagree, each with a measured example and a disposition. The complete record. |
| `packages/rules/tests/golden-transcripts/`    | Real before/after pairs. Verified byte-identical to the Python's output.                                         |
| `packages/rules/tests/hand-written-examples/` | One case per rule and per divergence, in isolation.                                                              |
| `docs/grillings/`                             | The scope grilling, one file per round.                                                                          |
| `.github/workflows/`                          | Both pipelines: `pr-build.yml` checks every pull request, `release-bash.yml` previews and publishes releases.     |
| `scripts/release/`                            | The vendored `release.sh` and its provenance. An unmodified upstream copy — read `VENDORED.md` before touching it. |
| `netlify.toml`                                | The build contract for the deploy. The trigger lives in Netlify's Git integration, not in this repo.             |

## Reading the pipeline

Two facts that are not obvious from the code and cost time to rediscover:

- **Rule 11 has never fired.** Its anchor is the exact paragraph `The Church of God the Eternal.`, which level 1 never produces — it glues the short closing lines into one long paragraph. The redefined anchor is `The Church of God the Eternal has just presented`, and the `has just presented` part is load-bearing: the same transcript _opens_ with `The Church of God the Eternal presents …`, and a shorter anchor truncates the document to nothing.
- **Rule 6 will never have real-text coverage, and that is not a gap to fill.** Its trigger is a paragraph _ending_ in `Mr.`, which only happens when the transcription tool puts a line break right after `Mr.` on a line ending in a period. Example 2 contains 67 `Mr.` and not one at a line end. The spec's own rule 6 example comes from that very sermon, but the current transcription joined it already — the example was captured from an older run of the same audio. Re-transcribe and the trigger moves. Rule 6 is covered by hand-written example only.
- **Of the eleven rules, nine do real work across the two English transcripts.** Rule 7 is a no-op by design; rule 11 gets its coverage the moment the redefined anchor lands. That leaves rule 6 as the only permanently uncovered one, which is why the hand-written examples are load-bearing rather than decorative.

## Related repos

- **`coge-transcriptions`** (private) — the corpus these rules were written for. Holds the authoritative prose spec at `docs/formatting/README.md`, and a second copy of both scripts at `transcripts-processing/`. That copy stays; it is the batch tool.
