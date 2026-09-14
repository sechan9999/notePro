"""
backend/test_pipeline.py
─────────────────────────────────────────────────────────────────
Integration test for Granola Core backend API and fusion engine.
"""
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from fastapi.testclient import TestClient
from backend.main import app
from backend.fusion_engine import fusion_engine


def test_pipeline():
    print("=========================================================")
    print("🧪 Running Granola Core Backend Pipeline Tests...")
    print("=========================================================\n")

    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✅ 1. Backend Health Check: OK")

    # 2. List meetings
    res = client.get("/api/meetings")
    assert res.status_code == 200
    meetings = res.json()
    assert len(meetings) > 0, "No meetings found"
    print(f"✅ 2. Meeting Store: OK ({len(meetings)} meetings loaded)")

    # 3. Create a new meeting
    payload = {
        "title": "Granola Design Review",
        "attendees": ["Alice (Designer)", "Bob (Engineer)"],
        "user_raw_notes": "- Dark mode UI needs high contrast.\n- Meeting recorder should support browser mic.\n- Enhance button in header."
    }
    res = client.post("/api/meetings", json=payload)
    assert res.status_code == 200
    new_m = res.json()
    m_id = new_m["id"]
    print(f"✅ 3. Create Meeting: OK (ID: {m_id})")

    # 4. Append transcript chunk
    chunk = {
        "start": 0.0,
        "end": 6.5,
        "speaker": "Alice",
        "text": "Let's make sure the audio waveform pulses in real time so the user knows recording is live."
    }
    res = client.post(f"/api/meetings/{m_id}/transcript", json=chunk)
    assert res.status_code == 200
    print("✅ 4. Append Live Transcript Chunk: OK")

    # 5. Run Granola 3-Way Note Fusion
    res = client.post(f"/api/meetings/{m_id}/enhance")
    assert res.status_code == 200
    enhanced = res.json()
    assert "executive_summary" in enhanced, "Missing executive_summary"
    assert "key_decisions" in enhanced, "Missing key_decisions"
    assert "expanded_topics" in enhanced, "Missing expanded_topics"
    assert "action_items" in enhanced, "Missing action_items"

    print("✅ 5. Granola 3-Way Note Fusion Engine: OK")
    print(f"\n📝 Executive Summary: {enhanced['executive_summary']}")
    print(f"🎯 Key Decisions: {len(enhanced['key_decisions'])} items")
    print(f"🔍 Expanded Topics: {len(enhanced['expanded_topics'])} items")
    print(f"✅ Action Items: {len(enhanced['action_items'])} items")

    print("\n🎉 All Granola backend pipeline tests passed!")


if __name__ == "__main__":
    test_pipeline()
