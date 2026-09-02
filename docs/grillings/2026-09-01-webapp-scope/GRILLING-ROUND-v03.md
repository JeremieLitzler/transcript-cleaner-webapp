# Grilling round v03 — Transcript Cleaner WebApp: the port, the gate, and the backlog

## Settled in v02

- **Q3b — Language:** the constraint attaches to the level, not the app. **Level 1** (`format_transcription.py`) is the reflow stage and runs on any language, English and French included. **Level 2** (`format_advanced.py`) is the advanced-rule stage, English only, because one corpus exists. That vocabulary — level 1, level 2 — is now the project's, and it is written into `CONTEXT.md`.
- **Q8 — Spec vs. code:** (c). Port the code as it is for v1, and record an issue per divergence rather than fixing them during the port.
- **Q9 — The other script copy:** `coge-transcriptions/transcripts-processing/` stays exactly as it is. Batch re-run becomes a future feature of this app, motivated by the level-2 rules that are only approximations.
- **Q10 — Stack:** (a). Vue 3 + Vite + TypeScript + Tailwind 4 + Vitest, because you foresee a bigger app.
- **Q12 — Rule control:** (b). A checkbox per level-2 rule, all on by default.
- **Q14 — Names:** (a). Raw transcript > reflowed transcript > cleaned transcript. Written into `CONTEXT.md` along with level 1 / level 2 and the preset definition.

**Q11 and Q13 are not settled.** You answered both with a question rather than a letter, and both questions are good ones. They come back below as Q11b and Q13b.

## What I did since v02

Three things your answers committed me to, done before this round was written.

1. **`CONTEXT.md` exists at the repo root.** The glossary from Q14, the level 1 / level 2 split from Q3b, the preset definition, and a table of every settled decision with the question that settled it. It records what is decided; open items stay in the grilling rounds.
2. **`docs/port-divergences.md` exists.** Twenty entries — eighteen defects, plus two recorded as "not a defect" to close open assumptions. This is the source list for Q8's issues. Every entry was verified by _running_ the code against a crafted input, not by reading it, and each one quotes the exact input and output.
3. **The Q9 sync was investigated and is a no-op — your premise for it was wrong.** See below.

## What I found since v02

### Finding 1 — the two script copies are already in sync, and this repo's is the better one

You asked me to sync this repo's scripts _from_ `coge-transcriptions`, on the grounds that "the version it holds is the most recent". It is not.

- `format_advanced.py` is **byte-identical** in both repos. Nothing to sync.
- `format_transcription.py` differs in **one line**: the hard-coded fallback used when the script is invoked with no argument. This repo has `transcription.txt`; `coge-transcriptions` has `SpecialMessage_RCCIllness-DoYouSeeChrist_072101.txt`.
- `git log` in `coge-transcriptions` shows both files last touched in a single commit, `acc1bf67 chore: reorganize the python scripts`, and untouched since. This repo's copies are the newer artefacts.

So copying from `coge-transcriptions` would replace a generic default filename with one specific sermon's — a regression, in a line the port does not use at all, since a webapp has no `sys.argv`. **I did not perform the sync**, and I am recording that as the answer to Q9's sync clause rather than asking you to re-decide it. Say so if you disagree.

### Finding 2 — level 1 needs no French adaptation, because it has no language in it

Your Q3b answer said "I understand some adaptations need to occur in level 1 script". I went looking for them. There are none of that kind. Level 1 is thirty lines with one conditional: does this line end with a period? There is no character class, no locale, no word list, no pronoun set. I ran it over French input and it behaves identically to English.

What level 1 _does_ have is three real gaps, and all three are language-neutral — French exposes nothing English does not already expose (`docs/port-divergences.md`, L1-01 to L1-03):

| ID | Gap | Effect |
| --- | --- | --- |
| L1-01 | `?` and `!` do not end a paragraph | `"What is that foundation?\nLet's do a quick summary."` becomes one paragraph. Fires on nearly every transcript. |
| L1-02 | A period before a closing quote or bracket is not a sentence end | `'He said "I will come."\nThen he left.'` becomes one paragraph. |
| L1-03 | An ellipsis forces a paragraph break | `'Il a dit...\nEt puis il est parti.'` splits mid-thought. |

