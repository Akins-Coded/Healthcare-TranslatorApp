// src/lib/genai.ts
// Centralized, param-free model picker to avoid ESLint no-unused-vars errors.

export const DEFAULT_GENAI_MODEL = "gemini-1.5-flash-latest";

/**
 * Returns the model id to use for Google Generative AI.
 * - Prefers the GENAI_MODEL env var when present.
 * - Falls back to a sane default.
 */
export function pickModel(): string {
  const fromEnv = process.env.GENAI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_GENAI_MODEL;
}
