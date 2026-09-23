import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  const [active, setActive] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentSpeech, setCurrentSpeech] = useState("System ready. Press anywhere to start.");
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      speak("Unable to access camera. Please check permissions.");
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('frame', blob, 'frame.jpg');

      try {
        const response = await axios.post(`${BACKEND_URL}/api/vision/process-frame`, formData);
        const { speechText, alert } = response.data;
        setCurrentSpeech(speechText);
        speak(speechText);

        if (alert && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }

        fetchAlerts();
      } catch (err) {
        console.error("Frame submission error:", err);
      }
    }, 'image/jpeg', 0.7);
  };

  const toggleAssistant = () => {
    if (!active) {
      startCamera();
      setActive(true);
      speak("Smart AI assistant activated. Scanning surroundings.");
      intervalRef.current = setInterval(captureFrame, 3500);
    } else {
      setActive(false);
      clearInterval(intervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      speak("Smart AI assistant deactivated.");
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/alerts`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#111827' }}>Smart AI for Unsighted</h1>
        <p style={{ color: '#4b5563' }}>High-contrast, audio-guided assistive environment</p>
      </header>

      <button
        onClick={toggleAssistant}
        aria-label={active ? "Stop Assistant" : "Start Assistant"}
        style={{
          width: '100%', padding: '1.5rem', fontSize: '1.4rem', fontWeight: 'bold',
          backgroundColor: active ? '#dc2626' : '#2563eb', color: '#ffffff',
          borderRadius: '12px', border: 'none', cursor: 'pointer', marginBottom: '1.5rem'
        }}
      >
        {active ? "■ DEACTIVATE SCANNER" : "▶ ACTIVATE SCANNER"}
      </button>

      <section style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Audio Output Feedback:</h2>
        <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#1f2937' }}>{currentSpeech}</p>
      </section>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '360px', borderRadius: '8px', background: '#000' }} />
      </div>

      <section>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Recent Logged Alerts</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {logs.map((log) => (
            <li key={log._id} style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
              <strong>[{log.alertType}]</strong> {log.message} - <small>{new Date(log.createdAt).toLocaleTimeString()}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}