import { buildSystemPrompt, parseAIResponse } from "../../../lib/pm1-engine";

export async function POST(req) {
  try {
    const { messages, profile } = await req.json();
console.log("KEY EXISTS:", !!process.env.ANTHROPIC_API_KEY);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: buildSystemPrompt(profile),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });
     console.log("STATUS:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("ERROR COMPLETO:", err);

return Response.json({
  error: err.message,
  stack: err.stack
}, { status: 500 });
    }

    const rawText = data.content?.map((c) => c.text || "").join("") || "";
    const parsed = parseAIResponse(rawText);

    return Response.json({ parsed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
