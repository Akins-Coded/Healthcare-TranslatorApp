"use client";
"use client";

import { useState, useEffect } from "react";
import LanguageSelector from "./components/LanguageSelector";
import TextArea from "./components/TextArea";
import SpeechButton from "./components/SpeechButton";

export default function Home() {
  const [text, setText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [audioUrl, setAudioUrl] = useState(null);

  // Load saved transcript on page load
  useEffect(() => {
    const savedText = localStorage.getItem("spokenText");
    const savedTranslation = localStorage.getItem("translatedText");
    if (savedText) setText(savedText);
    if (savedTranslation) setTranslatedText(savedTranslation);
  }, []);

  const translateText = async () => {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage }),
    });

    const data = await response.json();
    setTranslatedText(data.translation);
    localStorage.setItem("translatedText", data.translation);
  };

  const generateSpeech = async () => {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: translatedText }),
    });

    const blob = await response.blob();
    setAudioUrl(URL.createObjectURL(blob));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-blue-700 dark:text-white">Healthcare Translation App</h1>

      <SpeechButton onTranscript={(spokenText) => {
        setText(spokenText);
        localStorage.setItem("spokenText", spokenText);
      }} />
      
      <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text or speak..." />

      <LanguageSelector selectedLanguage={targetLanguage} setLanguage={setTargetLanguage} />

      <button
        onClick={translateText}
        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-200 mt-4"
      >
        Translate
      </button>

      <TextArea value={translatedText} readOnly placeholder="Translated text..." />

      <button
        onClick={generateSpeech}
        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition duration-200 mt-4"
      >
        Speak
      </button>

      {audioUrl && (
        <audio controls className="mt-4">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
      )}
    </div>
  );
}


