// src/app/api/transcribe-and-translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Transcribe & translate failed";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio") as File | null;
    const targetLanguage = String(form.get("targetLanguage") || "").trim();

    if (!file) {
      return NextResponse.json({ error: "Audio file is missing." }, { status: 400 });
    }
    if (!targetLanguage) {
      return NextResponse.json({ error: "Target language is missing." }, { status: 400 });
    }

    // 1) Transcribe
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
    });
    const text = transcription.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Failed to transcribe audio." }, { status: 502 });
    }

    // 2) Translate
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

    return NextResponse.json({ text, translation }, { status: 200 });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: toErrorMessage(err) }, { status });
  }
}
