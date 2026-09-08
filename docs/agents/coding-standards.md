# Coding standards

## Comments

Write a comment where it carries what the code cannot: the reason for a choice, a constraint that forced it, a consequence that isn't visible locally, a link to the issue or ADR. That is the *why*; the code already shows the *what*.

One line. Take more only when the reason genuinely needs it.

Before adding a comment, read how the surrounding file comments and match that rate.

```ts
// Level 2 only ever sees level-1 output; the ordering is guaranteed upstream, so no re-check here.
const cleaned = applyRules(reflowed)
```

```ts
// apply the rules to the reflowed transcript
const cleaned = applyRules(reflowed)
```

The first names something you can't recover from the code. The second restates the line.

**Review bar:** every comment on a changed line names a why, a constraint, or a caveat that the code beneath it does not already show.
