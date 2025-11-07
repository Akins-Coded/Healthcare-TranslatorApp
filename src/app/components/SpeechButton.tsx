// src/app/components/SpeechButton.tsx
"use client";

import { useRef, useState } from "react";

type Props = {
  targetLanguage: string;
  onResult?: (text: string, translated: string) => void;
  onError?: (message: string) => void;
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Transcription/translation error";
}

/**
 * Records audio and posts to `/api/transcribe-and-translate`.
 * Uses refs for MediaRecorder/chunks/stream to avoid re-instantiation on render.
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

  async function startRecording(): Promise<void> {
    setLocalError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus where supported
      const preferred = "audio/webm;codecs=opus";
      const supportsPreferred =
        typeof MediaRecorder !== "undefined" &&
        typeof (MediaRecorder as unknown as { isTypeSupported?: (type: string) => boolean }).isTypeSupported ===
          "function" &&
        (MediaRecorder as unknown as { isTypeSupported: (type: string) => boolean }).isTypeSupported(preferred);

      const options: MediaRecorderOptions | undefined = supportsPreferred ? { mimeType: preferred } : undefined;
      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;
      chunksRef.current = [];

      // BlobEvent type might not be in older TS DOM libs; accept Event and narrow.
      recorder.ondataavailable = (evt: Event) => {
        const maybeBlobEvent = evt as unknown as { data?: Blob };
        if (maybeBlobEvent.data && maybeBlobEvent.data.size) {
          chunksRef.current.push(maybeBlobEvent.data);
        }
      };

      recorder.onstop = async () => {
        try {
          setLoading(true);
          const mime = supportsPreferred ? preferred : "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mime });
          const form = new FormData();
          form.append("audio", blob, "audio.webm");
          form.append("targetLanguage", targetLanguage);

          const resp = await fetch("/api/transcribe-and-translate", { method: "POST", body: form });
          const data = (await resp.json().catch(() => null)) as { text?: string; translation?: string } | null;

          if (!resp.ok || !data) {
            throw new Error(
              (data && (("error" in data && String((data as { error?: string }).error)) || "")) ||
                `Server error (${resp.status})`
            );
          }
          if (!data.text || !data.translation) {
            throw new Error("Server returned an unexpected payload (missing text/translation).");
          }

          onResult?.(data.text, data.translation);
        } catch (err: unknown) {
          fail(toErrorMessage(err));
        } finally {
          setLoading(false);
          // Release mic
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      fail("Microphone access denied or unavailable");
    }
  }

  function stopRecording(): void {
    try {
      recorderRef.current?.stop();
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

      {loading && (
        <p className="text-sm text-gray-400" role="status">
          Processing…
        </p>
      )}
      {localError && (
        <p className="text-sm text-red-500" role="alert">
          {localError}
        </p>
      )}
    </div>
  );
}
