"""
Advanced formatting rules applied after format_transcription.py has run.
Operates on paragraphs (blank-line-separated blocks).

Rules requiring an LLM are marked and skipped with a no-op placeholder.
"""

import re
import sys
from pathlib import Path

# Pronouns that trigger Rule 8 ("That <pronoun> ...")
_PRONOUNS = {
    "he", "she", "it", "they", "we", "i", "you",
    "his", "her", "their", "our", "my", "your",
    "this", "these", "those",
}

_TRAILER = "The Church of God the Eternal."

# Words that follow "Then " and prevent joining onto the previous paragraph (Rule 10)
_THEN_EXCEPTION_WORDS = {
    "how", "what", "why", "when", "where", "who",  # interrogatives → new sentence
    "lastly",                                        # sequential marker → new thought
}


# ---------------------------------------------------------------------------
# First-class collection
# ---------------------------------------------------------------------------

class Paragraphs:
    def __init__(self, items: list[str]):
        self._items = list(items)

    @classmethod
    def from_text(cls, text: str) -> "Paragraphs":
        items = [p.strip() for p in re.split(r"\n\n+", text.strip())]
        return cls([p for p in items if p])

    def to_text(self) -> str:
        return "\n\n".join(self._items)

    def is_empty(self) -> bool:
        return not self._items

    def last_equals(self, paragraph: str) -> bool:
        return not self.is_empty() and self._items[-1] == paragraph

    def last_starts_with(self, prefix: str) -> bool:
        return not self.is_empty() and self._items[-1].startswith(prefix)

    def truncated_to(self, index: int) -> "Paragraphs":
        return Paragraphs(self._items[:index])

    def with_appended(self, paragraph: str) -> "Paragraphs":
        return Paragraphs(self._items + [paragraph])

    def joined_onto_last(self, separator: str, continuation: str) -> "Paragraphs":
        joined = self._items[-1].rstrip(".") + separator + continuation
        return Paragraphs(self._items[:-1] + [joined])

    def __iter__(self):
        return iter(self._items)

    def __len__(self) -> int:
        return len(self._items)

    def __getitem__(self, index: int) -> str:
        return self._items[index]


# ---------------------------------------------------------------------------
# Individual rule functions – each takes and returns a Paragraphs instance
# ---------------------------------------------------------------------------

def rule_11_remove_trailer(paras: Paragraphs) -> Paragraphs:
    """Remove 'The Church of God the Eternal.' and everything after it."""
    for i, p in enumerate(paras):
        if p == _TRAILER:
            return paras.truncated_to(i)
    return paras


def rule_9_remove_duplicates(paras: Paragraphs) -> Paragraphs:
    """Remove a paragraph that is identical to the one immediately before it."""
    result = Paragraphs([])
    for p in paras:
        if result.last_equals(p):
            continue
        result = result.with_appended(p)
    return result


def _consume_mr_pair(result: Paragraphs, paras: Paragraphs, i: int) -> tuple["Paragraphs", int]:
    if paras[i].endswith("Mr.") and i + 1 < len(paras):
        return result.with_appended(paras[i] + " " + paras[i + 1]), i + 2
    return result.with_appended(paras[i]), i + 1


def rule_6_mr_join(paras: Paragraphs) -> Paragraphs:
    """Join a paragraph that ends with 'Mr.' to the next paragraph."""
    result = Paragraphs([])
    i = 0
    while i < len(paras):
        result, i = _consume_mr_pair(result, paras, i)
    return result


def rule_2_and_join(paras: Paragraphs) -> Paragraphs:
    """Join a paragraph starting with lowercase 'and ' onto the previous one."""
    result = Paragraphs([])
    for p in paras:
        if p.startswith("and ") and not result.is_empty():
            result = result.joined_onto_last(" ", p)
            continue
        result = result.with_appended(p)
    return result


def _first_word(text: str) -> str:
    return re.sub(r"[^a-zA-Z]", "", text.split()[0]).lower()


def _then_joins(paragraph: str) -> bool:
    if not paragraph.startswith("Then "):
        return False
    return _first_word(paragraph[5:]) not in _THEN_EXCEPTION_WORDS


