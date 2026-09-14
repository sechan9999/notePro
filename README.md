# 📝 notePro — AI-Enhanced Meeting Notes

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://note-pro-pink.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20Python%203.11-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/Companion-Streamlit%20Cloud-FF4B4B?style=for-the-badge&logo=streamlit)](https://streamlit.io/)
[![AI Fusion](https://img.shields.io/badge/AI%20Engine-Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

> **Live Deployment:** [note-pro-pink.vercel.app](https://note-pro-pink.vercel.app/)  
> **GitHub Repository:** [github.com/sechan9999/notePro](https://github.com/sechan9999/notePro)

**notePro** is a modern, privacy-first implementation of the AI-enhanced meeting note workflow inspired by [Granola.ai](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes). 

Unlike legacy meeting bots (Otter, Fireflies) that intrusively join Zoom or Google Meet calls as external participants, **notePro** operates on your machine: audio transcription activates **only when you start typing notes or click record**.

---

## ⚡ Core Concept: The Granola 3-Way Note Fusion

Standard AI note tools replace your thoughts with a verbose, generic AI dump. **notePro** honors your typed bullet points as the primary anchor and performs a **3-way fusion**:

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
       │  • ⚡ Executive Summary (2-3 crisp outcome sentences)    │
       │  • 🎯 Key Decisions (Locked agreements & milestones)     │
       │  • 🔍 User Bullet Expansions (Context + verbatim quotes) │
       │  • 📋 Action Items (Task + Owner + Deadline + Context)   │
       │  • 📋 Markdown Export (1-click clipboard copy)          │
       └──────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **🎙️ On-Demand Audio Capture**: Web Audio API with real-time waveform visualizer and browser Web Speech API for immediate live transcription.
- **📝 Raw Notes Editor**: Frictionless bullet-point note-taking with automatic local persistence (`localStorage`).
- **✨ 3-Way Note Synthesis**: Enhances your handwritten bullets with exact quotes, latency metrics, and attendee consensus without overwriting your original intent.
- **🌐 Dual-Mode Deployment**:
  - **Standalone Vercel App**: Runs 100% client-side with persistent mock storage and instant client-side AI fusion heuristics.
  - **Full-Stack Hybrid**: Seamlessly connects to the FastAPI backend with Deepgram Nova-2 and Google Gemini 2.5 Flash when available.
- **📊 Streamlit Companion**: Single-file Python deployment (`streamlit_app.py`) for Streamlit Community Cloud.
- **📋 1-Click Markdown Export**: Formatted markdown copy button for Notion, Slack, or GitHub issues.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Web App** | **React 18 + Vite** | Warm dark aesthetic, Lucide icons, responsive split-pane workbench |
| **Audio Pipeline** | **Web Audio API + Web Speech** | Zero-dependency microphone capture, volume metering, live speech streaming |
| **Backend REST Server** | **FastAPI + Uvicorn** | Python 3.11 endpoints for meeting CRUD, audio upload, and AI dispatch |
| **STT Engine** | **Deepgram Nova-2 / Gemini Audio** | High-accuracy audio transcription with speaker diarization |
| **AI Note Engine** | **Google Gemini 2.5 Flash** | Structured JSON schema generation honoring user note anchors |
| **Cloud Hosting** | **Vercel & Streamlit Cloud** | Continuous deployment on push to `main` |

---

## 🚀 Quickstart Guide

### Option 1: Live Web App (Zero Setup)
Visit the deployed app directly: [https://note-pro-pink.vercel.app/](https://note-pro-pink.vercel.app/)

### Option 2: Local Full-Stack Development

#### 1. Backend Server
```bash
cd backend
pip install -r requirements.txt

# (Optional) Set your API keys for Gemini / Deepgram
export GEMINI_API_KEY="your-gemini-key"
export DEEPGRAM_API_KEY="your-deepgram-key"

# Run FastAPI server on port 8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### Option 3: Streamlit App
```bash
pip install streamlit google-genai
streamlit run streamlit_app.py
```

---

## 📁 Project Structure

```
notePro/
├── backend/
│   ├── main.py              # FastAPI REST API & sample data seeding
│   ├── stt_service.py       # Deepgram & Gemini Audio STT pipeline
│   ├── fusion_engine.py     # Granola 3-way note fusion prompt engine
│   ├── test_pipeline.py     # Integration test suite
│   ├── requirements.txt     # Python backend dependencies
│   └── data/meetings.json   # Persistent JSON file storage
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Dual-pane workbench, tabs, and client AI fusion
│   │   ├── audioRecorder.js # Web Audio API mic intake & visualizer
│   │   ├── index.css        # Typography, warm dark styling & animations
│   │   └── main.jsx         # React application entry point
│   ├── package.json
│   └── vite.config.js
├── streamlit_app.py         # Streamlit single-file companion application
├── vercel.json              # Vercel deployment routing configuration
└── README.md                # Project documentation
```

---

## 📄 License
MIT License © 2026 notePro. Inspired by Granola.ai.
