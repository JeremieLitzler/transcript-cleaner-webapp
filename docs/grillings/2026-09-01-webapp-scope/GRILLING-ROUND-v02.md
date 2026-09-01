# Grilling round v02 — Transcript Cleaner WebApp: what it actually is

## Settled in v01

- **Q1 — Corpus-specific or general-purpose:** (c). The rule set becomes a named preset so a second one can be added later. You sharpened this in a way that reshapes the tree: `format_transcription.py` is universal — it works on any transcript — and only `format_advanced.py` carries COGE-specific rules. So the preset concept applies to the *advanced* stage alone; the reflow stage has nothing to configure.
- **Q2 — Input:** (a). Plain text only: paste into a textarea, plus an optional `.txt` drop. No `.srt` / `.vtt` / `.json` in v1.
- **Q3 — Language:** (a). English only, stated in the UI. (Reopened below, narrowed.)
- **Q4 — LLM rule 7:** (a). Out of scope for v1. v1 is deterministic string work, which keeps it a static page with no backend, no key, no per-use cost, and no transcript leaving the browser.
- **Q5 — Presentation:** (a). Side-by-side input and output. Diff view (c) is recorded as a v2 feature, behind a toggle.
- **Q6 — Export:** (c). Copy to clipboard *and* download `.txt`.
- **Q7 — Python scripts:** (a). Port the rules to the webapp; freeze `original-scripts/` as provenance.

## Reopened

**Q3 (language) reopens, narrowed.** Two things happened. First, your Q1 answer split the pipeline into a universal stage and a corpus-specific stage — and "English only" cannot be true of both, because the reflow stage only ever asks "does this line end with a period?", which is as true in French as in English. Second, I found evidence in your own corpus: `coge-transcriptions/README.md` carries an open **Task 9 — "Check which files in holy days transcriptions contains french. Might need to retranscribe with English set in the settings instead 'Auto'."** So French transcripts already exist in the material this app is for.

What (b) and (c) died for still holds: you are not building a French rule set (b), and you are not staying silent about the limitation (c). What is live is only *where the English claim attaches*. That is Q3b.

## What I found since v01

Three facts drive the questions below. All are verifiable in `E:/Git/GitHub/coge-transcriptions`, which is cloned next to this repo.

1. **There is an authoritative prose spec** at `coge-transcriptions/docs/formatting/README.md`, describing the raw formatting rules and all eleven advanced rules with before/after examples. v01 was written without it. **It does not match the Python.** Rule 2 requires "the two sentences carry related meaning"; the code only checks `startswith("and ")`. Rule 3 requires the line to follow one ending in a period and to not be "and"; the code capitalises any paragraph starting lowercase. Rule 10's exception is specified as "a word implying that the sentence MUST NOT join"; the code uses a fixed list of seven words. The spec describes intent; the code is a deterministic approximation of it.
2. **The scripts exist twice.** `coge-transcriptions/transcripts-processing/` holds `format_transcription.py` and `format_advanced.py` too. `format_advanced.py` is byte-identical to this repo's copy; `format_transcription.py` differs only in a hard-coded default filename. v01's Q7 settled the fate of *this* repo's copy and said nothing about that one.
3. **Your house stack is Vue 3 + Vite + TypeScript + Tailwind 4 + Vitest** (`french-gas-stations-scraper`, exact versions in its `package.json`), but you also ship plain static pages with a hand-written `index.html` and no build step at all (`declaration-of-conversion`). Both precedents are yours, which is why Q10 is a real question rather than a formality.

---

## Q3b - Does "English only" attach to the app, or to the preset?

Given that reflow is language-agnostic and only the advanced rules are English, where does the constraint belong?

- **a)** To the app. One statement in the UI: "English transcripts only." Simple, slightly untrue, and it discourages you from pasting a French transcript that the reflow stage would in fact handle correctly.
- **b)** To the preset. The preset is named for what it is — English, COGE conventions — and the UI states the limitation where the rules are chosen, not on the front door. Reflow runs on anything.
- **c)** To the app for now, revisited when a second preset exists.

