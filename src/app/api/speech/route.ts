// src/app/api/speech/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Buffer } from "node:buffer"; // optional but explicit

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper: normalize error messages without using `any`
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Speech synthesis failed";
}

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 6000) {
      return NextResponse.json(
        { error: "Text too long (max ~6000 chars)" },
        { status: 413 }
      );
    }

    const tts = await openai.audio.speech.create({
      model: "tts-1",            // or "gpt-4o-mini-tts" / "tts-1-hd"
      voice: "alloy",
      input: text,
      response_format: "mp3",    // <- correct key
    });

    const arrayBuf = await tts.arrayBuffer();
    const body = Buffer.from(arrayBuf);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(body.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: toErrorMessage(err) }, { status });
  }
}
