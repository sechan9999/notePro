"""
streamlit_app.py
─────────────────────────────────────────────────────────────────
notePro — Streamlit Community Cloud & Local Deployment
AI-Enhanced Meeting Notes with live audio capture, STT pipeline,
and Granola-style 3-way note fusion.
"""
import os
import sys
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import streamlit as st
from backend.stt_service import stt_service
from backend.fusion_engine import fusion_engine

# ── Page Config ────────────────────────────────────────────────────────
st.set_page_config(
    page_title="notePro — AI Meeting Notes",
    page_icon="📝",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Custom Granola-Style Dark Theme ─────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg-app: #0c0d12;
  --bg-card: #14161f;
  --border: rgba(255, 255, 255, 0.08);
  --accent-granola: #ff9b50;
  --accent-emerald: #34d399;
  --accent-purple: #818cf8;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
}

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--text-main);
}

[data-testid="stAppViewContainer"] {
    background: radial-gradient(circle at 50% 0%, #171926 0%, #0c0d12 100%);
}

[data-testid="stSidebar"] {
    background: #090a0e;
    border-right: 1px solid var(--border);
}

.notepro-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0 20px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
}

.notepro-title {
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff, #ff9b50);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
}

.card-box {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
}

.badge-pill {
    background: rgba(255, 155, 80, 0.15);
    color: var(--accent-granola);
    border: 1px solid rgba(255, 155, 80, 0.3);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
}
</style>
""", unsafe_allow_html=True)

# ── Session State Setup ────────────────────────────────────────────────
if "meetings" not in st.session_state:
    st.session_state.meetings = [
        {
            "id": "sample-sync-01",
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
            "status": "draft"
        }
    ]

if "active_id" not in st.session_state:
    st.session_state.active_id = st.session_state.meetings[0]["id"]

# Helper to find current meeting
current_meeting = next((m for m in st.session_state.meetings if m["id"] == st.session_state.active_id), st.session_state.meetings[0])

# ── Sidebar ────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 📝 notePro")
    st.caption("AI-Enhanced Meeting Notes without intrusive bots")

    if st.button("➕ New Meeting", use_container_width=True):
        new_id = f"m-{uuid.uuid4().hex[:8]}"
        new_entry = {
            "id": new_id,
            "title": f"Meeting {len(st.session_state.meetings) + 1}",
            "date": datetime.now().strftime("%B %d, %Y - %I:%M %p"),
            "attendees": ["You (Note Taker)"],
            "user_raw_notes": "- Discussion point 1\n- Action item 2",
            "transcript_segments": [],
            "enhanced_notes": None,
            "status": "draft"
        }
        st.session_state.meetings.insert(0, new_entry)
        st.session_state.active_id = new_id
        st.rerun()

    st.markdown("---")
    st.markdown("**Recent Meetings**")
    for m in st.session_state.meetings:
        is_sel = m["id"] == st.session_state.active_id
        btn_label = f"{'👉 ' if is_sel else ''}{m['title'][:24]}"
        if st.button(btn_label, key=f"sel_{m['id']}", use_container_width=True):
            st.session_state.active_id = m["id"]
            st.rerun()

    st.markdown("---")
    st.markdown("""
    <div style="font-size:0.78rem; color:#94a3b8; line-height:1.5;">
      💡 <b>notePro Principle:</b><br>
      You type bullets during the call; notePro transcribes audio locally and merges your notes with exact quotes and decisions.
    </div>
    """, unsafe_allow_html=True)

# ── Header ─────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="notepro-header">
  <div>
    <h1 class="notepro-title">📝 {current_meeting['title']}</h1>
    <p style="margin:4px 0 0 0; color:#94a3b8; font-size:0.85rem;">
      📅 {current_meeting['date']} &nbsp;|&nbsp; 👥 {', '.join(current_meeting['attendees'])}
    </p>
  </div>
</div>
""", unsafe_allow_html=True)

# View Switcher Tab
t1, t2 = st.tabs(["✍️ Meeting Workbench (Notes & Audio)", "✨ notePro AI-Enhanced Notes"])

