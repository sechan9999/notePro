/**
 * frontend/src/audioRecorder.js
 * ─────────────────────────────────────────────────────────────
 * Web Audio API & MediaRecorder orchestrator for Granola Core.
 * Captures:
 *  - Microphone audio (getUserMedia)
 *  - Optional system/tab audio (getDisplayMedia)
 *  - Live audio volume analyser for waveform visualization
 *  - Live interim browser speech-to-text preview
 */

export class AudioRecorder {
  constructor(onVolumeChange, onLiveTranscript) {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.animationFrameId = null;
    this.onVolumeChange = onVolumeChange;
    this.onLiveTranscript = onLiveTranscript;
    this.recognition = null;
    this.isRecording = false;
  }

  async start(includeSystemAudio = false) {
    this.audioChunks = [];

    // 1. Get Microphone stream
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    let finalStream = micStream;

    // Optional: merge system/tab audio if requested
    if (includeSystemAudio && navigator.mediaDevices.getDisplayMedia) {
      try {
        const sysStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(micStream).connect(dest);
        if (sysStream.getAudioTracks().length > 0) {
          ctx.createMediaStreamSource(sysStream).connect(dest);
        }
        finalStream = dest.stream;
      } catch (e) {
        console.warn("System audio capture skipped/cancelled, falling back to mic:", e);
      }
    }

    this.stream = finalStream;

    // 2. Setup Web Audio Analyser for live visualizer
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isRecording) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 255) * 100));
        if (this.onVolumeChange) {
          this.onVolumeChange(normalized);
        }
        this.animationFrameId = requestAnimationFrame(checkVolume);
      };
      this.isRecording = true;
      checkVolume();
    } catch (err) {
      console.warn("Audio analyser initialization error:", err);
    }

    // 3. Setup MediaRecorder for backend audio blob creation
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000); // 1-second chunks

    // 4. Live Browser SpeechRecognition (Interim live transcript feed)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            const isFinal = event.results[i].isFinal;
            if (this.onLiveTranscript) {
              this.onLiveTranscript(transcript, isFinal);
            }
          }
        };

        this.recognition.onerror = (e) => {
          console.warn("SpeechRecognition error:", e);
        };

        this.recognition.start();
      } catch (err) {
        console.warn("Live speech recognition not available or denied:", err);
      }
    }
  }

  stop() {
    return new Promise((resolve) => {
      this.isRecording = false;

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {}
      }

      if (this.audioContext && this.audioContext.state !== "closed") {
        this.audioContext.close();
      }

      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}
