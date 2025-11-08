// src/app/api/speech-gtts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genModelId = "gemini-1.5-flash-latest";

/* ---------- Helper types for node-gtts interop ---------- */
type GttsInstance = { stream(text: string): NodeJS.ReadableStream };
type GttsFactory = (lang: string) => GttsInstance;

function resolveCjsDefault<T>(mod: unknown): T {
  if (typeof mod === "function") return mod as T;
  if (mod && typeof mod === "object" && "default" in mod) {
    return (mod as { default: T }).default;
  }
  throw new Error("Invalid node-gtts module shape");
}

/* ---------- Error helper ---------- */
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
      ttsLang = "en", // e.g. "en", "fr", "es"
    }: {
      text?: string;
      task?: "translate" | "summarize";
      targetLang?: string;
      ttsLang?: string;
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

    // 1) Gemini: translate or summarize
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: genModelId });

    const prompt =
      task === "translate"
        ? `Translate to ${targetLang}. Output ONLY the translation:\n\n"""${text}"""`
        : `Summarize in 3-5 sentences. Output ONLY the summary:\n\n"""${text}"""`;

    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    // 2) gTTS (dynamic import; typed; no 'any')
    const imported = (await import("node-gtts")) as unknown;
    const gttsFactory: GttsFactory = resolveCjsDefault<GttsFactory>(imported);
    const gtts = gttsFactory(ttsLang);

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
