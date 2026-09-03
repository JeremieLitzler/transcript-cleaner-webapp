# Level 1 — reflow

Inputs here are raw Vibe output: one utterance per line, mid-sentence breaks, stray blank lines. Outputs are blank-line-separated paragraphs.

Cases marked `confirmed` carry your explicit v03 wording. The rest need you.

---

## L1-BASE — a period ends a paragraph, anything else continues it

Status: confirmed

IN

```text
Bonjour a tous.
Nous allons commencer.
```

OUT

```text
Bonjour a tous.

Nous allons commencer.
```

---

## L1-01 — "?" does not end a paragraph

Status: confirmed

Your words in `docs/port-divergences.md`: "The example is fine … What's wrong with that?" This is intended behaviour, not a defect. The case is here so nobody "fixes" it later.

IN

```text
What is that foundation?
Let's do a quick summary.
Next sentence here.
```

OUT

```text
What is that foundation? Let's do a quick summary.

Next sentence here.
```

---

## L1-01-BANG — "!" does not end a paragraph

Status: confirmed

Neither golden transcript contains a single `!`, so this half of L1-01 has never been observed on real text. It follows from the same rule, but you have not actually confirmed it.

IN

```text
That is remarkable!
And we moved on.
```

OUT

```text
That is remarkable! And we moved on.
```

---

## L1-02 — a period inside closing punctuation does not end a paragraph

Status: confirmed

Your words: it should become one line.

IN

```text
He said "I will come."
Then he left.
```

OUT

```text
He said "I will come." Then he left.
```

---

## L1-03 — an ellipsis does not end a paragraph

Status: confirmed

Your v03 note: "Match exactly the ellipsis and apply **before** period rule?" This case states the consequence of doing that. It is a behaviour **change** — the current code splits here.

IN

```text
Il a dit...
Et puis il est parti.
```

OUT

```text
Il a dit... Et puis il est parti.
```

---

## L1-05 — CRLF input reflows identically to LF input

Status: confirmed

The raw transcripts in `packages/rules/tests/golden-transcripts/` are all CRLF. A port that splits on `"\n"` alone carries a trailing `\r` into every line, which defeats the period check on every line and collapses the document into one paragraph. This case fails loudly if that regresses.

IN

```text
Bonjour a tous.\r\nNous allons commencer.\r\n
```

OUT

```text
Bonjour a tous.

Nous allons commencer.
```

---

## L1-EMPTY-LINES — blank lines carry no meaning and are discarded

Status: confirmed

IN

```text
First sentence.


Second sentence.
```

OUT

```text
First sentence.

Second sentence.
```

---

## L1-WHITESPACE — leading and trailing whitespace is stripped

Status: confirmed

IN

```text
   Indented line continues
	and ends here.
```

OUT

```text
Indented line continues and ends here.
```