L1-01 is the one that matters, and it reframes level 2's rule 5 entirely: "capitalise the word after a `?`" is not a formatting preference, it is cleanup for the paragraph L1-01 failed to break. That drives Q3c.

### Finding 3 — the divergence list is bigger and worse than v02 implied

v02 named three divergences (rules 2, 3, 10). Running the code found eighteen. Two are worse in kind than "an approximation of the spec":

- **L2-R11-01 is data loss.** Rule 11 truncates from the _first_ paragraph matching the trailer, wherever it sits. Given a transcript that _opens_ with `The Church of God the Eternal.` — which is exactly the shape of the spec's own rule 11 example — the output is the empty string. The whole transcript is gone.
- **L2-R08-01 is an internal inconsistency, not an approximation.** Rule 10 strips punctuation before testing its trigger word; rule 8 does not. So `That they didn't love it.` joins and `That they, in the end, didn't love it.` does not. Two rules, same sub-problem, one solved correctly.

Neither changes the Q8 answer — you port them as they are and file them — but L2-R11-01 changes how urgent one of those issues is, which feeds Q17.

---

## Q3c - What does "port level 1 as-is" mean, now that the adaptation you expected does not exist?

Finding 2 removes the reason you gave for adapting level 1. What is left is L1-01: `?` and `!` do not break paragraphs. Fixing it would make output better in both languages. It would also make v1 disagree with every transcript already published in `coge-transcriptions`, and it contradicts Q8, which you settled two answers earlier.

- **a)** Port level 1 exactly as it is. `.` alone ends a paragraph. French works today at precisely the fidelity English does. L1-01, L1-02 and L1-03 become issues, fixed after v1 with a corpus re-run behind them.
- **b)** Fix L1-01 in v1 — treat `.`, `?` and `!` as sentence-ending — because it is the single highest-impact gap and it is the likeliest thing "some adaptations" meant. Accept that v1 output no longer matches the published corpus.
- **c)** Port as-is, but make the sentence-ending character set a visible setting on the level 1 stage, defaulting to `.` only. French, or an experiment, can opt into `.?!` without a code change.

➡️ Recommendation: **(a)**. The reason for (b) evaporated when the adaptation turned out to be about punctuation rather than language, and Q8 already answered the general form of this question: divergences get filed, not fixed mid-port. Taking (b) here means v1 cannot be verified against the existing corpus at all, which costs you the cheapest testing strategy available (Q15). (c) is the one I want to warn you off hardest: it invents a user-facing knob for a need nobody has demonstrated, and it puts a differently-shaped control on level 1 when Q12 already gives you toggles on level 2 — two configuration surfaces on a two-stage pipeline, in v1. File L1-01 as the first issue you fix _after_ v1 ships, when a batch re-run (Q9) can carry the corpus with it.

### Answer to Q3c

---

## Q11b - Netlify: you are right, and the reason you gave is not the reason

You answered Q11 with: "Since rule 7 is not cancelled but postponed, Netlify is a better choice since using a Netlify Function might be the way to talk to a LLM, no?"

Yes. A Netlify Function is the natural home for a keyed LLM call, and I under-weighted rule 7's postponement when I recommended Pages. Conceded.

But the argument as stated has a hole worth seeing before you bank on it. **A Netlify Function holding your Anthropic key is an unauthenticated, publicly reachable, metered endpoint.** Anyone who finds the URL — and it is discoverable from the page's own network traffic — can spend your credit until you notice. So "put rule 7 in a Function" is not a hosting decision that Netlify settles; it is an auth-and-cost-cap decision that has to be designed, and it is the whole content of the rule 7 round. The other half of the hole: a static site with no build-config lock-in moves from Pages to Netlify in about ten minutes, so this was never a one-way door in the first place.

What genuinely favours Netlify is smaller and more boring than rule 7: you already use it (`netlify.toml` in `deadlinkprobe`), so it is zero new learning, and choosing it now costs nothing over Pages.

