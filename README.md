# NewsFactCheck

> **Audio Analysis Experiment** — Built to explore how speech transcription (OpenAI Whisper) and AI-powered claim verification (Claude Sonnet) can be unified into a single async pipeline in Python/TypeScript.

Upload an audio or video file and enter a keyword or topic. The app transcribes the content, pinpoints the exact timestamps where the keyword appears, and uses Claude to extract and evaluate the factual claims in context.

---

## Why Transcribe First?

The most direct approach would be to send the raw audio straight to a multimodal LLM and ask it to fact-check. That works — but it's expensive by design.

**The cost problem with sending audio directly:**

| Approach                   | What gets billed                                    | Typical cost per 10-min clip                            |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Raw audio → multimodal LLM | Every second of audio as tokens                     | High (audio tokens are priced at a significant premium) |
| Full transcript → LLM      | Every word in the transcript, unfiltered            | Medium (~1,500–2,500 tokens for 10 min of speech)       |
| **This pipeline**          | Only keyword-matched segments + surrounding context | Low (often 100–400 tokens sent to Claude)               |

**The three-stage filter:**

1. **Whisper runs locally** — transcription is a one-time CPU/GPU cost on your own machine. No API call, no per-token charge. The `base` model processes a 10-minute clip in roughly 30–60 seconds on a modern CPU.

2. **Keyword search narrows the context** — before Claude sees anything, a simple substring match extracts only the segments where the topic actually appears. A 10-minute news segment might produce 1,800 words of transcript; the keyword filter typically returns 2–5 matching segments, cutting the context by 80–95%.

3. **Claude only handles the hard part** — claim extraction and verdict generation require genuine reasoning. That's where the LLM budget is spent. Everything mechanical (decoding audio, finding timestamps, matching keywords) is handled offline.

**The practical result:** analyzing a 10-minute clip for a single keyword typically costs a fraction of a cent in Claude API tokens, rather than the dollars-per-hour rate you'd pay routing raw audio through a multimodal endpoint. For a tool meant to be run repeatedly across many clips, that difference compounds quickly.

---

## Features

- **Async Job Pipeline** — Upload triggers a background job; poll `/api/job/{id}` for live progress without blocking the server
- **Speech-to-Text** — OpenAI Whisper `base` model; returns word-level timestamps and log-probability confidence scores
- **Keyword Search** — Case-insensitive substring match across all transcript segments; returns exact `start_sec / end_sec` ranges and the surrounding quote
- **AI Fact-check** — Claude Sonnet extracts 2–4 key claims related to the keyword, judges each as `verified` or `needs_review`, and provides a confidence score + supporting quotes
- **Persistent Output** — Each completed job is written to `backend/output/{job_id}/result.json` for offline review
- **Result Panel** — React UI renders matched evidence cards and fact-check cards side by side with timestamps, verdicts, and confidence percentages

---

## Tech Stack

| Area                 | Technology                                           |
| -------------------- | ---------------------------------------------------- |
| **Backend runtime**  | Python 3.10+                                         |
| **Web framework**    | FastAPI 0.111 + Uvicorn                              |
| **Transcription**    | OpenAI Whisper `base` (local, CPU/GPU)               |
| **AI fact-check**    | Anthropic Claude Sonnet (`claude-sonnet-4-20250514`) |
| **Data validation**  | Pydantic v2                                          |
| **File upload**      | python-multipart                                     |
| **Audio decoding**   | ffmpeg-python (requires system `ffmpeg`)             |
| **Frontend runtime** | Node.js (v18+)                                       |
| **UI framework**     | React 18 + TypeScript 5                              |
| **Build tool**       | Vite 5                                               |

---

## Project Structure

