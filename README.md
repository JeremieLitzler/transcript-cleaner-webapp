# Transcript Cleaner WebApp

[Vibe](https://thewh1teagle.github.io/vibe/) transcribes audio and video, but its output is not neat: one utterance per line, sentences broken mid-clause, no paragraphs. This is a small static webapp that cleans that output into something readable, in two stages.

**The distinction that matters, and the one the original brief got wrong:**

- **Level 1 — reflow.** Normalises whitespace, drops blank lines, joins mid-sentence breaks, and forms paragraphs. Universal: it works on **any transcript in any language**.
- **Level 2 — advanced rules.** Eleven rules encoding the conventions of one corpus, the [COGE sermon transcripts](https://github.com/JeremieLitzler/coge-transcriptions). Shipped as a named **preset**, so a second one can be added without a rewrite. The COGE preset is English-only; a _Universal_ preset carries the three rules that are correct in any language.

Paste a transcript or drop a `.txt`, run level 1, optionally run level 2 with the rules you want, then copy or download the result. No backend, no API key, no transcript leaving the browser.

## Status

**Phase 1 done.** The pipeline is ported to TypeScript, faithfully — bug-for-bug, no fixes (issue #2). All three golden pairs reproduce the Python's output byte-for-byte. Phase 2 applies the agreed rule changes and regenerates the goldens (issue #3); the UI beyond a scaffold is still to come.

The scope is settled across five grilling rounds and the work is tracked in [issues](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues).

## Running it

An npm workspace: `packages/rules` is the pipeline, with no dependencies and no UI, and `packages/web` is the Vue app that imports it. The dependency never runs the other way.

```bash
npm install
npm test          # the golden pairs and the hand-written examples
npm run typecheck # both packages
npm run dev       # the web app, on Vite's default port
```

`npm test` reads its fixtures straight out of `packages/rules/tests/`. The hand-written examples are parsed from markdown at run time, so a case is added by writing it in the markdown and nowhere else.

## Where things are

|                                                                                              |                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`CONTEXT.md`](CONTEXT.md)                                                                   | Glossary and every settled decision, each pointing at the question that settled it. **Start here.**                              |
| [`docs/port-divergences.md`](docs/port-divergences.md)                                       | Every place the original Python and its written spec disagree, with a measured example and a disposition.                        |
| [`packages/rules/tests/golden-transcripts/`](packages/rules/tests/golden-transcripts/)       | Real before/after pairs, verified byte-identical to the Python. The regression net, also asserted against the Python batch tool. |
| [`packages/rules/tests/hand-written-examples/`](packages/rules/tests/hand-written-examples/) | One case per rule and per divergence, in isolation. Parsed directly by the test suite.                                           |
| [`packages/rules/src/`](packages/rules/src/)                                                 | The ported pipeline. Every quirk kept on purpose names the `docs/port-divergences.md` entry it reproduces.                       |
| [`packages/web/`](packages/web/)                                                             | The Vue app. A scaffold today — it proves the wiring; the interface settled in Q13b, Q16 and Q25 is a later issue.               |
| [`docs/grillings/`](docs/grillings/)                                                         | How the scope was decided, one file per round. Historical record — paths quoted inside are as they were at the time.             |
| [`docs/prototypes/`](docs/prototypes/)                                                       | Throwaway UI prototypes. Open the `.html` in a browser; no build step.                                                           |
| [`original-scripts/`](original-scripts/)                                                     | The Python being ported. Frozen as provenance.                                                                                   |

## Licence

MIT — see [LICENSE](LICENSE).
