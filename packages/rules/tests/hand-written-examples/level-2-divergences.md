# Level 2 — one case per divergence

One case per `L2-*` entry in `docs/port-divergences.md`, so that every entry in the catalogue is an executed, asserted fact rather than prose that rots. When you fix a divergence, exactly one case here changes, and the diff says what changed.

Every `IN`/`OUT` pair below is the **measured current behaviour** of `original-scripts/format_advanced.py`, not a guess. Where your v03 disposition is to fix the rule, the `OUT` shown is what the code does _today_ and the note says what it should become — those are the ones that will flip when the fix lands.

---

## L2-R11-01 — rule 11 truncates from the first match, including paragraph 1

Status: confirmed wont-fix-as-coded — superseded by your redefinition. Edit by Jeremie: Doesn't happen any more.

Current behaviour. Your redefinition (anchor on `The Church of God the Eternal has just presented`) makes this case unreachable, which is the point.

IN

```text
The Church of God the Eternal.

Real content follows here.

More content.
```

OUT

```text

```

---

## L2-R02-01 — rule 2 joins without checking the preceding period

Status: confirmed

Your words: "Why wrong input? The OUT in the example is correct." Not a defect. Asserted so it stays.

IN

```text
Is that so?

and yet here we are.
```

OUT

```text
Is that so? And yet here we are.
```

---

## L2-R0X-01 — `rstrip(".")` removes every trailing dot, not one

Status: confirmed — see round v04

You said the OUT below is expected. It also deletes the ellipsis, which is the opposite of what L1-03 asks for. Round v04 asks you to reconcile the two.

IN

```text
He paused there...

and then went on.
```

OUT

```text
He paused there and then went on.
```

---

## L2-R03-01 — rule 3 capitalises regardless of what precedes

Status: confirmed — to be fixed per spec prose

Current behaviour. Per your disposition the spec wins, so after the fix the `OUT` becomes identical to the `IN` (the previous paragraph ends in `?`, not `.`).

IN

```text
Is that so?

yes it is.
```

OUT

```text
Is that so?

Yes it is.
```

---

## L2-R03-02 — rule 3 has no "and" exclusion

Status: confirmed — to be fixed per spec prose

Current behaviour. After the fix the `OUT` becomes identical to the `IN`.

IN

```text
and so it begins.

Second para.
```

OUT

```text
And so it begins.

Second para.
```

---

## L2-R04-01 — rule 4 cascades past a pair

Status: confirmed wont-fix

Your words: "Leave as is for now. I haven't seen this example you gave." Measured: no run of three consecutive "But" paragraphs exists in the golden transcript.

IN

```text
But they haven't.

But no one else has.

But we do.
```

OUT

```text
But they haven't and no one else has and we do.
```

---

## L2-R05-01 — rule 5 matches exactly one space

Status: confirmed — to be fixed per spec prose. Edit of Jeremie: the current behaviour is what I want.

Current behaviour. Your v03 note gives the target: `"What is that?  Let's see."`

IN

```text
What is that?  let's see.
```

OUT

```text
What is that?  let's see.
```

---

## L2-R06-01 — rule 6 does not re-examine a joined paragraph

Status: confirmed — to be fixed. Edit by jeremie: I fixed the example.

Current behaviour. Your words: "So the second hit must match indeed." After the fix, `and Mr.` joins `John Brisby spoke.` too.

IN

```text
Preserved through Mr.

Raymond Cole and Mr.

John Brisby spoke.
```

OUT

```text
Preserved through Mr. Raymond Cole and Mr. John Brisby spoke.
```

---

## L2-R06-02 — rule 6 handles only "Mr."

Status: confirmed — scope extension. Edit by jeremie: I fixed the example.

Current behaviour. Your words: "Fair point to add support `Mrs.`, `Dr.`, `St.` and initials." This is a change to the spec, not a fix to the code — the spec names only `Mr.` too.

IN

```text
She trained under Dr.

Alice Fenwick for a decade.
```

OUT

```text
She trained under Dr. Alice Fenwick for a decade.
```

---

## L2-R08-01 — rule 8 fails when punctuation follows the pronoun

Status: confirmed — to be fixed. Edit by jeremie: I fixed the example.

Current behaviour, both halves. Your words: "Let's be consistence then." After the fix both cases join.

IN

```text
They all proved sooner or later.

That they, in the end, didn't love it.
```

OUT

```text
They all proved sooner or later that they, in the end, didn't love it.
```

---

## L2-R08-02 — `_PRONOUNS` contains determiners and possessives

Status: confirmed — see round v04. Edit by jeremie: I fixed the example.

Current behaviour with `this` in the list. Round v04 asks whether this join is wanted.

IN

```text
He set out the whole argument that this was never about the money.
```

OUT

```text
He set out the whole argument that this was never about the money.
```

---

## L2-R09-01 — rule 9 compares whole paragraphs, exactly

Status: confirmed wont-fix

Your words: "Won't fix for now." Case differences survive.

IN

```text
I sent him.

i sent him.
```

OUT

```text
I sent him.

I sent him.
```

---

## L2-R10-01 — the "Then" exception is a fixed seven-word list

Status: confirmed wont-fix — unimplementable

Your words: "I agree > _unimplementable_." `Then afterwards` is not in the list, so it joins, though a human would keep it separate.

IN

```text
Those are the three pieces.

Then afterwards, in order to know what to do, find the faithful servant.
```

OUT

```text
Those are the three pieces then afterwards, in order to know what to do, find the faithful servant.
```

---

## L2-R01-01 — rule 1 on a bare "And" paragraph

Status: confirmed — latent only, does not reproduce through the pipeline. Edit by jeremie: I fixed the example.

I claimed in v03 that this raises `IndexError`. Measured, it does not. `Paragraphs.from_text` strips every paragraph, so `"And "` arrives as `"And"`, which fails the `startswith("And ")` test and passes through untouched. The crash is reachable only by calling `rule_1_remove_and` directly with an unstripped paragraph, which nothing does.

Your "OK for strengthing the rule" still applies — the guard is one line and worth having once the rule is a public function in TypeScript — but this is a hardening task, not a bug.

IN

```text
And

Second para.
```

OUT

```text
And second para.
```
