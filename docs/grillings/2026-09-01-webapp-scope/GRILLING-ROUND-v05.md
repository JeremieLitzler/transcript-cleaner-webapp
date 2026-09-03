# Grilling round v05 — Transcript Cleaner WebApp: settling the last three, and the four the port will hit

## Settled in v04

- **Q17 — Issues:** open the recommended set. Done, six issues, [#2](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/2)–[#7](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/7). I-01 went _inside_ the phase-2 issue rather than standing alone, because Q18(b) made phase 2 the container for every rule change and a separate I-01 would have duplicated its acceptance criteria.
- **Q18 — What v1 is:** (b). Two phases, two issues. Port faithfully, go green on all three golden pairs, then apply the agreed changes.
- **Q19 — Golden policy:** (b). Goldens track desired behaviour and are only ever regenerated in the same commit as the change that justifies them.
- **Q20 — Coverage:** you added the _Do You See Christ?_ pair.
- **Q21 — Rule 2 / rule 8:** (b) then (a). "Carry related meaning" stays in the spec as an aspiration awaiting rule 7's machinery; the pronoun list stays as coded and the spec is amended to say "a pronoun or determiner".
- **Q22 — Ellipsis:** (b), with L1-03 and L2-R0X-01 shipping in the same deliverable.
- **Prototype — Q16:** variant **C**, the toolbar chip plus drawer, chosen for transcript room. Variants A and B are kept on `prototype/q16-preset-rules` rather than deleted.

## What I did since v04

1. **Verified the example-2 pair.** `Do You See Christ?` reproduces the Python byte-for-byte at both levels, 819 paragraphs. Both English pairs and the French pair are now confirmed fixtures.
2. **Re-measured coverage across both pairs** and rewrote that section of `docs/port-divergences.md`. Example 2 closes rules 2, 4 and 8.
3. **Opened six issues** and rescoped I-13 to what actually remains.
4. **Recorded the prototype verdict** in `CONTEXT.md` and on the prototype branch.
5. **Wrote the v04 dispositions into the triage table**, so Q21's and Q22's answers sit next to the entries they settle.

## What I found since v04

### Finding 8 — rule 6 can never be covered by real text

Reported last round and now written into `docs/port-divergences.md` and `CONTEXT.md`. Summary: rule 6's trigger is a paragraph _ending_ in `Mr.`, which depends on where the transcription tool happened to break a line. Example 2 holds 67 `Mr.` and none at a line end. The spec's own rule 6 example comes from that very sermon but arrives already joined in the current transcription — it was captured from an older run of the same audio. Hand-written example only, permanently. That is [#7](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/7).

### Finding 9 — level 2 is a complete no-op on your French transcript, and the reason matters

v01's Q3 rejected "English only in the code, no claim in the UI" on the grounds that the rules would not error on French, they would **quietly mangle it**. That was the whole argument for stating the limitation. It turns out to be wrong, and in an interesting way.

Run level 2 over `french-level1-transcript.md` — 364 paragraphs — and **every single rule touches zero paragraphs.** Not "mostly harmless". Zero.

But that is not a guarantee, and I want to be precise about which half is structural and which half is luck:

|                           | Rules                                                                                                             | Can they fire on French?                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Keyed to English literals | 1 (`And `), 2 (`and `), 4 (`But `), 8 (`That` + English pronouns), 10 (`Then `), 6 (`Mr.`), 11 (the COGE trailer) | **No, by construction.** Verified: `Et il est parti.` is untouched by rule 1; `Il a parle avec M.` is untouched by rule 6.                 |
| No-op                     | 7                                                                                                                 | No                                                                                                                                         |
| Language-agnostic         | 3 (capitalise first), 5 (capitalise after `?`), 9 (remove duplicate)                                              | **Yes.** Verified: `ensuite, il est parti.` > `Ensuite, …`; `la foi ? c'est` > `la foi ? C'est`; a duplicated French paragraph is removed. |

So eight of eleven rules cannot touch French at all, and the three that can are **exactly the three that are correct in any language** — capitalise after a full stop, capitalise after a question mark, drop an exact duplicate. French wants all three. They fire zero times on your transcript only because it has no lowercase paragraph starts and no lowercase word after a `?`.

The fear that started this was that level 2 would silently damage French. It cannot. What it does instead is nothing at all, which is a different problem and drives Q26.

---

## Q23 - Where does the app live, and is the rule engine separable from the UI?

[#2](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/2) cannot start until this is answered. The repo root currently holds `CONTEXT.md`, `LICENSE`, `README.md`, `docs/`, `original-scripts/` and `prototypes/` — none of which is application code.

- **a)** Vite app at the repo root. `package.json`, `vite.config.ts` and `src/` become siblings of `docs/`. The rules live in `src/rules/`, which is forbidden from importing anything outside itself.
- **b)** Vite app in `app/`. The root stays documentation and provenance; `app/` is the product.
- **c)** A workspace with two packages: `packages/rules` (pure TypeScript, no dependencies) and `packages/web` (Vue).

