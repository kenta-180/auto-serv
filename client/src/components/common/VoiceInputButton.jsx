import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceInputButton({ onVoiceResult, buttonStyle }) {
  const [isListening, setIsListening] = useState(false);

  // Check if browser supports Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null; // Gracefully hide button on unsupported devices
  }

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && typeof onVoiceResult === 'function') {
          onVoiceResult(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      style={{
        background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
        border: isListening ? '1px solid #ef4444' : '1px solid #3b82f6',
        color: isListening ? '#f87171' : '#60a5fa',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s ease',
        ...buttonStyle
      }}
      title={isListening ? 'Listening... Speak now' : 'Hands-Free Voice Dictation'}
    >
      {isListening ? (
        <>
          <MicOff size={12} color="#f87171" /> Listening...
        </>
      ) : (
        <>
          <Mic size={12} color="#60a5fa" /> Voice Dictation
        </>
      )}
    </button>
  );
}
