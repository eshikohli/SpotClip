import type { PlaceWithCoords } from "../components/PlaceBottomSheet";
import type { Coords } from "./geocode";

export interface NearbyPlace extends PlaceWithCoords {
  distanceMiles: number;
  description: string;
}

const TAG_PHRASES: Record<string, string> = {
  coffee: "Cozy coffee spot worth a visit",
  "cafe/bakery": "Charming cafe known for baked goods",
  restaurant: "Popular dining spot in the area",
  bar: "Lively bar with great drinks",
  club: "Nightlife venue for a fun night out",
  "food truck": "Casual street eats worth trying",
  viewpoint: "Scenic viewpoint with memorable views",
  "activity location": "Great activity spot to explore",
};

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function generateDescription(name: string, tags: string[]): string {
  for (const tag of tags) {
    if (TAG_PHRASES[tag]) return TAG_PHRASES[tag];
  }
  return `A must-visit spot in the area`;
}

export function getNearbySpots(
  places: PlaceWithCoords[],
  userLocation: Coords,
  radiusMiles = 5,
  limit = 5,
): NearbyPlace[] {
  return places
    .map((p) => ({
      ...p,
      distanceMiles: getDistance(
        userLocation.latitude,
        userLocation.longitude,
        p.coords.latitude,
        p.coords.longitude,
      ),
      description: generateDescription(p.name, p.tags ?? []),
    }))
    .filter((p) => p.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}