➡️ Recommendation: **(a), with the import boundary written down and linted.**

The thing that decides it is `docs/golden-transcripts/`. That is not documentation, it is the app's test data — issue #2's acceptance criteria are literally "these files reproduce". Under (b) every fixture path in the test suite starts `../../docs/`, and the one directory of tidiness costs you that in every test file forever. The root of this repo is the project; the app is the project.

(c) is the right answer for a library you publish and the wrong one for a page running eleven string functions. It adds a build graph, a second `package.json` and a versioning question in order to enforce a boundary that one lint rule enforces for free.

But **take the separation itself, which is the part of (c) worth having.** `src/rules/` must import nothing from `src/components/`, nothing from Vue, nothing from the DOM. Three things depend on that: the golden tests assert the pipeline and should not drag a component tree in; Q13b's editable middle pane means the pipeline is called with arbitrary text rather than with app state; and if batch ever becomes a browser feature (Q27) it calls exactly these functions with no UI at all. It costs nothing today and it is expensive to retrofit.

### Answer to Q23

(c)

---

## Q24 - How do the hand-written examples become tests?

`docs/hand-written-examples/` currently states a machine-readable format — a heading, a `Status:` line, and exactly two fenced `text` blocks. That was written on the assumption something would parse it. Now is the time to confirm or drop the assumption, because rule 6's **only coverage, permanently**, is one of those files.

- **a)** A Vitest suite parses the markdown at run time, extracts every case, and generates one test per entry. You edit prose, you get a test.
- **b)** Transcribe each case into `.test.ts` by hand. The markdown becomes documentation; the tests are ordinary code.
- **c)** A build step generates `.test.ts` from the markdown, and the generated files are committed.

➡️ Recommendation: **(a)**, and the reason is specific to how you have been working rather than a general preference.

Every decision in this project has landed in markdown first — your dispositions in `docs/port-divergences.md`, the triage table, the catalogue. The examples are the same artefact in the same place. Under (b) there are two copies of every case and the markdown becomes the stale one, which is precisely the failure Q17's catalogue-versus-tracker split was designed to avoid. For rule 6 that stale copy would be the only record of what the rule is supposed to do.

The cost is a parser of about forty lines that you have to trust, and a failure that points at a markdown heading rather than a source line. Both are acceptable; the heading is arguably the more useful pointer, since it carries the divergence ID. (c) is (a) plus a generated artefact to forget to regenerate.

**One thing to settle inside this: what does `Status: unconfirmed` do?** My proposal is that `confirmed` and `wont-fix` run as real assertions, `unconfirmed` registers as a skipped/todo test so it cannot gate CI while you are still reviewing, and the suite prints the unconfirmed count so the backlog stays visible. Say if you would rather unconfirmed cases fail loudly instead. You have already confirmed every case in `level-1.md`, so this is not hypothetical — that file would go live the moment the parser exists.

**And one wrinkle the format did not anticipate, which your confirmations just exposed.** `L1-05` is the CRLF case, and its `IN` block reads `Bonjour a tous.\r\nNous allons commencer.\r\n` — six visible characters standing in for two invisible ones. Every other block in the folder is literal text. So the parser needs one of: an escape convention applied everywhere (`\r`, `\n`, `\t` interpreted, and a real backslash needing doubling — which makes the other ninety-odd cases slightly less literal); an opt-in marker on the cases that need it, such as `IN (escaped)`; or L1-05 being the one case written by hand in TypeScript, where a real `\r\n` is unremarkable. I lean to the second — it is honest about which blocks are literal and costs one word in one heading — but it is your file format and the choice is yours.