➡️ Recommendation: **(b)**. It is the only option that stays true after your Q1 answer, and it costs nothing extra: you are already building a named preset, so the language belongs in its description. It also leaves the door open for the thing Task 9 implies you may eventually want — running reflow over a French holy-day transcript to make it readable, without any advanced rules at all.

### Answer to Q3b

---

## Q8 - When the spec and the code disagree, which one do we port?

Fact 1 above. `docs/formatting/README.md` states rules 2, 3 and 10 with semantic conditions the Python does not implement. Porting to JavaScript forces the choice, because you cannot port both.

- **a)** Port the **code's behaviour**, bug-for-bug. Record every spec divergence as a known gap in the repo.
- **b)** Port the **spec's intent**, implementing the missing conditions as best a deterministic rule can.
- **c)** Port the code, and treat each divergence as a bug to be fixed in the webapp as you go.

➡️ Recommendation: **(a)**. Two reasons. The code's behaviour is what actually produced your existing corpus — tasks 1 and 2 are marked done in `coge-transcriptions`, so several thousand transcripts have already been through exactly these rules; a port that "fixes" rule 3 produces output that disagrees with every file you have already published. And the missing conditions are not oversights, they are the same problem as rule 7: "carry related meaning" and "a word implying it must not join" are semantic judgements, which is precisely what you deferred in Q4. (b) means inventing behaviour that has never run on real text. (c) is (a) with the discipline removed — it turns a port into a redesign, and you lose the ability to tell a port bug from an intended change.

### Answer to Q8

---

## Q9 - What happens to the *other* copy of the scripts?

Q7 froze `original-scripts/` in this repo. It did not address `coge-transcriptions/transcripts-processing/`, which is where the scripts actually get run. If the webapp is the single implementation, that copy is a second one; if it stays, the drift Q7 was meant to prevent just moves to a different repo.

The answer turns on something only you know: **do new transcripts arrive one at a time, or in batches?** A webapp is fine for a sermon a week. It is the wrong tool for re-running rules across four thousand existing files.

- **a)** The webapp replaces it. Mark `transcripts-processing/format_*.py` superseded, point its README at the webapp, and clean new sermons by paste.
- **b)** Keep it as the batch tool, webapp for one-offs, and accept two implementations — pinned to a shared golden-file test set so drift is *detected* rather than prevented.
- **c)** Keep it and do nothing about the duplication for now.

➡️ Recommendation: **(b)**, unless bulk re-runs are genuinely behind you. The Python earns its place the moment you want to change a rule and re-apply it to the whole corpus, which no webapp will do. What makes (b) safe rather than sloppy is the shared test set — the same inputs and expected outputs run against both implementations, so the day they disagree, something fails. If you are confident the corpus is finished and only new sermons arrive, (a) is better and simpler. (c) is the option that quietly becomes a bug in a year.

### Answer to Q9

---

## Q10 - What is this built with?

The app is a static page running eleven string transformations over a textarea. Q4 removed the backend; Q7 made it a port.

- **a)** Vue 3 + Vite + TypeScript + Tailwind 4 + Vitest — your house stack (fact 3).
- **b)** Vite + TypeScript, no framework. Vitest for the rules; the UI is two textareas and three buttons of plain DOM code.
- **c)** A single hand-written `index.html` with inline JS and no build step at all, like `declaration-of-conversion`.

➡️ Recommendation: **(a)**, despite (b) being technically sufficient. The deciding factor is not this app's complexity, it is that you will come back to it in a year with the habits of your other repos, and a bespoke no-framework page will have become the odd one out that you have to re-read before touching. (a) also gives you Vitest with no setup argument, and the rule port needs a real test suite more than it needs anything else. (c) is genuinely the smallest thing that works and matches "tiny" in your README — take it if you want this to be one file you can open with `file://` forever, and accept writing the rule tests by hand.

### Answer to Q10

---

## Q11 - Where does it get hosted?

- **a)** GitHub Pages from this repo.
- **b)** Netlify (you already use it — `netlify.toml` in `deadlinkprobe`, and a `netlify` folder under `E:/Git/GitHub`).
- **c)** Nowhere. It is a local tool; you open the built file or run the dev server when you need it.

