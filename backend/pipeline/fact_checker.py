import os
import json

import anthropic


def fact_check_claims(keyword: str, transcript_segments: list, api_key: str) -> list:
    if not api_key:
        return []

    text = "\n".join(f"[{s['start']:.1f}s ~ {s['end']:.1f}s] {s['text']}" for s in transcript_segments)
    prompt = f"""
You are an assistant for fact-checking presentations, debates, and interviews.
The topic the user wants to investigate is:
{keyword}

The following is the audio transcript:
{text}

Based on this content, extract 2–4 key claims related to the user's topic,
judge each claim as either 'verified' or 'needs_review',
 and provide at least one supporting quote for each.
Return only a JSON array. Example:
[
  {{
    "claim": "Tensions between the U.S. and Iran have persisted for decades.",
    "verdict": "verified",
    "confidence": 0.82,
    "evidence": [{{"start_sec": 12.3, "end_sec": 14.1, "quote": "...", "matched_keyword": "U.S.-Iran war background"}}],
    "summary": "The speaker explains the historical background of the U.S.-Iran conflict."
  }}
]
"""

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 1)[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)
