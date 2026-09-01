# Usage

Run `format_transcription.py` first, then `format_advanced.py` on the transcription output:

```python
python format_transcription.py <file.txt>
python format_advanced.py <file.txt>
```

`format_advanced.py` modifies the file in-place. It applies all deterministic rules automatically.

Note: Rule 7 (verbless sentence detection) requires an LLM and is currently a no-op.

For more details, [see the full README](https://github.com/JeremieLitzler/coge-transcriptions).
