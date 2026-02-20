import { v4 as uuid } from "uuid";
import type { ExtractedPlace } from "@spotclip/shared";

const MOCK_PLACES: Omit<ExtractedPlace, "id">[] = [
  {
    name: "Café de Flore",
    city_guess: "Paris",
    confidence: 0.92,
    evidence: { source: "frame", index: 0 },
  },
  {
    name: "Shibuya Crossing",
    city_guess: "Tokyo",
    confidence: 0.87,
    evidence: { source: "frame", index: 3 },
  },
  {
    name: "Taquería Orinoco",
    city_guess: "Mexico City",
    confidence: 0.78,
    evidence: { source: "audio", timestamp_s: 14 },
  },
  {
    name: "Pike Place Market",
    city_guess: "Seattle",
    confidence: 0.95,
    evidence: { source: "frame", index: 7 },
  },
];

export function getMockPlaces(): ExtractedPlace[] {
  // Return 2-4 random mock places
  const count = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...MOCK_PLACES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => ({ ...p, id: uuid() }));
}
