import sys
from pathlib import Path


def _format_line(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return ""
    if stripped.endswith("."):
        return stripped + "\n\n"
    return stripped + " "


def format_transcription(source_path: Path) -> None:
    raw_text = source_path.read_text(encoding="utf-8")
    parts = [_format_line(line) for line in raw_text.splitlines()]
    source_path.write_text("".join(parts).rstrip(), encoding="utf-8")
    print(f"Formatted file written: {source_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        default_file = (
            Path(__file__).parent
            / "transcription.txt"
        )
        target = default_file
    else:
        target = Path(sys.argv[1])

    if not target.exists():
        print(f"Error: file not found: {target}")
        sys.exit(1)

    format_transcription(target)
