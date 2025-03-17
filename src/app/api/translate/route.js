import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { text, targetLanguage } = await req.json();
    if (!text || !targetLanguage) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: `Translate to ${targetLanguage}:` },
        { role: "user", content: text },
      ],
    });

    const translation = response.choices[0]?.message?.content.trim();
    return new Response(JSON.stringify({ translation }), { status: 200 });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: "Translation failed" }), { status: 500 });
  }
}

