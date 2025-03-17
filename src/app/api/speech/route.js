import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
    }

    const response = await openai.audio.speech.create({
      model: "tts-1",
      input: text,
      voice: "alloy",
    });

    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("Speech synthesis error:", error);
    return new Response(JSON.stringify({ error: "Speech synthesis failed" }), { status: 500 });
  }
}
