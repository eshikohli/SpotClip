import { v4 as uuid } from "uuid";
import type { ExtractedPlace } from "@spotclip/shared";

const MOCK_PLACES: Omit<ExtractedPlace, "id">[] = [
  {
    name: "Café de Flore",
    city_guess: "Paris",
    confidence: 0.92,
    evidence: { source: "frame", index: 0 },
    address: "172 Boulevard Saint-Germain, 75006 Paris, France",
  },
  {
    name: "Shibuya Crossing",
    city_guess: "Tokyo",
    confidence: 0.87,
    evidence: { source: "frame", index: 3 },
    address: "2 Chome-2-1 Dogenzaka, Shibuya City, Tokyo 150-0043, Japan",
  },
  {
    name: "Taquería Orinoco",
    city_guess: "Mexico City",
    confidence: 0.78,
    evidence: { source: "audio", timestamp_s: 14 },
    address: "Av. Insurgentes Sur 253, Roma Nte., Cuauhtémoc, 06700 CDMX, Mexico",
  },
  {
    name: "Pike Place Market",
    city_guess: "Seattle",
    confidence: 0.95,
    evidence: { source: "frame", index: 7 },
    address: "85 Pike St, Seattle, WA 98101, USA",
  },
];

export function getMockPlaces(): ExtractedPlace[] {
  // Return 2-4 random mock places
  const count = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...MOCK_PLACES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => ({ ...p, id: uuid() }));
}