def rule_10_then_join(paras: Paragraphs) -> Paragraphs:
    """Join a paragraph starting with 'Then ' onto the previous one as 'then'.

    Exception: if the word immediately following 'Then' is in _THEN_EXCEPTION_WORDS
    (interrogatives, sequential markers), the paragraph is kept separate.
    """
    result = Paragraphs([])
    for p in paras:
        if _then_joins(p) and not result.is_empty():
            result = result.joined_onto_last(" then ", p[5:])
            continue
        result = result.with_appended(p)
    return result


def _is_that_pronoun(paragraph: str) -> bool:
    words = paragraph.split()
    return (
        len(words) >= 2
        and words[0] == "That"
        and words[1].lower() in _PRONOUNS
    )


def rule_8_that_pronoun_join(paras: Paragraphs) -> Paragraphs:
    """Join 'That <pronoun> ...' onto the previous paragraph as 'that <pronoun> ...'."""
    result = Paragraphs([])
    for p in paras:
        if _is_that_pronoun(p) and not result.is_empty():
            result = result.joined_onto_last(" that ", " ".join(p.split()[1:]))
            continue
        result = result.with_appended(p)
    return result


def rule_4_but_but_join(paras: Paragraphs) -> Paragraphs:
    """Join two consecutive 'But ...' paragraphs with 'and'."""
    result = Paragraphs([])
    for p in paras:
        if p.startswith("But ") and result.last_starts_with("But "):
            result = result.joined_onto_last(" and ", p[4:])
            continue
        result = result.with_appended(p)
    return result


def _strip_leading_and(paragraph: str) -> str:
    if not paragraph.startswith("And "):
        return paragraph
    body = paragraph[4:]
    return body[0].upper() + body[1:]


def rule_1_remove_and(paras: Paragraphs) -> Paragraphs:
    """Remove leading 'And ' and capitalise the next word."""
    return Paragraphs([_strip_leading_and(p) for p in paras])


def rule_3_capitalise_first(paras: Paragraphs) -> Paragraphs:
    """Capitalise the first letter of a paragraph that starts in lowercase."""
    return Paragraphs([p[0].upper() + p[1:] if p and p[0].islower() else p for p in paras])


def rule_5_capitalise_after_question(paras: Paragraphs) -> Paragraphs:
    """Capitalise the word immediately after '?' within a paragraph."""
    return Paragraphs([re.sub(r"\? ([a-z])", lambda m: "? " + m.group(1).upper(), p) for p in paras])


def rule_7_verbless_join_LLM(paras: Paragraphs) -> Paragraphs:
    """
    *** REQUIRES LLM ***

    Join a verbless sentence onto the previous paragraph with a comma.

    Example:
        ...and long-suffering.
        those requirements of a faithful servant.
    →   ...and long-suffering, those requirements of a faithful servant.

    Determining whether a sentence contains a verb requires semantic
    understanding that cannot be achieved with simple string/regex rules.
    Even a POS tagger (e.g. spaCy) is unreliable here because short
    noun phrases sometimes parse ambiguously. An LLM prompt such as:

        "Does the following sentence contain a finite verb? Answer yes/no.
         Sentence: '{sentence}'"

    is the recommended approach.
    """
    return paras   # no-op until LLM integration is added


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

_PIPELINE = [
    rule_11_remove_trailer,
    rule_9_remove_duplicates,
    rule_6_mr_join,
    rule_2_and_join,
    rule_10_then_join,
    rule_8_that_pronoun_join,
    rule_4_but_but_join,
    rule_7_verbless_join_LLM,   # no-op
    rule_1_remove_and,
    rule_3_capitalise_first,
    rule_5_capitalise_after_question,
]


def format_advanced(text: str) -> str:
    paras = Paragraphs.from_text(text)
    for rule in _PIPELINE:
        paras = rule(paras)
    return paras.to_text()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python format_advanced.py <file.txt>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Error: file not found: {path}")
        sys.exit(1)

    text = path.read_text(encoding="utf-8")
    result = format_advanced(text)
    path.write_text(result, encoding="utf-8")
    print(f"Done: {path}")
