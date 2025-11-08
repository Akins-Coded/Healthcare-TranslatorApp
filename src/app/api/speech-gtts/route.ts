// src/app/api/speech-gtts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Request failed";
}

export async function POST(req: NextRequest) {
  try {
    const { text, task = "translate", targetLang = "English", ttsLang = "en" } =
      (await req.json()) as {
        text?: string;
        task?: "translate" | "summarize";
        targetLang?: string;
        ttsLang?: string; // e.g., "en", "fr", "es"
      };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 1) Gemini: translate or summarize
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt =
      task === "translate"
        ? `Translate to ${targetLang}. Output ONLY the translation:\n\n"""${text}"""`
        : `Summarize in 3-5 sentences. Output ONLY the summary:\n\n"""${text}"""`;

    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    // 2) gTTS (dynamic import for CJS)
    const gttsModule: any = (await import("node-gtts")).default ?? (await import("node-gtts"));
    const gtts = gttsModule(ttsLang);

    const audioBuf: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = gtts.stream(output);
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    return new NextResponse(audioBuf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
