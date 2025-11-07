"use client";

import { useRef, useState } from "react";

type Props = {
  targetLanguage: string;
  onResult?: (text: string, translated: string) => void;
  onError?: (message: string) => void;
};

/**
 * Records from the mic and POSTs audio + targetLanguage to /api/transcribe-and-translate.
 * Ensures stable MediaRecorder with refs, stops tracks to free the mic, and handles codec fallbacks.
 */
export default function SpeechButton({ targetLanguage, onResult, onError }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  function fail(message: string) {
    setLocalError(message);
    onError?.(message);
  }

  async function startRecording() {
    setLocalError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus where supported (best quality/size)
      const preferred = "audio/webm;codecs=opus";
      const supportsPreferred =
        typeof MediaRecorder !== "undefined" &&
        (MediaRecorder as any).isTypeSupported?.(preferred);

      const opts = supportsPreferred ? { mimeType: preferred } : undefined;
      const recorder = new MediaRecorder(stream, opts as MediaRecorderOptions);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          setLoading(true);
          const blob = new Blob(chunksRef.current, { type: supportsPreferred ? preferred : "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "audio.webm");
          form.append("targetLanguage", targetLanguage);

          const resp = await fetch("/api/transcribe-and-translate", { method: "POST", body: form });
          const data = await resp.json().catch(() => null);

          if (!resp.ok || !data) {
            throw new Error(
              (data && (data.error || data.message)) ||
              `Server error during transcribe/translate (${resp.status})`
            );
          }
          if (!data.text || !data.translation) {
            throw new Error("Server returned an unexpected payload (missing text/translation).");
          }

          onResult?.(data.text, data.translation);
        } catch (e: any) {
          fail(e?.message ?? "Transcription/translation error");
        } finally {
          setLoading(false);
          // Always release mic when done
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setRecording(true);
    } catch (e: any) {
      fail("Microphone access denied or unavailable");
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore stop errors */
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${
          recording ? "bg-red-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      {loading && <p className="text-sm text-gray-400" role="status">Processing…</p>}
      {localError && <p className="text-sm text-red-500" role="alert">{localError}</p>}
    </div>
  );
}
