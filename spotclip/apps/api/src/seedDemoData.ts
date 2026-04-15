/**
 * Demo seed data for dev/demo mode only.
 * Run when SEED_DEMO_DATA=true on API startup.
 * Idempotent: adds demo collections only if they are not already present (by fixed id).
 */

import type { Collection, ExtractedPlace } from "@spotclip/shared";

const DEMO_SEATTLE_ID = "demo-seattle";
const DEMO_MANHATTAN_ID = "demo-manhattan";

function place(
  id: string,
  name: string,
  city: string,
  tags: string[],
  opts: { note?: string | null; isFavorite?: boolean; isVisited?: boolean; address?: string } = {}
): ExtractedPlace {
  const now = new Date().toISOString();
  return {
    id,
    name,
    city_guess: city,
    confidence: 0.95,
    evidence: { source: "frame", index: 0 },
    isFavorite: opts.isFavorite ?? false,
    isVisited: opts.isVisited ?? false,
    created_at: now,
    tags,
    note: opts.note ?? null,
    address: opts.address ?? null,
  };
}

function buildSeattleCollection(): Collection {
  const now = new Date().toISOString();
  return {
    id: DEMO_SEATTLE_ID,
    name: "Seattle",
    created_at: now,
    places: [
      place("demo-seattle-1", "Pike Place Market", "Seattle", ["viewpoint", "restaurant"], {
        note: "Must-see for first-time visitors. Great food and flowers.",
        isFavorite: true,
        isVisited: true,
        address: "85 Pike St, Seattle, WA 98101, USA",
      }),
      place("demo-seattle-2", "Space Needle", "Seattle", ["viewpoint", "activity location"], {
        note: "Iconic tower with observation deck.",
        isFavorite: true,
        isVisited: false,
        address: "400 Broad St, Seattle, WA 98109, USA",
      }),
      place("demo-seattle-3", "Museum of Pop Culture", "Seattle", ["activity location"], {
        isFavorite: false,
        isVisited: true,
        address: "325 5th Ave N, Seattle, WA 98109, USA",
      }),
      place("demo-seattle-4", "Starbucks Reserve Roastery", "Seattle", ["coffee", "cafe/bakery"], {
        note: "Largest Starbucks in the world.",
        isFavorite: false,
        isVisited: false,
        address: "1124 Pike St, Seattle, WA 98101, USA",
      }),
    ],
  };
}

function buildManhattanCollection(): Collection {
  const now = new Date().toISOString();
  return {
    id: DEMO_MANHATTAN_ID,
    name: "Manhattan",
    created_at: now,
    places: [
      place("demo-manhattan-1", "Central Park", "New York", ["viewpoint", "activity location"], {
        note: "Perfect for a long walk or picnic.",
        isFavorite: true,
        isVisited: true,
        address: "Central Park, New York, NY 10024, USA",
      }),
      place("demo-manhattan-2", "Empire State Building", "New York", ["viewpoint"], {
        isFavorite: true,
        isVisited: false,
        address: "20 W 34th St, New York, NY 10001, USA",
      }),
      place("demo-manhattan-3", "Times Square", "New York", ["viewpoint", "activity location"], {
        note: "Overwhelming but worth seeing once.",
        isFavorite: false,
        isVisited: true,
        address: "Manhattan, New York, NY 10036, USA",
      }),
      place("demo-manhattan-4", "The High Line", "New York", ["viewpoint", "activity location"], {
        isFavorite: false,
        isVisited: false,
        address: "New York, NY 10011, USA",
      }),
      place("demo-manhattan-5", "Katz's Delicatessen", "New York", ["restaurant"], {
        note: "Classic pastrami. Cash preferred.",
        isFavorite: false,
        isVisited: true,
        address: "205 E Houston St, New York, NY 10002, USA",
      }),
    ],
  };
}

/**
 * Idempotent seed: adds demo collections only if their ids are not already in the store.
 * Does not wipe or overwrite existing data; user-created collections are untouched.
 */
export function seedDemoData(store: Map<string, Collection>): void {
  if (!store.has(DEMO_SEATTLE_ID)) {
    store.set(DEMO_SEATTLE_ID, buildSeattleCollection());
  }
  if (!store.has(DEMO_MANHATTAN_ID)) {
    store.set(DEMO_MANHATTAN_ID, buildManhattanCollection());
  }
}
