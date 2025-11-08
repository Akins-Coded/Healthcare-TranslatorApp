// src/app/api/transcribe-and-translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Request failed";
}

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      task = "translate",
      targetLang = "English",
    }: {
      text?: string;
      task?: "translate" | "summarize";
      targetLang?: string;
    } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is not set" },
        { status: 500 }
      );
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