- **a)** GitHub Pages now. Move to Netlify if and when rule 7 actually ships.
- **b)** Netlify now, static only. No `functions` directory until rule 7 has been designed.
- **c)** Netlify now, and design the rule 7 Function in this round — auth, spend cap, failure behaviour.

➡️ Recommendation: **(b)**. Take the host you already know, at zero cost, and skip the migration. What I will not concede is (c): the Function is a security and cost design, not a deployment target, and folding it into a scope round is how it ends up shipped without a spend cap. Let `netlify.toml` sit there with no functions directory until rule 7 gets its own round.

### Answer to Q11b

---

## Q13b - Your gate is right. What invalidates it?

You answered Q13 with: "what about (b) with a gate to run level1 script always first before being able to run level2 script?"

That closes the hole I raised against (b) — a user cannot run level 2 on unreflowed text. Accepted. But a gate is a state machine, and state machines are defined by their invalidation rules, not their happy path. Here is the case that decides the design:

> You paste a raw transcript. You click **Reflow**. You click **Apply rules**. You now have all three panes filled. You then edit the raw pane.

- **a)** Editing the raw pane clears both downstream panes and re-locks level 2. Always correct, and one stray keystroke throws away the cleaned text you were about to copy.
- **b)** Nothing invalidates. The panes go stale, level 2 stays unlocked, and you can apply rules to a reflow of text you no longer have. Simple, and quietly wrong in a way you will not notice.
- **c)** Editing the raw pane marks downstream **stale** — visibly, a dimmed pane and a "re-run" badge — without clearing it. Level 2 stays unlocked. The badge tells you the output no longer matches the input; you decide whether to care.

**And a sub-question that decides whether your (b) is worth its extra click at all: is the reflowed pane editable?**

If it is not, two visible stages are one-button-mode with an extra click and an extra pane. If it is, you get something the one-button design cannot offer: a repair point _between_ the two lossy stages. Reflow, hand-fix the one paragraph L1-01 mangled, then apply rules to text you have corrected. That is the strongest argument for your answer, and it is not the argument you made for it.

➡️ Recommendation: **(c), with the reflowed pane editable.** (a) punishes you for typing; (b) is a bug you will hit and not see. And make the middle pane editable — without it, the gate is ceremony; with it, the two-stage design earns its place, and it gives you a manual workaround for every level-1 divergence in `docs/port-divergences.md` while those issues sit unfixed. One consequence to accept: once the middle pane is editable, "re-run level 1" and "the middle pane's current content" are two different things, and the Apply-rules button must use the latter.

### Answer to Q13b

---

## Q15 - How do we prove the port is faithful?

Q8 settled that we port the code's behaviour. "As-is" is only meaningful if something checks it, and Q10 gave you Vitest specifically so that something could.

- **a)** **Golden files recovered from git history.** Mine `coge-transcriptions` for commits that saved raw transcriptions and commits that applied the rules, extract real before/after pairs, and assert the TypeScript reproduces them.
- **b)** **Golden files generated now.** Run the Python over a sample of the corpus today; commit the input/output pairs as fixtures; assert the TypeScript matches byte for byte.
- **c)** **Hand-written unit tests per rule**, from the spec's examples plus every entry in `docs/port-divergences.md`, each test named for its divergence ID.

➡️ Recommendation: **(b) and (c) together — they test different things and neither substitutes for the other.**

(b) is the safety net and it is nearly free: a twenty-line script over the corpus produces hundreds of pairs, drawn from real text, covering interactions between rules that no per-rule test can reach — and a pipeline of eleven ordered rules is mostly interactions. (c) is the documentation: each divergence becomes an asserted, executed fact, so the day you fix L2-R08-01 exactly one named test changes and the diff says what changed and why. Without (c) the catalogue is prose that rots; with it, it is a test suite.

(a) sounds better than it is. That history was not made with this in mind — the commits mix rule application with frontmatter edits, renames and restructuring, so reconstructing clean pairs is archaeology you would be doing _instead of_ the port. (b) gets you the same real-text coverage in an afternoon.

