import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import type { ExtractedPlace } from "@spotclip/shared";

const IS_DEV = process.env.NODE_ENV !== "production";

function log(...args: unknown[]) {
  if (IS_DEV) console.log("[vision]", ...args);
}

// ── OpenAI client (lazy — fails only when actually called) ───────────
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

// ── MIME type from extension ─────────────────────────────────────────
function mimeForFile(filePath: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return map[ext] ?? "image/jpeg";
}

// ── Build image content parts for the API ────────────────────────────
function buildImageParts(
  files: Express.Multer.File[],
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  return files.map((f) => {
    const data = fs.readFileSync(f.path);
    const base64 = data.toString("base64");
    const mime = f.mimetype?.startsWith("image/")
      ? f.mimetype
      : mimeForFile(f.originalname);
    return {
      type: "image_url" as const,
      image_url: {
        url: `data:${mime};base64,${base64}`,
        detail: "low" as const,
      },
    };
  });
}

// ── The prompt ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a place-extraction assistant. You receive one or more images from a social-media clip. Identify every real, specific, named place visible or referenced in the images (restaurants, cafés, bars, landmarks, parks, shops, etc.).

Return ONLY valid JSON — no markdown fences, no commentary:
{
  "places": [
    {
      "name": "<place name>",
      "city_guess": "<city or region>",
      "confidence": <0-1>,
      "evidence": { "source": "frame", "index": <0-based image index> }
    }
  ]
}

Rules:
- "name" must be the specific name of a real place (e.g. "Blue Bottle Coffee", "Colosseum").
- Do NOT include generic descriptions like "a restaurant", "the beach", "a coffee shop".
- "city_guess" is your best guess at the city or region.
- "confidence" reflects how sure you are (0 = guess, 1 = certain).
- "index" is the 0-based index of the image where you found the evidence.
- If you find no real places, return { "places": [] }.`;

// ── Raw response shape from the model ────────────────────────────────
interface VisionPlace {
  name: string;
  city_guess?: string;
  confidence?: number;
  evidence?: { source: string; index: number };
}

// ── Generic non-place phrases to filter out ──────────────────────────
const GENERIC_PHRASES = [
  "restaurant", "cafe", "coffee shop", "bar", "beach", "park",
  "hotel", "shop", "store", "market", "street", "building",
  "a place", "unknown", "n/a",
];

function isGeneric(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return (
    lower.length < 2 ||
    GENERIC_PHRASES.some((g) => lower === g || lower === `a ${g}` || lower === `the ${g}`)
  );
}

// ── Case-insensitive dedupe ──────────────────────────────────────────
function dedupe(places: VisionPlace[]): VisionPlace[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = p.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main extraction function ─────────────────────────────────────────
export async function extractPlacesFromImages(
  files: Express.Multer.File[],
): Promise<{ places: ExtractedPlace[]; error?: string }> {
  try {
    const client = getClient();
    const imageParts = buildImageParts(files);

    log(`Sending ${files.length} image(s) to OpenAI Vision…`);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `I have ${files.length} image(s) from a TikTok clip. Extract all real place names.` },
            ...imageParts,
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    log("Raw response:", raw);

    // Parse JSON — strip markdown fences if the model adds them anyway
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { places?: VisionPlace[] };

    if (!Array.isArray(parsed.places)) {
      log("Unexpected response shape, returning empty");
      return { places: [] };
    }

    // Post-process: trim, filter generics, dedupe
    const processed = dedupe(
      parsed.places
        .map((p) => ({ ...p, name: p.name.trim() }))
        .filter((p) => !isGeneric(p.name)),
    );

    const places: ExtractedPlace[] = processed.map((p) => ({
      id: uuid(),
      name: p.name,
      city_guess: p.city_guess?.trim() ?? "Unknown",
      confidence: Math.max(0, Math.min(1, p.confidence ?? 0.5)),
      evidence: {
        source: "frame" as const,
        index: p.evidence?.index ?? 0,
      },
    }));

    log(`Extracted ${places.length} place(s)`);
    return { places };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vision extraction failed";
    console.error("[vision] Error:", message);
    return { places: [], error: message };
  }
}
