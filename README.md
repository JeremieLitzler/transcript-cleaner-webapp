# Transcript Cleaner WebApp

[Vibe](https://thewh1teagle.github.io/vibe/) transcribes audio and video, but its output is not neat: one utterance per line, sentences broken mid-clause, no paragraphs. This is a small static webapp that cleans that output into something readable, in two stages.

**The distinction that matters, and the one the original brief got wrong:**

- **Level 1 — reflow.** Normalises whitespace, drops blank lines, joins mid-sentence breaks, and forms paragraphs. Universal: it works on **any transcript in any language**.
- **Level 2 — advanced rules.** Eleven rules encoding the conventions of one corpus, the [COGE sermon transcripts](https://github.com/JeremieLitzler/coge-transcriptions). Shipped as a named **preset**, so a second one can be added without a rewrite. The COGE preset is English-only; a *Universal* preset carries the three rules that are correct in any language.

Paste a transcript or drop a `.txt`, run level 1, optionally run level 2 with the rules you want, then copy or download the result. No backend, no API key, no transcript leaving the browser.

## Status

Not built yet. The scope is settled across five grilling rounds and the work is tracked in [issues](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues).

## Where things are

| | |
| --- | --- |
| [`CONTEXT.md`](CONTEXT.md) | Glossary and every settled decision, each pointing at the question that settled it. **Start here.** |
| [`docs/port-divergences.md`](docs/port-divergences.md) | Every place the original Python and its written spec disagree, with a measured example and a disposition. |
| [`docs/golden-transcripts/`](docs/golden-transcripts/) | Real before/after pairs, verified byte-identical to the Python. The regression net, shared with the Python batch tool. |
| [`docs/hand-written-examples/`](docs/hand-written-examples/) | One case per rule and per divergence, in isolation. Moves next to the tests when the app is scaffolded. |
| [`docs/grillings/`](docs/grillings/) | How the scope was decided, one file per round. |
| [`original-scripts/`](original-scripts/) | The Python being ported. Frozen as provenance. |

## Licence

MIT — see [LICENSE](LICENSE).
