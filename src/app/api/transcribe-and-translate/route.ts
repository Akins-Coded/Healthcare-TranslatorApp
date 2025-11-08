// src/app/api/transcribe-and-translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { Readable } from "stream";

export const runtime = "nodejs";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Request failed";
}

export async function POST(req: NextRequest) {
  try {
    // Support two input modes:
    // 1) JSON { text, task, targetLang }
    // 2) multipart/form-data with a `file` field containing audio
    // 3) JSON { audio: "base64...", task, targetLang }

    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    let text: string | undefined;
    let task: "translate" | "summarize" = "translate";
    let targetLang = "English";

    if (contentType.includes("multipart/form-data")) {
      // formData path (file upload)
      const form = await req.formData();
      const file = form.get("file") as File | null;
      task = ((form.get("task") as string) || "translate") as typeof task;
      targetLang = (form.get("targetLang") as string) || targetLang;

      if (!file) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
      }

      // Read file bytes
      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);

      // Transcribe using OpenAI Whisper (requires OPENAI_API_KEY)
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY is not set for audio transcription" }, { status: 500 });
      }
      const openai = new OpenAI({ apiKey: openaiKey });

      // OpenAI Node SDK expects a readable stream for file uploads
      const stream = Readable.from(buffer);
      // NOTE: SDK response shape may vary; attempt common property access
      const transcription = await openai.audio.transcriptions.create({ file: stream as any, model: "whisper-1" as any });
      // prefer `.text` if available
      // @ts-ignore - defensive access
      text = transcription?.text ?? (transcription as any)?.data?.text ?? undefined;

    } else {
      // JSON path
      const body = await req.json().catch(() => ({}));
      text = body.text;
      task = body.task || task;
      targetLang = body.targetLang || targetLang;

      // support base64 audio in JSON: { audio: "data:audio/wav;base64,..." }
      const audioB64 = body.audio as string | undefined;
      if (!text && audioB64) {
        const m = audioB64.match(/base64,(.*)$/);
        const b64 = m ? m[1] : audioB64;
        const buffer = Buffer.from(b64, "base64");

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          return NextResponse.json({ error: "OPENAI_API_KEY is not set for audio transcription" }, { status: 500 });
        }
        const openai = new OpenAI({ apiKey: openaiKey });
        const stream = Readable.from(buffer);
        const transcription = await openai.audio.transcriptions.create({ file: stream as any, model: "whisper-1" as any });
        // @ts-ignore
        text = transcription?.text ?? (transcription as any)?.data?.text ?? undefined;
      }
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text (or transcribed audio) is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      // If Google key isn't present, return the transcribed text and indicate translation unavailable
      return NextResponse.json({ result: text, note: "Transcription successful. GOOGLE_API_KEY not set, translation/summarization skipped." }, { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt =
      task === "translate"
        ? `Translate to ${targetLang}. Output ONLY the translation:\n\n"""${text}"""`
        : `Summarize in 3-5 sentences. Output ONLY the summary:\n\n"""${text}"""`;

    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    return NextResponse.json({ result: output }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
