import os

import whisper

MODEL = None


def load_model():
    global MODEL
    if MODEL is None:
        MODEL = whisper.load_model("base")
    return MODEL


def transcribe_audio(audio_path: str) -> list:
    model = load_model()
    result = model.transcribe(audio_path, language="ko")
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start": float(seg.get("start", 0)),
            "end": float(seg.get("end", 0)),
            "text": seg.get("text", "").strip(),
            "confidence": float(seg.get("avg_logprob", 0.0) * -1.0),
        })
    return segments


def find_keyword_hits(transcript: list, keyword: str) -> list:
    phrase = keyword.lower().strip()
    hits = []
    for seg in transcript:
        text = seg["text"].lower()
        if phrase in text:
            hits.append({
                "start_sec": seg["start"],
                "end_sec": seg["end"],
                "quote": seg["text"],
                "matched_keyword": keyword,
            })
    return hits
