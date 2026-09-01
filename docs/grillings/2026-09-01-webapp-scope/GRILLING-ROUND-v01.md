# Grilling round v01 — Transcript Cleaner WebApp: what it actually is

## Starting point

The whole brief today is five lines in `README.md`:

> Vibe (https://thewh1teagle.github.io/vibe/) allows to transcribe any audio or video. But the output isn't always neat. Given the Python scripts in this repo, let's make a tiny, simple and user-friendly webapp to clean any transcript to a more readable form.

I read `original-scripts/format_transcription.py`, `original-scripts/format_advanced.py` and `original-scripts/README.md` before writing this round. Three things in that paragraph don't survive contact with the code:

- **"clean _any_ transcript"** vs. the code. `format_advanced.py` hard-codes `_TRAILER = "The Church of God the Eternal."`, an English-only pronoun set, and joins keyed to the literal words `And `, `But `, `Then `, `Mr.`. That is not a general cleaner — it is a cleaner for one corpus (the `coge-transcriptions` repo the scripts link to). "Any" and the code disagree, and which one wins decides most of what follows.
- **"transcript"** names two different artefacts. There is the raw Vibe export (one utterance per line), and there is the reflowed intermediate that `format_transcription.py` produces and `format_advanced.py` consumes (blank-line-separated paragraphs). The scripts only work in that order; the word doesn't distinguish them.
- **"a more readable form"** has no definition of done, so nothing can be tested against it and nothing can be declared finished.

Worth naming too: the pipeline ships with a hole. `rule_7_verbless_join_LLM` is a documented no-op — it returns its input untouched, pending an LLM that was never wired up.

---

## Q1 - Corpus-specific or general-purpose?

Is this webapp for cleaning **your** COGE sermon transcripts, or a generic tool a stranger could paste any transcript into?

This is the root of the tree. The eleven rules encode the conventions of one speaker and one corpus. Rule 11 deletes a specific closing sentence and everything after it. Rule 6 joins on `Mr.` because that corpus is full of `Mr. <name>`. Run them on a stranger's podcast transcript and rule 11 does nothing, rule 6 fires on any abbreviation, and rule 10 silently rewrites their sentence boundaries.

- **a)** Corpus-specific: built for COGE sermon transcripts, and the README says so.
- **b)** General-purpose: only rules that are safe on arbitrary English prose survive; the COGE-specific ones are cut or become opt-in.
- **c)** Corpus-specific now, with the rule set structured as a named preset so a second preset can be added later without a rewrite.

➡️ Recommendation: **(c)**. (a) is honest but paints you into a corner the first time you want to clean something else; (b) throws away most of the value you already have, since the corpus-specific rules are precisely the ones doing the heavy lifting. (c) costs almost nothing at design time — it is one indirection, "which rule list am I running" — and it makes the README's "any transcript" claim eventually true instead of permanently false. Ship one preset, named after the corpus.

### Answer to Q1

---

## Q2 - What exactly gets pasted or uploaded in?

Vibe can export several formats, including plain text and timestamped subtitle files. `format_transcription.py` assumes plain text, one utterance per line, no timestamps. Feed it an SRT and the subtitle index numbers and `00:00:01,000 --> 00:00:04,000` cue lines become paragraphs in the output — the pipeline has no idea they aren't speech.

- **a)** Plain text only: a textarea to paste into, plus an optional `.txt` file drop.
- **b)** Plain text plus timestamped formats (`.srt` / `.vtt`), stripping cue numbers and timecodes before the existing pipeline runs.
- **c)** Everything Vibe can export, including `.json` and `.html`.

➡️ Recommendation: **(a)**. It matches what the scripts actually handle today, so v1 is a faithful port rather than a port plus new parsing you have never tested. Timestamp stripping in (b) is genuinely useful but it is a separate feature with its own edge cases (multi-line cues, speaker labels, `WEBVTT` headers) and it should not ride along on the port. If you routinely export SRT rather than TXT from Vibe, say so and this flips.

### Answer to Q2

---

## Q3 - English only?

The pronoun set in rule 8, the `Mr.` of rule 6, and the `And ` / `But ` / `Then ` triggers of rules 1, 4 and 10 are all English. Do you ever transcribe French material — or any other language — that you would want cleaned by this app?

