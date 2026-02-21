import OpenAI from "openai";
import { SPOT_TAGS } from "@spotclip/shared";

const ALLOWED_SET = new Set(SPOT_TAGS);

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

/**
 * Infer 1–3 category tags for a place from name and optional city.
 * Uses LLM general knowledge only (no web scraping). Returns subset of SPOT_TAGS.
 * On failure or uncertainty, returns [] (caller should not block save).
 */
export async function tagPlace(name: string, city?: string): Promise<string[]> {
  const cityPart = city?.trim() ? ` in or near ${city}` : "";
  const prompt = `Given the place name "${name}"${cityPart}, choose 1 to 3 categories that best fit. Use ONLY these exact strings (comma-separated): cafe/bakery, food truck, coffee, bar, club, activity location, viewpoint, restaurant. If uncertain, return fewer (even 0). No other text, no explanation.`;

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return [];

    const raw = content.split(",").map((s) => s.trim().toLowerCase());
    const out: string[] = [];
    for (const t of raw) {
      if (ALLOWED_SET.has(t as (typeof SPOT_TAGS)[number]) && !out.includes(t)) {
        out.push(t);
        if (out.length >= 3) break;
      }
    }
    return out;
  } catch {
    return [];
  }
}
