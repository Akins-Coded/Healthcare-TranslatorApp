// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import LanguageSelector from "./components/LanguageSelector";
import TextArea from "./components/TextArea";
import SpeechButton from "./components/SpeechButton";

type LoadingState = { translate: boolean; speech: boolean };

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}

export default function Home() {
  const [text, setText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("es");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ translate: false, speech: false });
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const savedText = localStorage.getItem("spokenText");
      const savedTranslation = localStorage.getItem("translatedText");
      if (savedText) setText(savedText);
      if (savedTranslation) setTranslatedText(savedTranslation);
    } catch {
      /* ignore */
    }
  }, []);

  const translateText = useCallback(async () => {
    if (!text.trim()) return;
    setLoading((s) => ({ ...s, translate: true }));
    setError("");
    try {
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
      });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(msg || `Translate failed (${resp.status})`);
      }
      const data = (await resp.json()) as { translation?: string };
      if (!data?.translation) throw new Error("No translation returned from server");
      setTranslatedText(data.translation);
      localStorage.setItem("translatedText", data.translation);
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading((s) => ({ ...s, translate: false }));
    }
  }, [text, targetLanguage]);

  const generateSpeech = useCallback(async () => {
    if (!translatedText.trim()) return;
    setLoading((s) => ({ ...s, speech: true }));
    setError("");
    try {
      const resp = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translatedText }),
      });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(msg || `Speech failed (${resp.status})`);
      }
      const blob = await resp.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading((s) => ({ ...s, speech: false }));
    }
  }, [translatedText]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-blue-700 dark:text-white">Voice Translator</h1>

      <SpeechButton
        targetLanguage={targetLanguage}
        onResult={(spoken: string, translated: string) => {
          setText(spoken);
          setTranslatedText(translated);
          try {
            localStorage.setItem("spokenText", spoken);
            localStorage.setItem("translatedText", translated);
          } catch {
            /* ignore */
          }
        }}
        onError={(msg: string) => setError(msg)}
      />

      <div className="w-full max-w-xl">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300">Target language</label>
        <div className="mt-1">
          <LanguageSelector selectedLanguage={targetLanguage} setLanguage={setTargetLanguage} />
        </div>

        <TextArea
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          placeholder="Original text (spoken or typed)…"
        />

        <button
          onClick={translateText}
          disabled={!text.trim() || loading.translate}
          className={`px-4 py-2 rounded-lg transition duration-200 mt-2 ${
            !text.trim() || loading.translate
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {loading.translate ? "Translating…" : "Translate"}
        </button>

        <TextArea value={translatedText} readOnly placeholder="Translated text…" />

        <button
          onClick={generateSpeech}
          disabled={!translatedText.trim() || loading.speech}
          className={`px-4 py-2 rounded-lg transition duration-200 mt-2 ${
            !translatedText.trim() || loading.speech
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {loading.speech ? "Speaking…" : "Speak"}
        </button>

        {error && (
          <p className="mt-3 text-red-500" role="alert">
            {error}
          </p>
        )}

        {audioUrl && (
          <audio controls className="mt-4 w-full">
            <source src={audioUrl} type="audio/mpeg" />
          </audio>
        )}
      </div>
    </div>
  );
}
