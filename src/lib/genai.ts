// src/lib/genai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function pickModel(_genAI: GoogleGenerativeAI): Promise<string> {
  return process.env.GENAI_MODEL?.trim() || "gemini-1.5-flash-latest";
}