### Answer to Q24

I reviewed and confirmed the `docs/hand-written-examples/` so that settles `Status: unconfirmed` question.

Regarding `\r`, `\n`, `\t`, I will copy paste transcript from Vibe to the app. Does it settle the format question?

I choose (a) so the `docs/hand-written-examples/` will move the closest to the tests and a the `CONTEXT.md` will state this.

---

## Q25 - What does dropping a `.txt` file actually do?

Q2 gave you a textarea plus an optional `.txt` drop. Q13b then gave you three panes and a gate. Those two were decided eleven questions apart and have never been put in the same room.

**First half — what happens on drop?**

- **a)** Fill the raw pane and stop. You still click Reflow.
- **b)** Fill the raw pane and immediately run level 1, landing you at the decision point.
- **c)** Fill the raw pane and run the whole pipeline with the active preset.

**Second half — where can you drop, and what does the target mean?**

- **d)** Only the raw pane accepts a drop.
- **e)** Anywhere on the page; the drop always targets the raw pane.
- **f)** Each pane accepts a drop and the target means something — dropping on the reflowed pane asserts "this file is already reflowed, skip level 1".

➡️ Recommendation: **(a) and (e).**

(a) follows from a decision you have already made rather than from taste. Q13b(c) chose that an edit marks downstream **stale** instead of clearing it, specifically so that a stray keystroke cannot destroy the cleaned text you were about to copy. A dropped file is a much bigger edit than a keystroke, so it should obey the same policy: replace the raw pane, mark reflowed and cleaned stale, and wait to be asked. (b) is the option that quietly clears your reflowed pane when you drop the wrong file, and it also makes stage 1 automatic while stage 2 stays manual — an inconsistency you would have to learn.

(e) because a drop target that only accepts a 200-pixel region is a worse version of the same feature, and there is nothing else on the page a file could sensibly mean.

**(f) is the one worth arguing about, and I am rejecting it deliberately.** "This file is already reflowed" is a real use case — it is exactly what you would do re-cleaning a transcript from `coge-transcriptions`. But it opens a second entry point into the pipeline that the gate has to model: level 1 never ran, yet level 2 must be unlocked. That is a new state, and Q13b's whole value was that the state machine is small. You can already do it by pasting into the middle pane, which the gate already handles.

**And a third part, small but worth deciding now:** remember the dropped filename and use it for the Q6 download, so `sermon-072101.txt` comes back as `sermon-072101-cleaned.txt`. On paste, fall back to something generic. It is a few lines, and it is the difference between the download being useful and being `download.txt`.

### Answer to Q25

Recommendation is good.

---

## Q26 - Given Finding 9, what should level 2 do about French?

The premise has moved. Level 2 will not mangle French — eight rules cannot touch it and the three that can are correct in any language. So the question is no longer "how do we protect the user" but "what are we offering".

- **a)** Nothing changes. The drawer says English, the buttons stay enabled, and running level 2 on French does approximately nothing. Honest, and slightly pointless.
- **b)** Detect the language heuristically and warn before running level 2, dismissible.
- **c)** Add a second preset — **Universal (any language)** — containing exactly rules 3, 5 and 9. Level 2 stops being English-only and becomes "one English preset and one universal one".

➡️ Recommendation: **(c)**, and it is close to free.

Q16 already built the machinery: a preset is a named set of checkboxes, and you already have two (COGE and Conservative) in the prototype. A third containing the three language-agnostic rules costs one array. What it buys is that the French path stops being a dead end — today a French transcript gets reflowed and then hits a stage that is labelled "not for you" and would do nothing anyway. With (c) it gets capitalisation after full stops and question marks and duplicate removal, which is real cleaning, and the preset name states the limitation more precisely than a paragraph of prose could.

(b) is the option I would push back on hardest. A language heuristic is a new failure mode — it will be wrong on short pastes, on bilingual quotations, on scripture references — and it exists to prevent damage that Finding 9 shows does not occur. You would be adding detection to guard against nothing.