# ── Tab 1: Workbench ───────────────────────────────────────────────────
with t1:
    col_notes, col_audio = st.columns([1.2, 1.0], gap="large")

    with col_notes:
        st.markdown("#### 📝 Your Raw Meeting Notes")
        st.caption("Type your informal bullets here during the meeting:")

        notes_input = st.text_area(
            "Raw Notes",
            value=current_meeting["user_raw_notes"],
            height=320,
            label_visibility="collapsed",
            placeholder="Type your notes here in bullet points...\n- Target latency agreed at 320ms\n- Alex confirmed Figma by Thursday\n- David handling OAuth unit tests"
        )
        current_meeting["user_raw_notes"] = notes_input

        col_act1, col_act2 = st.columns([1, 1])
        with col_act1:
            if st.button("✨ Enhance Notes with AI", type="primary", use_container_width=True):
                with st.spinner("⚡ notePro 3-way fusion engine running..."):
                    enhanced = fusion_engine.enhance_notes(
                        meeting_title=current_meeting["title"],
                        attendees=current_meeting["attendees"],
                        meeting_date=current_meeting["date"],
                        user_raw_notes=current_meeting["user_raw_notes"],
                        transcript_segments=current_meeting["transcript_segments"]
                    )
                    current_meeting["enhanced_notes"] = enhanced
                    current_meeting["status"] = "enhanced"
                    st.success("Notes enhanced! Click the '✨ notePro AI-Enhanced Notes' tab.")
                    st.rerun()

        with col_act2:
            if st.button("📋 Load Sample Sync Audio & Bullets", use_container_width=True):
                current_meeting["user_raw_notes"] = (
                    "- Latency requirement confirmed: 320ms via Deepgram\n"
                    "- UI Figma specs: Alex delivering by Thursday 3 PM\n"
                    "- Calendar integration: David writing tests"
                )
                current_meeting["transcript_segments"] = [
                    {"start": 0.0, "end": 4.5, "speaker": "Sarah (PM)", "text": "Thanks everyone for joining. Today we need to lock down the v1.2 release scope and review current user feedback."},
                    {"start": 5.0, "end": 11.8, "speaker": "David (Lead Eng)", "text": "On the engineering side, the real-time audio pipeline is fully deployed. The Deepgram latency is hovering around 320 milliseconds, which is well within our budget."},
                    {"start": 12.2, "end": 17.5, "speaker": "Sarah (PM)", "text": "Great! Did we decide on whether to include calendar attendee auto-tagging in this sprint?"},
                    {"start": 18.0, "end": 25.5, "speaker": "Alex (UI/UX)", "text": "Yes, we agreed that attendee context should be highlighted on the left pane. I will finalize the Figma specs by this Thursday at 3 PM."},
                    {"start": 26.0, "end": 33.0, "speaker": "David (Lead Eng)", "text": "Action item for me: I will set up the OAuth integration for Google Calendar and make sure we have unit tests covering audio edge cases."}
                ]
                st.rerun()

    with col_audio:
        st.markdown("#### 🎙️ Audio Capture & Pipeline")
        st.caption("Record live mic audio or upload meeting recording:")

        # Native browser microphone recorder
        audio_data = st.audio_input("Record Meeting Microphone")
        if audio_data is not None:
            st.audio(audio_data)
            if st.button("⚡ Transcribe Recorded Audio"):
                with st.spinner("📡 Transcribing audio via STT pipeline..."):
                    temp_audio_path = os.path.join(os.path.dirname(__file__), "backend", "data", f"temp_{current_meeting['id']}.wav")
                    with open(temp_audio_path, "wb") as f:
                        f.write(audio_data.getvalue())
                    try:
                        segments = stt_service.transcribe_audio_file(temp_audio_path)
                        current_meeting["transcript_segments"] = segments
                        st.success(f"Transcribed {len(segments)} segments successfully!")
                        st.rerun()
                    finally:
                        if os.path.exists(temp_audio_path):
                            try:
                                os.remove(temp_audio_path)
                            except Exception:
                                pass

        # Transcript Stream Display
        st.markdown(f"**Transcript Feed ({len(current_meeting['transcript_segments'])} segments)**")
        if current_meeting["transcript_segments"]:
            for seg in current_meeting["transcript_segments"]:
                with st.container():
                    st.markdown(f"""
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px 14px; margin-bottom:8px;">
                      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <b style="color:#ff9b50; font-size:0.82rem;">{seg.get('speaker', 'Speaker')}</b>
                        <span style="color:#64748b; font-size:0.75rem; font-family:monospace;">{int(seg.get('start', 0))}s - {int(seg.get('end', 0))}s</span>
                      </div>
                      <p style="margin:0; font-size:0.88rem; color:#cbd5e1;">{seg.get('text', '')}</p>
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.info("No audio transcript recorded yet. Use the recorder above or click 'Load Sample Sync Audio'!")

# ── Tab 2: Enhanced Granola Note ───────────────────────────────────────
with t2:
    if current_meeting.get("enhanced_notes"):
        enh = current_meeting["enhanced_notes"]

        # Copy Markdown Button
        st.download_button(
            label="📥 Download Markdown Document",
            data=enh.get("markdown_formatted", ""),
            file_name=f"{current_meeting['title'].lower().replace(' ', '_')}.md",
            mime="text/markdown"
        )

        st.markdown("---")

        # 1. Executive Summary
        st.markdown(f"""
        <div class="card-box">
          <h4 style="color:#fff; margin-top:0; display:flex; align-items:center; gap:8px;">
            ⚡ Executive Summary
          </h4>
          <p style="color:#cbd5e1; font-size:0.95rem; line-height:1.6; margin:0;">
            {enh.get('executive_summary', '')}
          </p>
        </div>
        """, unsafe_allow_html=True)

        # 2. Key Decisions
        if enh.get("key_decisions"):
            st.markdown("#### 🎯 Key Decisions")
            for d in enh["key_decisions"]:
                st.markdown(f"- ✅ **{d}**")
            st.markdown("<br>", unsafe_allow_html=True)

        # 3. AI-Enriched Topics (User Bullets vs Transcript Citations)
        if enh.get("expanded_topics"):
            st.markdown("#### 🔍 notePro AI-Enriched Notes")
            for topic in enh["expanded_topics"]:
                st.markdown(f"""
                <div class="card-box">
                  <h4 style="color:#fff; margin-top:0; font-size:1.05rem;">{topic.get('topic_title', '')}</h4>
                  <div style="background:rgba(255,255,255,0.03); border-left:3px solid #ff9b50; padding:8px 12px; border-radius:4px; margin-bottom:10px;">
                    <span style="color:#ff9b50; font-weight:600; font-size:0.85rem;">Your original note:</span> <i>"{topic.get('user_original_intent', '')}"</i>
                  </div>
                  <p style="color:#e2e8f0; font-size:0.92rem; line-height:1.6; margin-bottom:8px;">
                    {topic.get('ai_enrichment', '')}
                  </p>
                  <div style="color:#818cf8; font-size:0.84rem; font-style:italic;">
                    💬 <i>{topic.get('key_quote', '')}</i>
                  </div>
                </div>
                """, unsafe_allow_html=True)

        # 4. Action Items
        if enh.get("action_items"):
            st.markdown("#### ✅ Action Items")
            for item in enh["action_items"]:
                st.markdown(f"- [ ] **{item.get('task')}** — 👤 `{item.get('owner')}` (🗓️ *{item.get('deadline')}*)")
    else:
        st.markdown("""
        <div style="text-align:center; padding:50px 20px; color:#64748b;">
          <span style="font-size:2.5rem;">✨</span>
          <h3 style="color:#fff; margin:12px 0 8px 0;">No Enhanced Notes Yet</h3>
          <p style="max-width:420px; margin:0 auto 20px auto; font-size:0.9rem; line-height:1.6;">
            Record or load audio transcript, write your raw bullet notes in the workbench tab, then click <b>"Enhance Notes with AI"</b>!
          </p>
        </div>
        """, unsafe_allow_html=True)
