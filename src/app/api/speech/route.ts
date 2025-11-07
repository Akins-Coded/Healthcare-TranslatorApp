// app/api/speech/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // use Node for the OpenAI SDK

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    // Validation
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 6000) {
      return NextResponse.json(
        { error: "Text too long (max ~6000 chars)" },
        { status: 413 }
      );
    }

    // Generate speech (MP3). You can switch model/voice as needed.
    const tts = await openai.audio.speech.create({
      model: "tts-1",           // or "gpt-4o-mini-tts", "tts-1-hd"
      voice: "alloy",           // voices: alloy, verse, etc.
      input: text,
      format: "mp3",
    });

    // Convert stream to a Buffer for NextResponse
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
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Speech synthesis failed";
    return NextResponse.json({ error: message }, { status });
  }
}
