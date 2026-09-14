import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Sparkles, Plus, Copy, Check, Calendar, Users,
  Clock, Volume2, ArrowRight, FileText, ChevronRight, Share2,
  ListTodo, CheckCircle2, Quote, AlertCircle
} from 'lucide-react';
import { AudioRecorder } from './audioRecorder';

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [liveInterim, setLiveInterim] = useState('');
  const [viewMode, setViewMode] = useState('enhanced'); // 'notes' | 'enhanced' | 'split'
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);

  const recorderRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch all meetings on load
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
        if (data.length > 0 && !currentMeeting) {
          setCurrentMeeting(data[0]);
        }
      }
    } catch (e) {
      console.warn("Backend not reached, using local state:", e);
    }
  };

  // Timer for active recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // Start Recording
  const handleStartRecording = async () => {
    try {
      const rec = new AudioRecorder(
        (volume) => setAudioVolume(volume),
        (text, isFinal) => {
          if (isFinal && text.trim()) {
            const newSegment = {
              start: recordingSeconds - 3 > 0 ? recordingSeconds - 3 : 0,
              end: recordingSeconds,
              speaker: "Speaker",
              text: text.trim()
            };
            if (currentMeeting) {
              const updated = {
                ...currentMeeting,
                transcript_segments: [...(currentMeeting.transcript_segments || []), newSegment]
              };
              setCurrentMeeting(updated);
              // Save to backend
              fetch(`/api/meetings/${currentMeeting.id}/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSegment)
              }).catch(() => {});
            }
            setLiveInterim('');
          } else {
            setLiveInterim(text);
          }
        }
      );

      await rec.start();
      recorderRef.current = rec;
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission denied or unavailable: " + err.message);
    }
  };

  // Stop Recording
  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);
    setAudioVolume(0);
    setLiveInterim('');

    const blob = await recorderRef.current.stop();
    if (blob && currentMeeting) {
      const formData = new FormData();
      formData.append('audio_file', blob, 'meeting_audio.webm');
      try {
        const res = await fetch(`/api/meetings/${currentMeeting.id}/transcribe`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.segments) {
            setCurrentMeeting(prev => ({
              ...prev,
              transcript_segments: data.segments,
              status: 'transcribed'
            }));
          }
        }
      } catch (e) {
        console.warn("Upload failed:", e);
      }
    }
  };

  // Enhance Notes via Granola 3-way Fusion
  const handleEnhance = async () => {
    if (!currentMeeting) return;
    setIsEnhancing(true);
    try {
      // Save latest user raw notes first
      await fetch(`/api/meetings/${currentMeeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_raw_notes: currentMeeting.user_raw_notes })
      });

      const res = await fetch(`/api/meetings/${currentMeeting.id}/enhance`, {
        method: 'POST'
      });
      if (res.ok) {
        const enhanced = await res.json();
        setCurrentMeeting(prev => ({
          ...prev,
          enhanced_notes: enhanced,
          status: 'enhanced'
        }));
        setViewMode('enhanced');
      }
    } catch (err) {
      alert("Enhancement failed: " + err.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Create New Meeting
  const handleCreateMeeting = async () => {
    const newTitle = prompt("Enter meeting title:", "Sprint Planning & Sync");
    if (!newTitle) return;

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          attendees: ["You (Note Taker)", "Team Lead"],
          user_raw_notes: "- Quick updates on sprint goals\n- Blockers and action items"
        })
      });
      if (res.ok) {
        const created = await res.json();
        setMeetings(prev => [created, ...prev]);
        setCurrentMeeting(created);
        setViewMode('notes');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const copyMarkdown = () => {
    if (currentMeeting?.enhanced_notes?.markdown_formatted) {
      navigator.clipboard.writeText(currentMeeting.enhanced_notes.markdown_formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-app)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      {/* ── LEFT SIDEBAR: MEETINGS LIST ── */}
      <div style={{ width: '260px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>📝</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>notePro</span>
          </div>
          <button
            onClick={handleCreateMeeting}
            style={{ background: 'rgba(255,155,80,0.15)', border: '1px solid rgba(255,155,80,0.3)', color: 'var(--accent-granola)', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="New Meeting Note"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Meeting List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
            Recent Meetings
          </div>
          {meetings.map((m) => (
            <div
              key={m.id}
              onClick={() => setCurrentMeeting(m)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '4px',
                cursor: 'pointer',
                background: currentMeeting?.id === m.id ? 'var(--bg-card)' : 'transparent',
                border: currentMeeting?.id === m.id ? '1px solid var(--border)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: currentMeeting?.id === m.id ? '#ffffff' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {m.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.date?.split('-')[0]}</span>
                <span style={{ color: m.enhanced_notes ? 'var(--accent-granola)' : 'var(--text-faint)' }}>
                  {m.enhanced_notes ? '✨ Enhanced' : 'Raw'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Philosophy Badge */}
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          💡 <b>notePro Principle:</b><br />
          No intrusive bot. Audio starts when you take notes; AI enhances your typed bullets with verbatim quotes.
        </div>
      </div>

      {/* ── MAIN WORKBENCH ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Top Navbar */}
        <div style={{ height: '64px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              value={currentMeeting?.title || ''}
              onChange={(e) => setCurrentMeeting({ ...currentMeeting, title: e.target.value })}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.25rem', fontWeight: 700, outline: 'none', width: '380px' }}
            />
            {currentMeeting?.enhanced_notes && (
              <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--accent-emerald)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                AI Enhanced
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewMode('notes')}
                style={{ background: viewMode === 'notes' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: viewMode === 'notes' ? '#fff' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Raw Notes
              </button>
              <button
                onClick={() => setViewMode('enhanced')}
                style={{ background: viewMode === 'enhanced' ? 'rgba(255,155,80,0.2)' : 'transparent', border: 'none', color: viewMode === 'enhanced' ? 'var(--accent-granola)' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Sparkles size={14} /> Enhanced View
              </button>
            </div>

            {/* Record Button */}
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--accent-rose)', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Mic size={16} /> Record Meeting
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="rec-pulse"
                style={{ background: 'var(--accent-rose)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MicOff size={16} /> Stop ({formatSec(recordingSeconds)})
              </button>
            )}

            {/* Granola Enhance CTA */}
            <button
              onClick={handleEnhance}
              disabled={isEnhancing || isRecording}
              style={{
                background: 'linear-gradient(135deg, #ff9b50, #f97316)',
                border: 'none',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isEnhancing || isRecording ? 'not-allowed' : 'pointer',
                opacity: isEnhancing || isRecording ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(255,155,80,0.3)'
              }}
            >
              <Sparkles size={16} />
              {isEnhancing ? 'Enhancing with AI...' : 'Enhance Notes'}
            </button>
          </div>
        </div>

        {/* ── WORKSPACE BODY (SPLIT PANE) ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* LEFT PANEL: NOTES / ENHANCED VIEW */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '24px 32px', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
            
            {/* Metadata Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                <span>{currentMeeting?.date || 'Today'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} />
                <span>{currentMeeting?.attendees?.join(', ') || 'No attendees'}</span>
              </div>
            </div>

            {/* VIEW MODE: RAW NOTES */}
            {viewMode === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                    Your Raw Meeting Notes (Type freely)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                    Auto-saved
                  </span>
                </div>
                <textarea
                  value={currentMeeting?.user_raw_notes || ''}
                  onChange={(e) => setCurrentMeeting({ ...currentMeeting, user_raw_notes: e.target.value })}
                  placeholder="Type your notes here in bullet points during the call...&#10;&#10;e.g.&#10;- Latency target: David mentioned 320ms on Deepgram&#10;- UI mockup: Alex to deliver Figma by Thursday 3pm&#10;- Google calendar OAuth approved"
                  style={{
                    flex: 1,
                    minHeight: '380px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f1f5f9',
                    fontSize: '1.05rem',
                    lineHeight: '1.8',
                    fontFamily: 'var(--font-sans)',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* VIEW MODE: ENHANCED GRANOLA NOTES */}
            {viewMode === 'enhanced' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {currentMeeting?.enhanced_notes ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-granola)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        ✨ notePro AI Enhanced Document
                      </span>
                      <button
                        onClick={copyMarkdown}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied Markdown!' : 'Copy Markdown'}
                      </button>
                    </div>

                    {/* Executive Summary */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚡ Executive Summary
                      </h4>
                      <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {currentMeeting.enhanced_notes.executive_summary}
                      </p>
                    </div>

                    {/* Key Decisions */}
                    {currentMeeting.enhanced_notes.key_decisions?.length > 0 && (
                      <div style={{ background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ color: 'var(--accent-emerald)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🎯 Key Decisions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {currentMeeting.enhanced_notes.key_decisions.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: '#f1f5f9' }}>
                              <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ marginTop: '3px', flexShrink: 0 }} />
                              <span>{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expanded Topics (User Note vs AI Transcript Expansion) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                        🔍 notePro AI-Enriched Notes
                      </h4>
                      {currentMeeting.enhanced_notes.expanded_topics?.map((topic, i) => (
                        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '8px' }}>
                            {topic.topic_title}
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid var(--accent-granola)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                            <span style={{ color: 'var(--accent-granola)', fontWeight: 600 }}>Your raw bullet:</span> "{topic.user_original_intent}"
                          </div>
                          <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '10px' }}>
                            {topic.ai_enrichment}
                          </p>
                          {topic.key_quote && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--accent-purple)', fontStyle: 'italic' }}>
                              <Quote size={14} />
                              <span>{topic.key_quote}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Action Items */}
                    {currentMeeting.enhanced_notes.action_items?.length > 0 && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ListTodo size={16} color="var(--accent-granola)" /> Action Items
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {currentMeeting.enhanced_notes.action_items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>{item.task}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem' }}>
                                <span style={{ background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                  {item.owner}
                                </span>
                                <span style={{ color: 'var(--text-faint)' }}>{item.deadline}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', textAlign: 'center', color: 'var(--text-faint)' }}>
                    <Sparkles size={40} color="var(--accent-granola)" style={{ marginBottom: '16px', opacity: 0.6 }} />
                    <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>No Enhanced Notes Yet</h3>
                    <p style={{ maxWidth: '380px', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '20px' }}>
                      Type your bullet points on the left during the meeting, record or add audio, then click <b>"Enhance Notes"</b>.
                    </p>
                    <button
                      onClick={handleEnhance}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent-granola)', padding: '8px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      ✨ Generate Sample AI Note
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: AUDIO MONITOR & LIVE TRANSCRIPTION */}
          <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', padding: '24px 20px', background: 'var(--bg-card)', overflowY: 'auto' }}>
            
            {/* Audio Waveform & Status */}
            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                  Live Audio Pipeline
                </span>
                <span style={{ fontSize: '0.75rem', color: isRecording ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                  {isRecording ? `● Recording (${formatSec(recordingSeconds)})` : '● Ready'}
                </span>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', gap: '4px' }}>
                {[...Array(16)].map((_, idx) => {
                  const barHeight = isRecording
                    ? Math.max(6, Math.min(32, Math.round((audioVolume * (0.5 + Math.sin(idx + recordingSeconds) * 0.5)))))
                    : 6;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '3px',
                        height: `${barHeight}px`,
                        background: isRecording ? 'var(--accent-rose)' : 'rgba(255,255,255,0.15)',
                        borderRadius: '2px',
                        transition: 'height 0.08s ease'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Live Transcript Stream */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  Audio Transcript ({currentMeeting?.transcript_segments?.length || 0} segments)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                  Deepgram Nova-2 / Whisper
                </span>
              </div>

              {/* Transcript Bubbles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                {currentMeeting?.transcript_segments?.map((seg, i) => (
                  <div key={i} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--accent-granola)' }}>
                        {seg.speaker}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                        {Math.floor(seg.start)}s - {Math.floor(seg.end)}s
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                      {seg.text}
                    </p>
                  </div>
                ))}

                {/* Live Interim Speech Bubble */}
                {liveInterim && (
                  <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px dashed rgba(244,63,94,0.3)', borderRadius: '10px', padding: '12px 14px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600 }}>Speaking now...</span>
                    <p style={{ fontSize: '0.88rem', color: '#fff', fontStyle: 'italic', marginTop: '4px' }}>
                      "{liveInterim}"
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
