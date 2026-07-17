import json

import anthropic


def fact_check_claims(keyword: str, transcript_segments: list, hits: list, api_key: str) -> list:
    """Fact-check what the speaker said in the segments where the keyword appears."""
    if not api_key or not hits:
        return []

    transcript = "\n".join(f"[{s['start']:.1f}s ~ {s['end']:.1f}s] {s['text']}" for s in transcript_segments)
    matched = "\n".join(f"[{h['start_sec']:.1f}s ~ {h['end_sec']:.1f}s] {h['quote']}" for h in hits)

    prompt = f"""
You are a fact-checker for spoken content (news, lectures, debates, interviews).
Speakers sometimes state incorrect information, so each statement must be verified.

In the uploaded video/audio, the keyword "{keyword}" was spoken in these segments:
{matched}

Full transcript (for surrounding context only):
{transcript}

Steps:
1. For each matched segment above, work out what factual claim the speaker is making.
   Use neighboring transcript lines if the sentence is cut off, but only fact-check
   statements from the matched segments — do not pull unrelated claims from elsewhere.
2. Verify each claim with web search. Judge by what the search finds, not by the transcript.
3. For each claim return:
   - "verdict": "verified" (search confirms it), "false" (search contradicts it), or "needs_review" (couldn't confirm either way)
   - "confidence": 0.0-1.0
   - "evidence": the matched segment(s) where the claim was spoken, with timestamps
   - "summary": one or two sentences explaining the verdict, citing what the search found

Skip segments that contain no checkable factual claim (opinions, questions, filler).
Return ONLY a JSON array, no other text. Example:
[
  {{
    "claim": "U.S. inflation peaked above 9% in mid-2022.",
    "verdict": "verified",
    "confidence": 0.85,
    "evidence": [{{"start_sec": 12.3, "end_sec": 14.1, "quote": "...", "matched_keyword": "{keyword}"}}],
    "summary": "Official CPI data confirms U.S. inflation reached 9.1% in June 2022."
  }}
]
"""

    client = anthropic.Anthropic(api_key=api_key)
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=16000,
        tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 8}],
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        response = stream.get_final_message()

    raw = next((b.text for b in reversed(response.content) if b.type == "text"), "").strip()
    if raw.startswith("```"):
        raw = raw.split("```", 1)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.split("```", 1)[0]
    return json.loads(raw)
