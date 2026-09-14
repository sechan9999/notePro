"""
backend/main.py
─────────────────────────────────────────────────────────────────
FastAPI REST & WebSocket Server for Granola Core.
Manages meeting sessions, live audio intake, speech-to-text dispatch,
and Granola 3-way AI note enhancement.
"""
import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .stt_service import stt_service
    from .fusion_engine import fusion_engine
except ImportError:
    from stt_service import stt_service
    from fusion_engine import fusion_engine

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("noteProServer")

app = FastAPI(title="notePro API", version="1.0.0", description="notePro AI Meeting Note Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "meetings.json")
os.makedirs(DATA_DIR, exist_ok=True)


def _load_meetings() -> Dict[str, Any]:
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_meetings(data: Dict[str, Any]):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# Initialize default sample meeting if storage is empty
_meetings = _load_meetings()
if not _meetings:
    sample_id = "sample-sync-01"
    _meetings[sample_id] = {
        "id": sample_id,
        "title": "notePro Product & Architecture Sprint Sync",
        "date": datetime.now().strftime("%B %d, %Y - %I:%M %p"),
        "attendees": ["Sarah (Product Lead)", "David (Lead Eng)", "Alex (UI/UX)", "You (Note Taker)"],
        "user_raw_notes": "- Audio pipeline latency check: David reported 320ms on Deepgram Nova-2.\n- Attendees UI: Alex confirmed Figma mockup ready by Thursday 3 PM.\n- Google Calendar OAuth integration scheduled for this sprint.\n- Target launch: v1.2 release window.",
        "transcript_segments": [
            {"start": 0.0, "end": 4.5, "speaker": "Sarah (Product Lead)", "text": "Thanks everyone for joining. Today we need to lock down the v1.2 release scope and review current user feedback."},
            {"start": 5.0, "end": 11.8, "speaker": "David (Lead Eng)", "text": "On the engineering side, the real-time audio pipeline is fully deployed. The Deepgram latency is hovering around 320 milliseconds, which is well within our budget."},
            {"start": 12.2, "end": 17.5, "speaker": "Sarah (Product Lead)", "text": "Great! Did we decide on whether to include calendar attendee auto-tagging in this sprint?"},
            {"start": 18.0, "end": 25.5, "speaker": "Alex (UI/UX)", "text": "Yes, we agreed that attendee context should be highlighted on the left pane. I will finalize the Figma specs by this Thursday at 3 PM."},
            {"start": 26.0, "end": 33.0, "speaker": "David (Lead Eng)", "text": "Action item for me: I will set up the OAuth integration for Google Calendar and make sure we have unit tests covering audio edge cases."}
        ],
        "enhanced_notes": None,
        "status": "completed",
        "created_at": datetime.now().isoformat()
    }
    _save_meetings(_meetings)


# Models
class MeetingCreate(BaseModel):
    title: str = "New Meeting"
    attendees: List[str] = Field(default_factory=lambda: ["Me"])
    user_raw_notes: str = ""


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    attendees: Optional[List[str]] = None
    user_raw_notes: Optional[str] = None


class TranscriptChunk(BaseModel):
    start: float
    end: float
    speaker: str = "Speaker"
    text: str


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "notePro API",
        "version": "1.0.0",
        "active_meetings": len(_meetings),
        "stt_providers": {
            "deepgram": bool(os.getenv("DEEPGRAM_API_KEY")),
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "fallback": True
        }
    }


@app.get("/api/meetings")
def list_meetings():
    meetings = _load_meetings()
    return list(meetings.values())


@app.post("/api/meetings")
def create_meeting(payload: MeetingCreate):
    meetings = _load_meetings()
    m_id = f"m-{uuid.uuid4().hex[:8]}"
    new_m = {
        "id": m_id,
        "title": payload.title,
        "date": datetime.now().strftime("%B %d, %Y - %I:%M %p"),
        "attendees": payload.attendees,
        "user_raw_notes": payload.user_raw_notes,
        "transcript_segments": [],
        "enhanced_notes": None,
        "status": "draft",
        "created_at": datetime.now().isoformat()
    }
    meetings[m_id] = new_m
    _save_meetings(meetings)
    return new_m


@app.get("/api/meetings/{m_id}")
def get_meeting(m_id: str):
    meetings = _load_meetings()
    if m_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meetings[m_id]


@app.put("/api/meetings/{m_id}")
def update_meeting(m_id: str, payload: MeetingUpdate):
    meetings = _load_meetings()
    if m_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    m = meetings[m_id]
    if payload.title is not None:
        m["title"] = payload.title
    if payload.attendees is not None:
        m["attendees"] = payload.attendees
    if payload.user_raw_notes is not None:
        m["user_raw_notes"] = payload.user_raw_notes
    _save_meetings(meetings)
    return m


@app.post("/api/meetings/{m_id}/transcript")
def append_transcript(m_id: str, chunk: TranscriptChunk):
    meetings = _load_meetings()
    if m_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meetings[m_id]["transcript_segments"].append(chunk.dict())
    _save_meetings(meetings)
    return {"status": "success", "total_segments": len(meetings[m_id]["transcript_segments"])}


@app.post("/api/meetings/{m_id}/transcribe")
async def upload_and_transcribe(m_id: str, audio_file: UploadFile = File(...)):
    """Receives audio file from browser recording and transcribes via STT pipeline."""
    meetings = _load_meetings()
    if m_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")

    temp_path = os.path.join(DATA_DIR, f"{m_id}_{audio_file.filename}")
    with open(temp_path, "wb") as f:
        f.write(await audio_file.read())

    try:
        segments = stt_service.transcribe_audio_file(temp_path)
        meetings[m_id]["transcript_segments"] = segments
        meetings[m_id]["status"] = "transcribed"
        _save_meetings(meetings)
        return {"status": "success", "segments": segments}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@app.post("/api/meetings/{m_id}/enhance")
def trigger_enhancement(m_id: str):
    """Runs Granola 3-Way Note Fusion on the meeting's notes and transcript."""
    meetings = _load_meetings()
    if m_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    m = meetings[m_id]

    enhanced = fusion_engine.enhance_notes(
        meeting_title=m["title"],
        attendees=m["attendees"],
        meeting_date=m["date"],
        user_raw_notes=m["user_raw_notes"],
        transcript_segments=m["transcript_segments"]
    )

    m["enhanced_notes"] = enhanced
    m["status"] = "enhanced"
    _save_meetings(meetings)
    return enhanced


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting notePro Backend on http://0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
