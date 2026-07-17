import os
import uuid
import asyncio
import tempfile
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.models.schemas import JobState, JobStatus
from backend.pipeline.transcriber import transcribe_audio, find_keyword_hits
from backend.pipeline.fact_checker import fact_check_claims

load_dotenv()

BASE_DIR = Path(__file__).parent

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

jobs = {}


async def run_pipeline(job_id: str, audio_path: str, keyword: str, api_key: str):
    job = jobs[job_id]
    try:
        job.status = JobStatus.TRANSCRIBING
        job.progress = 20

        segments = await asyncio.to_thread(transcribe_audio, audio_path)
        job.transcript = segments

        job.progress = 50
        evidence = find_keyword_hits(segments, keyword)
        job.evidence = evidence

        job.status = JobStatus.ANALYZING
        job.progress = 80
        fact_checks = await asyncio.to_thread(fact_check_claims, keyword, segments, evidence, api_key)
        job.fact_checks = fact_checks

        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.keyword = keyword

    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_msg = str(exc)
    finally:
        # One-shot: the uploaded file is only needed for transcription
        try:
            os.remove(audio_path)
        except OSError:
            pass


app = FastAPI(title="NewsFactCheck")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.post("/api/analyze")
async def analyze(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    keyword: str = Form(""),
    api_key: str = Form(""),
):
    if not file.filename.lower().endswith((".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm")):
        raise HTTPException(400, "Unsupported file format.")
    if not keyword.strip():
        raise HTTPException(400, "Please enter the keyword you want to search for.")
    api_key = api_key.strip() or ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(400, "Enter your Anthropic API key to run the fact-check.")

    job_id = str(uuid.uuid4())[:8]
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(await file.read())
        audio_path = f.name

    jobs[job_id] = JobState(
        job_id=job_id,
        audio_path=audio_path,
        audio_filename=file.filename,
        status=JobStatus.UPLOADED,
        progress=0,
        created_at=datetime.now(timezone.utc).isoformat(),
        keyword=keyword,
    )

    background_tasks.add_task(run_pipeline, job_id, audio_path, keyword, api_key)
    return JSONResponse({"job_id": job_id, "message": "Analysis started."})


@app.get("/api/job/{job_id}")
async def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "job not found")
    job = jobs[job_id]
    return {"job_id": job_id, "status": job.status, "progress": job.progress, "error_msg": job.error_msg}


@app.get("/api/job/{job_id}/result")
async def get_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "job not found")
    job = jobs[job_id]
    return {
        "job_id": job_id,
        "keyword": job.keyword,
        "evidence": [e.model_dump() for e in job.evidence],
        "fact_checks": [fc.model_dump() if hasattr(fc, 'model_dump') else fc for fc in job.fact_checks],
    }


@app.get("/api/health")
async def health():
    return {"message": "NewsFactCheck API is running"}


_dist_dir = BASE_DIR.parent / "dist"

if _dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
