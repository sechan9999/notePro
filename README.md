# 📝 notePro — AI-Enhanced Meeting Note Application

**notePro** is a modern, full-stack implementation of the AI-enhanced meeting note-taking workflow inspired by [Granola.ai](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes). 

Unlike legacy meeting bots (Otter, Fireflies) that intrusively join Zoom or Google Meet calls as external participants, **notePro** runs locally and starts audio transcription **only when the user opens a meeting note or clicks record**.

---

## ⚡ notePro's Core Architecture: The 3-Way Note Fusion

Standard AI note apps replace your notes with a generic, verbose summary. **notePro** preserves your thoughts and uses a **3-way fusion engine**:

```
 ┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
 │   Meeting Metadata     │  +  │   User's Raw Notes     │  +  │  Timestamped Audio     │
 │ (Title, Date, People)  │     │ (Bullet points typed)  │     │       Transcript       │
 └───────────┬────────────┘     └───────────┬────────────┘     └───────────┬────────────┘
             │                              │                              │
             └──────────────────────┬───────┴──────────────────────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │   notePro 3-Way Fusion  │
                       │ Prompt Engine (Gemini)  │
                       └────────────┬────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │               notePro AI-Enhanced Document               │
       │  • ⚡ Executive Summary (2-3 crisp sentences)            │
       │  • 🎯 Key Decisions (Locked agreements)                  │
       │  • 🔍 User Bullet Expansions (Context + verbatim quotes) │
       │  • ✅ Action Items (Owner + Deadline + Context)          │
       └──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | **React + Vite** | notePro minimalist dark editor, live audio waveform, split-pane view |
| **Audio Capture** | **Web Audio API** | Microphone (`getUserMedia`) and optional system/tab audio (`getDisplayMedia`) |
| **Live STT** | **Deepgram Nova-2 / Gemini Audio / Web Speech** | Multi-provider transcription pipeline with speaker diarization |
| **AI Note Fusion** | **Google Gemini 2.5 / 3 Flash** | Dual-pass prompt combining user notes with transcript citations |
| **Backend API** | **FastAPI (Python 3.11)** | High-speed REST endpoints and JSON meeting persistence |

---

## 🚀 Quickstart Guide

### 1. Backend Setup
In a terminal:
```bash
# (Optional) Set your API keys in environment or .env
set GEMINI_API_KEY=your_key_here
set DEEPGRAM_API_KEY=your_key_here

# Run backend API on port 8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
In a second terminal:
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Running Automated Tests
```bash
python -m backend.test_pipeline
```
Verifies meeting creation, audio chunk ingestion, and the 3-way fusion engine output.

---

## 📁 Repository Structure
```
notePro/
├── backend/
│   ├── main.py              # FastAPI application server
│   ├── stt_service.py       # Deepgram & Gemini Audio transcription pipeline
│   ├── fusion_engine.py     # notePro 3-way note fusion prompt engine
│   ├── test_pipeline.py     # End-to-end integration test
│   ├── requirements.txt     # Python dependencies
│   └── data/meetings.json   # Persistent meeting store
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main notePro dual-pane interface
    │   ├── audioRecorder.js # Web Audio API recorder & volume visualizer
    │   ├── index.css        # notePro warm dark typography styles
    │   └── main.jsx         # Vite entrypoint
    ├── package.json
    └── vite.config.js
```