One thing to decide inside this: **how many pairs, and do they go in this repo?** A few hundred transcripts is megabytes of fixture in a repo whose product is a static page. My suggestion is twenty to thirty pairs, hand-picked for variety (a transcript with the trailer, one without, one heavy in `Mr.`, one with a `?`-run, a French one for level 1), committed here — not the whole corpus, and not a submodule.

### Answer to Q15

---

## Q16 - Is the preset visible in v1?

Q1 settled that the rule set becomes a named preset. Q12 settled a checkbox per rule. A preset is therefore a named default state for eleven checkboxes — which means v1 has to decide whether that name appears on screen or only in the code.

- **a)** No selector. Eleven checkboxes, all on. The preset exists in code as the named default list; the selector arrives with the second preset.
- **b)** A selector with one option, "COGE (English)". Honest about the design, and the near-empty dropdown is a standing reminder of the extension point — and, per Q3b, the natural place for the English-only statement to live.
- **c)** No selector, but a "Reset to COGE defaults" button. The preset is present as an action rather than a list.

➡️ Recommendation: **(a)**, with one constraint on the implementation: the default checkbox state must come from a named preset object, not from a hard-coded `true` per rule. A one-item dropdown is a control that cannot do anything, and (c) is the same nothing with more words in it. The extension point that matters is in the code.

Two caveats I would rather state than hide. First, (b) has one real argument I could not dismiss: Q3b put the English-only statement "where the rules are chosen", and with (a) there is no named thing to attach it to — it becomes a line of text floating above a checkbox list. If that bothers you, (b) is defensible on those grounds alone. Second, (c) becomes worth having roughly a week after you start toggling eleven checkboxes and want your defaults back — but that is a two-line addition later, not a scope decision now.

### Answer to Q16

---

## Q17 - Where does the backlog live, and how much of it gets opened at once?

Three streams of deferred work now exist, and they are not the same kind of thing:

1. **Port divergences** — eighteen defects in `docs/port-divergences.md`. Each is a defined change to a defined function with a testable outcome.
2. **v2 features** — diff view (Q5), rule 7 via LLM (Q4), batch corpus re-run (Q9). Each of these is an undesigned round, not a task.
3. **Whatever the port itself turns up.**

- **a)** GitHub issues for everything. Q8's "record an issue for each bug" reads literally as this.
- **b)** A single markdown backlog in `docs/`, sections per stream. Versioned with the code, greppable, no round-trip to a browser.
- **c)** Split by kind: issues for the divergences, a `docs/roadmap.md` for the v2 features.

➡️ Recommendation: **(c)**. A divergence is actionable work with an acceptance test; that is what an issue tracker is for. "Diff view, behind a toggle" is a design round nobody has held — putting it in the tracker makes the tracker overstate how much is decided, and it will sit there for a year looking like something that was nearly done.

**Then decide the volume, because I will not open eighteen issues on a repo that currently has one without you saying so.** Options: open all eighteen now, so the catalogue and the tracker agree; or open only the ones you would act on before or immediately after v1 — on my reading that is **L2-R11-01** (data loss, and a transcript opening with the trailer is not hypothetical), **L2-R08-01** (an inconsistency, not a judgement call, and a two-line fix), **L2-R01-01** (a crash, one-line guard) and **L1-01** (highest impact, but Q3c must land first) — and leave the remaining fourteen in `docs/port-divergences.md` until the port is done.

My recommendation is the second: four issues, each with a divergence ID in the title, and the catalogue stays the complete record. Tell me which, and I will open them.

### Answer to Q17

---

## Held for v04

Downstream of this round, deliberately not asked yet: **what the README becomes** once the brief's "clean any transcript" claim is replaced by the level 1 / level 2 split (it should be rewritten at the end of the grilling, not mid-way); **how the `.txt` drop from Q2 interacts with the two-stage gate from Q13b**; and **whether batch re-run (Q9) is even a browser feature** — four thousand files through a File System Access API directory picker is a different app from a textarea, and it may want to stay Python.
