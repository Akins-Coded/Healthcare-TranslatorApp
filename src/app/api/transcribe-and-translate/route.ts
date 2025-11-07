// app/api/transcribe-and-translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // Run in Node.js environment for file streaming

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Transcribe + Translate API
 * Accepts multipart/form-data with:
 *  - audio: File
 *  - targetLanguage: string
 * Returns: { text: string, translation: string }
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio") as File | null;
    const targetLanguage = String(form.get("targetLanguage") || "").trim();

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: "Audio file is missing." }, { status: 400 });
    }
    if (!targetLanguage) {
      return NextResponse.json({ error: "Target language is missing." }, { status: 400 });
    }

    // --- 1. Speech-to-text transcription ---
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
    });

    const text = transcription.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Failed to transcribe audio." }, { status: 502 });
    }

    // --- 2. Translation using ChatGPT ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // faster and cheaper than gpt-4 for translation
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a translation assistant. Translate only the user's text. Return ONLY the translated text.",
        },
        {
          role: "user",
          content: `Translate the following text to ${targetLanguage}:\n\n${text}`,
        },
      ],
    });

    const translation = completion.choices[0]?.message?.content?.trim();
    if (!translation) {
      return NextResponse.json(
        { error: "Translation failed or returned empty result." },
        { status: 502 }
      );
    }

    // --- 3. Return result in the required format ---
    return NextResponse.json(
      {
        text, // original transcript
        translation, // translated text
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Transcribe & translate error:", err);

    // Graceful error normalization
    const message =
      err?.message ||
      (typeof err === "string" ? err : "Unexpected server error during processing.");

    return NextResponse.json(
      { error: message, hint: "Ensure valid audio and a supported language code." },
      { status: Number(err?.status) || 500 }
    );
  }
}
