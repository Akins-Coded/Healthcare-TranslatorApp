// src/app/api/transcribe-and-translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


export const runtime = "nodejs";

/** ----- Model picker (inserted below imports) ----- */
type ModelInfo = { name: string; supportedGenerationMethods?: string[] };

async function pickModel(
  genAI: GoogleGenerativeAI,
  prefer: ("pro" | "flash")[] = ["pro", "flash"]
): Promise<string> {
  // Ask the API which models your key can use
  const res = await genAI.listModels();
  const models = (res.models || []) as ModelInfo[];

  // keep only those that support generateContent
  const generative = models.filter((m) =>
    m.supportedGenerationMethods?.includes("generateContent")
  );

  // try to pick by preference order (pro, then flash)
  for (const p of prefer) {
    const chosen = generative.find((m) => m.name.toLowerCase().includes(p));
    if (chosen) return chosen.name; // e.g. "models/gemini-1.5-flash"
  }

  // fall back to the first generative model
  if (generative[0]) return generative[0].name;

  throw new Error("No available Gemini model supports generateContent for this key.");
}

/** ----- Request/response types (no `any`) ----- */
type Task = "translate" | "summarize";

interface RequestBody {
  text?: string;
  task?: Task;
  targetLang?: string;
}

interface OkJson {
  result: string;
}

interface ErrJson {
  error: string;
}

/** ----- Small helpers ----- */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Request failed";
}

function isRequestBody(v: unknown): v is RequestBody {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const validTask =
    o.task === undefined || o.task === "translate" || o.task === "summarize";
  const validText = o.text === undefined || typeof o.text === "string";
  const validTarget =
    o.targetLang === undefined || typeof o.targetLang === "string";
  return validTask && validText && validTarget;
}

function buildPrompt(task: Task, text: string, targetLang?: string): string {
  if (task === "translate") {
    const lang = targetLang ?? "English";
    return `Translate to ${lang}. Output ONLY the translation:

"""${text}"""`;
  }
  // summarize
  return `Summarize the following text in 3–5 concise sentences.
Output ONLY the summary:

"""${text}"""`;
}

/** ----- Route ----- */
export async function POST(req: NextRequest) {
  try {
    const parsed = await req.json().catch(() => null);

    if (!isRequestBody(parsed)) {
      const body: ErrJson = { error: "Invalid JSON body" };
      return NextResponse.json(body, { status: 400 });
    }

    const { text, task = "translate", targetLang } = parsed;

    if (!text || !text.trim()) {
      const body: ErrJson = { error: "Text is required" };
      return NextResponse.json(body, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      const body: ErrJson = { error: "GOOGLE_API_KEY is not set" };
      return NextResponse.json(body, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = await pickModel(genAI); // e.g. "models/gemini-1.5-flash"
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log("Using Gemini model:", modelName);

    const prompt = buildPrompt(task, text, targetLang);
    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    if (!output) {
      const body: ErrJson = { error: "Empty response from Gemini" };
      return NextResponse.json(body, { status: 502 });
    }

    const body: OkJson = { result: output };
    return NextResponse.json(body, { status: 200 });
  } catch (err: unknown) {
    const body: ErrJson = { error: toErrorMessage(err) };
    return NextResponse.json(body, { status: 500 });
  }
}