➡️ Recommendation: **(a)**. The code already lives on GitHub, the app is fully static after Q4, and Pages means one less service in the loop and a URL you can open from any machine without a checkout. Netlify is the better answer only if you want deploy previews per branch, which is heavy machinery for a page with no backend. (c) is worth naming out loud because it is defensible — but a tool you have to build before using is a tool you use less.

### Answer to Q11

---

## Q12 - Does the user control individual rules?

Eleven rules, several of them lossy. Rule 11 truncates everything after a matched line. Rule 9 deletes a paragraph. Rule 10 rewrites a sentence boundary on a seven-word heuristic. When one misfires, what can you do about it?

- **a)** One "Clean" button. All rules, always, in the fixed order. Fix bad output by hand in the result pane.
- **b)** A checkbox per rule, all on by default, so a misbehaving rule can be switched off and the text re-cleaned.
- **c)** One button in v1; per-rule toggles recorded as a v2 feature alongside the diff view.

➡️ Recommendation: **(b)**, and I am arguing against my own instinct to keep v1 minimal. The reason is Q8: you are deliberately porting rules that are known approximations of their spec, so misfires are not a hypothetical, they are the documented state of the system. A toggle turns "this rule mangled my paragraph" from a hand-editing chore into a click, and it is cheap — the pipeline is already a list of functions, so the UI is a list of checkboxes filtering that list. It also makes the preset from Q1 concrete: a preset *is* a selected set of rules.

### Answer to Q12

---

## Q13 - One button, or two visible stages?

The scripts are strictly sequential, and `format_advanced.py` only works on output that `format_transcription.py` has already produced. In the app that ordering is guaranteed by construction, so the question is what the user sees.

- **a)** One action. Paste, click Clean, get the finished text. The intermediate never appears.
- **b)** Two visible steps, each with its own button and its own output, mirroring the CLI.
- **c)** One action, but the intermediate is inspectable — a collapsed panel or a third pane you can open when something looks wrong.

➡️ Recommendation: **(a)**. The two-script split is an artefact of how the CLI grew, not a distinction that means anything to someone cleaning a transcript — and (b) hands the user a way to get it wrong by running stage 2 on unreflowed text. (c) sounds like a good compromise but the intermediate is rarely the thing you need: with Q12's toggles you can already isolate a misbehaving advanced rule, and reflow itself is one simple rule that either worked or obviously did not.

### Answer to Q13

---

## Q14 - What do we call the three artefacts?

Your README uses "transcript" for all of them, which is what made the brief ambiguous in the first place. These names will end up in the code, the UI labels, and `CONTEXT.md`, so they are worth choosing rather than defaulting into.

There are three distinct things: what Vibe produces (one utterance per line, mid-sentence breaks); what reflow produces (blank-line-separated paragraphs, no advanced rules applied); and what the advanced rules produce.

- **a)** **Raw transcript** > **reflowed transcript** > **cleaned transcript**. Matches your corpus docs, which already say "Raw Formatting Rules" and "raw transcriptions".
- **b)** **Transcript** > **draft** > **clean copy**. Friendlier in a UI, less precise in code.
- **c)** **Source** > **intermediate** > **output**. Generic pipeline vocabulary; says nothing about the domain.

➡️ Recommendation: **(a)**. "Raw" is already the word you use in `coge-transcriptions`, so choosing anything else means the two repos describe the same file differently. "Reflowed" is the honest name for the middle artefact — it says what happened to it. Once you confirm, I will write these into a `CONTEXT.md` at the repo root as the project glossary.

### Answer to Q14

---

## Held for v03

Three decisions are downstream of answers in this round and are deliberately not asked yet: **how the port is verified** (golden files recovered from the `coge-transcriptions` git history, where "save raw transcriptions" and "apply advanced rules" commits give real before/after pairs — but this only makes sense if Q8 is (a)); **whether the preset is visible in v1** (its shape depends on Q12); and **where the v2 backlog lives** now that the diff view has been deferred to it.