```
AudioRecognition/
├── backend/
│   ├── main.py                  # FastAPI app, job store, pipeline orchestration
│   ├── models/
│   │   └── schemas.py           # Pydantic models: JobState, TranscriptSegment, EvidenceHit, FactCheckResult
│   ├── pipeline/
│   │   ├── transcriber.py       # Whisper transcription + keyword hit extraction
│   │   └── fact_checker.py      # Claude Sonnet claim extraction + verdict generation
│   ├── uploads/                 # Temp storage for uploaded files (per request)
│   └── output/                  # Completed job results: output/{job_id}/result.json
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component: state management, polling loop, layout
│   └── components/
│       ├── AnalysisForm.tsx     # File input + keyword textarea + submit button
│       ├── StatusCard.tsx       # Live status label + progress bar
│       └── ResultsPanel.tsx     # Evidence cards + AI fact-check cards
├── dist/                        # Vite production build (served by FastAPI as static files)
├── .env.example                 # Template for ANTHROPIC_API_KEY
├── requirements.txt             # Python dependencies
├── package.json                 # Node.js dependencies + Vite scripts
├── vite.config.ts               # Vite config (port 3000, proxy not needed — served via FastAPI)
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js v18+
- `ffmpeg` installed and on PATH — required by Whisper for audio decoding

  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu / Debian
  sudo apt install ffmpeg
  ```

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/AudioRecognition.git
cd AudioRecognition
```

### 2. Set up the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> Whisper downloads the `base` model weights (~140 MB) from HuggingFace on first run. Internet connection required.

### 3. Configure the API key (optional but recommended)

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

```env
ANTHROPIC_API_KEY=your_key_here
```

Without a key, transcription and keyword matching still work; the AI fact-check step returns an empty list.

### 4. Build the frontend

```bash
npm install
npm run build
```

This outputs the compiled React app to `dist/`. FastAPI serves it as static files at `/`.

### 5. Start the server

```bash
python3 -m backend.main
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

> For frontend development with hot-reload, run `npm run dev` (port 3000) separately alongside the backend.

---

## How It Works

### Pipeline overview

```
POST /api/analyze (file + keyword)
        │
        ▼
  Save file to backend/uploads/
  Create JobState (status: uploaded, progress: 0%)
  Return { job_id }
        │
        ▼  [BackgroundTask]
  Whisper transcribe_audio()
  ─ Loads base model (lazy, singleton)
  ─ Runs transcribe(audio_path, language="ko")
  ─ Returns list[TranscriptSegment] with start/end/text/confidence
  status: transcribing → progress: 20%
        │
        ▼
  find_keyword_hits(segments, keyword)
  ─ Lowercased substring match on each segment's text
  ─ Returns list[EvidenceHit]: start_sec, end_sec, quote, matched_keyword
  progress: 50%
        │
        ▼
  fact_check_claims(keyword, segments, api_key)
  ─ Builds timestamped transcript string
  ─ Sends to Claude Sonnet: extract 2–4 claims, judge each, add evidence quotes
  ─ Parses JSON response → list[FactCheckResult]
  progress: 80%
        │
        ▼
  Write backend/output/{job_id}/result.json
  status: completed → progress: 100%
```

### Job status lifecycle

| Status         | Progress | Description                                      |
| -------------- | -------- | ------------------------------------------------ |
| `uploaded`     | 0%       | File saved, job created, background task queued  |
| `transcribing` | 20%      | Whisper model running on the audio file          |
| `analyzing`    | —        | Reserved (currently transitions to completed)    |
| `completed`    | 100%     | Evidence and fact-checks available               |
| `failed`       | —        | Unhandled exception; `error_msg` contains detail |

### Whisper confidence score

Whisper does not expose per-word confidence directly. The `confidence` field in `TranscriptSegment` is derived as `avg_logprob * -1.0` — lower original log-probability (more negative) maps to a higher derived value here, so treat it as a rough measure of uncertainty rather than a standard [0, 1] score.

### Fact-check prompt

The Claude prompt instructs the model to:

1. Identify the user's topic/keyword
2. Read the timestamped transcript
3. Extract 2–4 key claims related to that topic
4. For each claim: assign `verified` or `needs_review`, a `confidence` float (0–1), a `summary`, and supporting `evidence` (with timestamps and quotes)
5. Return only a JSON array (no markdown wrapper)

The response is stripped of any fenced code block markers before `json.loads`.

---

## API Reference

### `POST /api/analyze`

Start a new analysis job.

**Content-Type:** `multipart/form-data`

| Field     | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `file`    | File   | Yes      | Audio or video file            |
| `keyword` | string | Yes      | Topic or keyword to search for |

