# Level 2 — one case per rule, in isolation

Transcribed from `coge-transcriptions/docs/formatting/README.md`. Every case is `unconfirmed` until you say otherwise — I have not invented behaviour here, but I have made choices about where each example starts and stops, and those choices are worth a read.

Cases are numbered by rule, not by pipeline position.

---

## RULE-01 — remove a leading "And" and capitalise the next word

Status: unconfirmed

IN

```text
And people have a right, the people of God have a right to be assured, to know where we stand and what this means.
```

OUT

```text
People have a right, the people of God have a right to be assured, to know where we stand and what this means.
```

---

## RULE-02 — join a paragraph starting with lowercase "and"

Status: unconfirmed

Note: the spec's own output for this case still begins with "And", which rule 1 would strip if the pipeline ran. In isolation, rule 2 leaves it.

IN

```text
And people have a right, the people of God have a right to be assured, to know where we stand and what this means.

and especially for those of you, that are looking to me for that leadership.
```

OUT

```text
And people have a right, the people of God have a right to be assured, to know where we stand and what this means and especially for those of you, that are looking to me for that leadership.
```

---

## RULE-03 — capitalise a paragraph that starts lowercase

Status: unconfirmed

Per your v03 disposition this rule now follows the spec prose: the previous paragraph must end with a period, and a leading "and" in any case is excluded.

IN

```text
But I know most of you are like me and that you recognize the fruits of Mr. Cole's ministry for all of these years.

you have respect for him because you have respect for that that he has preserved.
```

OUT

```text
But I know most of you are like me and that you recognize the fruits of Mr. Cole's ministry for all of these years.

You have respect for him because you have respect for that that he has preserved.
```

---

## RULE-04 — join two consecutive "But" paragraphs with "and"

Status: unconfirmed

IN

```text
But they haven't.

But no one else has.
```

OUT

```text
But they haven't and no one else has.
```

---

## RULE-05 — capitalise the word after a "?"

Status: unconfirmed

IN

```text
What is that foundation? let's do a quick summary of those things that you have heard so long, so many times, in so many different ways, and yet I'm going to reduce it down to a simple formula.
```

OUT

```text
What is that foundation? Let's do a quick summary of those things that you have heard so long, so many times, in so many different ways, and yet I'm going to reduce it down to a simple formula.
```

---

## RULE-06 — a paragraph ending in "Mr." joins the next

Status: unconfirmed

IN

```text
My personal resolve, brethren, is that I will tenaciously defend the truth that God has preserved through Mr.

Raymond Cole all of these years.
```

OUT

```text
My personal resolve, brethren, is that I will tenaciously defend the truth that God has preserved through Mr. Raymond Cole all of these years.
```

---

## RULE-07 — a verbless sentence joins the previous with a comma

Status: wont-fix

Deferred to the LLM round (Q4, Q11b). The rule is a no-op in the code and in the port. The case is recorded so the day rule 7 ships, the target is already written down.

IN

```text
the other part of my resolve is to deal with each one of you in love, and mercy, and patience, and long-suffering.

those requirements of a faithful servant.
```

OUT

```text
the other part of my resolve is to deal with each one of you in love, and mercy, and patience, and long-suffering, those requirements of a faithful servant.
```

---

## RULE-08 — "That" + pronoun joins the previous paragraph

Status: unconfirmed

IN

```text
And they all proved sooner or later.

That they didn't really love it.
```

OUT

```text
And they all proved sooner or later that they didn't really love it.
```

---

## RULE-09 — a paragraph repeated immediately is removed

Status: unconfirmed

IN

```text
I sent him.

I sent him.
```

OUT

```text
I sent him.
```

---

## RULE-10 — "Then" joins the previous paragraph, lowercased

Status: unconfirmed

IN

```text
Do we see him? Have we seen him? Is he still here with us? If we do brethren.

Then you have no reason to doubt.
```

OUT

```text
Do we see him? Have we seen him? Is he still here with us? If we do brethren then you have no reason to doubt.
```

---

## RULE-10-EXCEPTION-A — "Then lastly" does not join

Status: unconfirmed

IN

```text
Those are the three pieces.

Then lastly, in order to know what to do, in order to know how to make the right decisions and to be close with God in these times of trial, find the faithful servant holding to the original teaching.
```

OUT

```text
Those are the three pieces.

Then lastly, in order to know what to do, in order to know how to make the right decisions and to be close with God in these times of trial, find the faithful servant holding to the original teaching.
```

---

## RULE-10-EXCEPTION-B — "Then how" does not join

Status: unconfirmed

IN

```text
No, the only one that received that inspiration was Paul who was taught by Christ in the desert.

Then how did all of the others who were called and made a part of the body of Christ, how did they receive the knowledge of the truth? Through the preaching of Paul.
```

OUT

```text
No, the only one that received that inspiration was Paul who was taught by Christ in the desert.

Then how did all of the others who were called and made a part of the body of Christ, how did they receive the knowledge of the truth? Through the preaching of Paul.
```

---

## RULE-11 — remove the closing trailer and everything after it

Status: unconfirmed

**This case is not the spec's.** The spec anchors on the paragraph `The Church of God the Eternal.`, which does not occur in real level-1 output — see `L2-R11-01` in `docs/port-divergences.md`. This case uses your v03 redefinition, and is drawn from the actual tail of `docs/golden-transcripts/english-level1-transcript.md`.

IN

```text
And we can be among those who will help serve now and in the future the entire family of man.

The Church of God the Eternal has just presented What is Partiality? A message given by Mr. John Brisby in Eugene, Oregon August 22nd, 2026.
```

OUT

```text
And we can be among those who will help serve now and in the future the entire family of man.
```

---

## RULE-11-NOT-THE-OPENING — the opening line must survive

Status: unconfirmed

The same transcript *opens* with `The Church of God the Eternal presents …`. An anchor of `The Church of God the Eternal` alone truncates the document to nothing. This case exists to fail loudly if anyone ever shortens the anchor.

IN

```text
The Church of God the Eternal presents What is Partiality? A message given by Mr. John Brisby in Eugene, Oregon, August 22, 2026.

Well, in some recent visits with brethren around the country.
```

OUT

```text
The Church of God the Eternal presents What is Partiality? A message given by Mr. John Brisby in Eugene, Oregon, August 22, 2026.

Well, in some recent visits with brethren around the country.
```
