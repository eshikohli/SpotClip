import OpenAI from "openai";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

/**
 * Infer a best-guess street address for a place from name and optional city.
 * Uses LLM general knowledge only (no web scraping). Returns null if uncertain.
 * On failure, returns null (caller should not block save).
 */
export async function getAddress(name: string, city?: string): Promise<string | null> {
  const cityPart = city?.trim() ? ` in or near ${city}` : "";
  const prompt = `What is the street address of "${name}"${cityPart}? Reply with ONLY the address in the format "123 Main St, City, Country". If you don't know with reasonable confidence, reply with exactly: null`;

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content || content.toLowerCase() === "null") return null;
    return content;
  } catch {
    return null;
  }
}