**Accepted formats:** `.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, `.webm`

**Response `200`**

```json
{
  "job_id": "a3f91c2b",
  "message": "Analysis started."
}
```

---

### `GET /api/job/{job_id}`

Poll job progress.

**Response `200`**

```json
{
  "job_id": "a3f91c2b",
  "status": "transcribing",
  "progress": 20,
  "error_msg": null
}
```

---

### `GET /api/job/{job_id}/result`

Retrieve the completed analysis result. Returns `404` if the job does not exist; call only after status is `completed`.

**Response `200`**

```json
{
  "job_id": "a3f91c2b",
  "keyword": "U.S.-Iran war background",
  "evidence": [
    {
      "start_sec": 12.3,
      "end_sec": 15.7,
      "quote": "Tensions between the U.S. and Iran have persisted for decades.",
      "matched_keyword": "U.S.-Iran war background"
    }
  ],
  "fact_checks": [
    {
      "claim": "Tensions between the U.S. and Iran have persisted for decades.",
      "verdict": "verified",
      "confidence": 0.82,
      "summary": "The speaker explains the historical background of the U.S.-Iran conflict.",
      "evidence": [
        {
          "start_sec": 12.3,
          "end_sec": 14.1,
          "quote": "Tensions between the U.S. and Iran...",
          "matched_keyword": "U.S.-Iran war background"
        }
      ]
    }
  ]
}
```

---

### `GET /api/health`

```json
{ "message": "NewsFactCheck API is running" }
```

---

## Data Models

### `TranscriptSegment`

| Field        | Type   | Description                                  |
| ------------ | ------ | -------------------------------------------- |
| `start`      | float  | Segment start time in seconds                |
| `end`        | float  | Segment end time in seconds                  |
| `text`       | string | Transcribed text for the segment             |
| `confidence` | float? | Derived from `avg_logprob * -1.0` (see note) |

### `EvidenceHit`

| Field             | Type   | Description                     |
| ----------------- | ------ | ------------------------------- |
| `start_sec`       | float  | Start of the matching segment   |
| `end_sec`         | float  | End of the matching segment     |
| `quote`           | string | Original transcript text        |
| `matched_keyword` | string | The keyword string that matched |

### `FactCheckResult`

| Field        | Type          | Description                                     |
| ------------ | ------------- | ----------------------------------------------- |
| `claim`      | string        | Extracted claim from the transcript             |
| `verdict`    | string        | `"verified"` or `"needs_review"`                |
| `confidence` | float (0–1)   | Model's self-reported confidence in the verdict |
| `evidence`   | EvidenceHit[] | Supporting quotes with timestamps               |
| `summary`    | string        | One-sentence explanation of the verdict         |

---

## Frontend Components

| Component      | Responsibility                                                                |
| -------------- | ----------------------------------------------------------------------------- |
| `App.tsx`      | Holds all state; calls `/api/analyze`, then polls `/api/job/{id}` every 1.5 s |
| `AnalysisForm` | File picker (audio/video), keyword textarea, "Start analysis" button          |
| `StatusCard`   | Displays current job status string and an animated progress bar (0–100%)      |
| `ResultsPanel` | Renders evidence cards (timestamps + quote) and AI fact-check cards           |

The frontend build is output to `dist/` by Vite and served by FastAPI's `StaticFiles` mount at `/`. No separate frontend server is needed in production.

---

## Implementation Notes

**In-memory job store** — `jobs` is a plain Python dict keyed by an 8-character UUID prefix. All state is lost on server restart. For production use, replace with Redis or a database.

**Singleton Whisper model** — `MODEL` in `transcriber.py` is a module-level global. The model loads once on first request and is reused for all subsequent jobs, avoiding repeated disk reads and GPU/CPU initialization overhead.

**Language hardcoded to Korean** — `transcribe(audio_path, language="ko")` forces Korean. Remove the `language` argument to let Whisper auto-detect, at the cost of slightly slower first-segment processing.

**Claude JSON extraction** — The fact-check response is expected to be a bare JSON array. If Claude wraps it in a fenced code block, the leading ` ```json ` and trailing ` ``` ` markers are stripped before parsing. If Claude returns unexpected formats, `json.loads` will raise and the job will transition to `failed`.

**CORS** — `allow_origins=["*"]` is set for development convenience. Lock this down to specific origins before deploying.

---

## License

MIT