(a) is defensible if you would rather not grow the preset list before the app exists. If you take it, the honest UI copy is not "English transcripts only" but "these rules only affect English transcripts", which is the true statement.

**One consequence to accept with (c):** Q3b said level 2 is English-only, and this amends it. Level 2 becomes English-only _by default preset_, not by construction. `CONTEXT.md` needs that correction.

### Answer to Q26

Ok for (c)

---

## Q27 - Batch: does it stay Python, or become a browser feature?

Issue [#6](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/6). Q9 said batch is "a future feature of this app", but it also said the `coge-transcriptions` scripts stay exactly as they are — and those two do not obviously agree.

- **a)** Batch stays Python. `coge-transcriptions/transcripts-processing/` receives the phase-2 rule changes, and `docs/golden-transcripts/` is the shared contract asserted against both implementations.
- **b)** Batch becomes a browser feature: a File System Access API directory picker running the pipeline over a folder.
- **c)** Decide when a rule actually changes and a re-run is really needed.

➡️ Recommendation: **(a)**, on the grounds of who runs it and what happens when it goes wrong.

Batch is a rare maintenance operation over a git checkout, and git is its undo. That is a terminal job. The browser version needs a permission grant every time, has no undo, cannot resume a partial run, and its worst case is a half-rewritten corpus with no diff to inspect — in a directory the browser was granted write access to. The Python already exists, already works, and Q9 already decided it stays.

The cost of (a) is the drift that Q7 was trying to prevent by having one implementation. That cost is now much lower than it was in v02, because you have **three verified golden pairs**, and asserting them against both implementations turns drift from a thing you prevent into a thing you detect. That was exactly the bargain v02's Q9(b) described, and you now have the fixtures to make it real.

**What (a) obliges, and what nothing currently tracks:** the phase-2 changes have to be applied to the Python too, or the two diverge on the day #3 merges. That work is in no issue today. If you take (a), it becomes a checklist item on [#3](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/3) or an issue of its own — tell me which and I will add it.

(c) is the honest minimum and I would not fight it hard. Its risk is only that it makes the decision under time pressure, on the day you actually want the re-run.

### Answer to Q27

(a) indeed.

---

## Q28 - What does the README become?

The five lines that started this grilling are still there, still claiming the app will "clean any transcript to a more readable form". Five rounds have established that this is two different claims with two different answers, and it is the sentence that made the brief ambiguous in the first place.

- **a)** A product README: what the app does, the level 1 / level 2 split with the language boundary, how to run it, and a pointer to `CONTEXT.md` for the decisions.
- **b)** A short README — one paragraph and links to `CONTEXT.md`, `docs/port-divergences.md` and the issues. Everything else lives where it already lives.
- **c)** Leave it until the app ships and there is something to describe.

➡️ Recommendation: **(b)**, and rewrite it now rather than at the end.

The reason to do it now is that the false claim is load-bearing in the wrong direction: it is the first thing anyone reads, including you in a year, and it currently contradicts every decision in `CONTEXT.md`. The reason to keep it short is that you have built a genuinely good set of documents — the glossary, the divergence catalogue, the examples — and a long README becomes a fourth place where the same facts drift.

The one sentence that has to change is "clean any transcript". The true version is that **level 1 cleans any transcript in any language, and level 2 applies one corpus's conventions**. That distinction is the single most useful thing the README can carry.

(c) has one real argument: the README should describe a thing that exists. But it already describes a thing that does not exist, and does so inaccurately, which is strictly worse than describing the plan.

### Answer to Q28

(b)

---

## Held for v06

Only one thing is deliberately not asked, because it depends on Q23 and Q24 landing first: **what the first commit on [#2](https://github.com/JeremieLitzler/transcript-cleaner-webapp/issues/2) actually contains** — whether the Vite scaffold, the rule port and the test harness arrive together or in sequence. That is a sequencing question for the build, not a scope question, and it is better answered by starting than by discussing.

After this round the scope grilling is finished. Everything remaining is tracked in the six issues.

### Answer to Sequencing Question

Here is the sequence:

- Vite scaffold,
- rule port
- and the test harness