- **a)** English only, stated in the UI so a French paste can't silently produce nonsense.
- **b)** English and French, with a language selector and a French rule set alongside the English one.
- **c)** English only in the code, but no claim either way in the UI.

➡️ Recommendation: **(a)**. (c) is the trap: the rules will not error on French input, they will quietly mangle it — rule 3 capitalises, rule 5 fires after `?`, rule 9 deduplicates, and the result looks plausible enough that you might not notice. If English is the answer, the UI should say it. (b) is a real second rule set and belongs in its own round if you want it.

### Answer to Q3

---

## Q4 - Is rule 7 (the LLM one) in scope for v1?

This is the fork in the road for the entire architecture, which is why it is being asked before anything about stack or hosting.

Without rule 7, the app is pure deterministic string manipulation: it can be a single static page, no server, no API key, no per-use cost, no network at all, and your transcripts never leave your machine. With rule 7, you need a model call, which means either a backend holding your key or a field where the user pastes their own — and either way the transcript text is sent to a third party.

- **a)** Out of scope for v1. Deterministic rules only.
- **b)** In scope for v1, with a backend holding your API key.
- **c)** In scope for v1, bring-your-own-key pasted into the browser.

➡️ Recommendation: **(a)**. Rule 7 is already a no-op in the scripts, so shipping without it loses you nothing you have today — the webapp would match the current behaviour exactly. It also keeps v1 as a static page you can host free and forever, and keeps sermon text off third-party servers by construction. Rule 7 is a good v2 with its own grilling: what the prompt is, what happens when the model is wrong, whether you review each join.

### Answer to Q4

---

## Q5 - How is the result presented?

The scripts rewrite the file in place — after `format_advanced.py` runs, the original is gone, and there is no "before" to compare against. In a browser, in-place has no meaning; you have to choose what the screen shows.

- **a)** Side-by-side: input pane on the left, cleaned output on the right, both scrollable.
- **b)** Single pane: the text you pasted is replaced by the cleaned version.
- **c)** Diff view: the cleaned text with the rule-driven changes highlighted, so you can see exactly what fired where.

➡️ Recommendation: **(a)**. These rules are lossy and occasionally wrong — rule 10 joins on `Then `, rule 11 truncates everything after a matched line, rule 9 deletes a paragraph — and you need the original in front of you to catch it. (b) makes a bad join undetectable. (c) is the most informative and is the natural v2, but a paragraph-level diff over text that has been deliberately re-paragraphed is a real piece of work; (a) gets you the same safety for a fraction of it.

### Answer to Q5

---

## Q6 - How does the cleaned text leave the app?

Once you are happy with the output, what do you do with it?

- **a)** Copy to clipboard.
- **b)** Download as a `.txt` file.
- **c)** Both.

➡️ Recommendation: **(c)**, and it is barely more work than either alone. Copy is what you will use nine times out of ten if the next step is pasting into an editor or a CMS; download is what you need if the next step is committing the file to `coge-transcriptions`. If the answer is "always one of these", say which — it removes a button.

### Answer to Q6

---

## Q7 - What happens to the Python scripts?

If the webapp becomes the tool you actually use, `original-scripts/` becomes code nobody runs. Rules will get fixed in one place and not the other, and six months from now it will not be obvious which one is right.

- **a)** Port the rules to the webapp; freeze `original-scripts/` as documented provenance, with a note in its README saying it is superseded.
- **b)** Keep both alive: the scripts stay a working CLI, the webapp is a second front end, and rule changes are made twice.
- **c)** Keep Python as the single implementation and run it in the browser via Pyodide, so there is literally one rule set.
- **d)** Delete the scripts once the webapp works.

➡️ Recommendation: **(a)**. One implementation to maintain, one to read the history from. (b) guarantees drift. (c) is seductive — genuinely one rule set — but it drags a multi-megabyte Python runtime into a page whose entire job is a handful of regexes and string joins, which is the opposite of the "tiny" in your README. (d) throws away the record of where the rules came from, and that record is worth keeping since several rules are non-obvious.

### Answer to Q7
