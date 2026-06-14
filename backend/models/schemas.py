from enum import Enum
from typing import Optional

from pydantic import BaseModel


class JobStatus(str, Enum):
    UPLOADED = "uploaded"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class FactCheckStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    NEEDS_REVIEW = "needs_review"


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str
    confidence: Optional[float] = None


class EvidenceHit(BaseModel):
    start_sec: float
    end_sec: float
    quote: str
    matched_keyword: str


class FactCheckResult(BaseModel):
    claim: str
    verdict: str
    confidence: float
    evidence: list[EvidenceHit]
    summary: str


class JobState(BaseModel):
    job_id: str
    audio_path: str
    audio_filename: str = ""
    status: JobStatus
    progress: int = 0
    transcript: list[TranscriptSegment] = []
    keyword: str = ""
    evidence: list[EvidenceHit] = []
    fact_checks: list[FactCheckResult] = []
    error_msg: Optional[str] = None
    created_at: str = ""
