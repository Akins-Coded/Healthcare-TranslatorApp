"use client";

import { useState } from "react";

export default function SpeechButton({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const recognition =
    typeof window !== "undefined" &&
    new (window.SpeechRecognition || window.webkitSpeechRecognition)();

  if (recognition) {
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => onTranscript(event.results[0][0].transcript);
  }

  const startListening = () => {
    if (recognition) {
      setListening(true);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition) {
      setListening(false);
      recognition.stop();
    }
  };

  return (
    <button
      onClick={listening ? stopListening : startListening}
      className="p-2 bg-blue-500 text-white rounded"
    >
      {listening ? "Stop Listening" : "Start Listening"}
    </button>
  );
}
