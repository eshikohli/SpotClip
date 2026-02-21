import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuid } from "uuid";
import type {
  IngestResponse,
  Collection,
  SavePlacesRequest,
  SavePlacesResponse,
  CollectionsListResponse,
  ApiError,
  ExtractedPlace,
  FavoritesResponse,
  FavoriteItem,
} from "@spotclip/shared";
import { getMockPlaces } from "./mock";
import { extractPlacesFromImages } from "./vision";

export const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// In-memory store for collections
const collections = new Map<string, Collection>();

const IMAGE_MIMES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/jpg", "image/heic", "image/heif",
]);

function isImageUpload(files: Express.Multer.File[]): boolean {
  return files.every((f) => IMAGE_MIMES.has(f.mimetype));
}

/** Normalize incoming place for storage: ensure id, isFavorite, isVisited, created_at */
function normalizePlace(p: ExtractedPlace): ExtractedPlace {
  const now = new Date().toISOString();
  return {
    ...p,
    id: p.id ?? uuid(),
    isFavorite: p.isFavorite ?? false,
    isVisited: p.isVisited ?? false,
    created_at: p.created_at ?? now,
  };
}

// ── POST /clips/ingest ───────────────────────────────────────────────
app.post(
  "/clips/ingest",
  upload.array("media", 10),
  async (req, res) => {
    const tiktokUrl = req.body?.tiktok_url;

    if (!tiktokUrl || typeof tiktokUrl !== "string") {
      const err: ApiError = { error: "tiktok_url is required" };
      res.status(400).json(err);
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      const err: ApiError = { error: "At least one media file is required" };
      res.status(400).json(err);
      return;
    }

    if (isImageUpload(files)) {
      // Real extraction via OpenAI Vision
      const { places, error } = await extractPlacesFromImages(files);
      const response: IngestResponse & { error?: string } = {
        clip_id: uuid(),
        places,
        ...(error ? { error } : {}),
      };
      res.status(200).json(response);
    } else {
      // Video or mixed uploads → mock extraction
      const response: IngestResponse = {
        clip_id: uuid(),
        places: getMockPlaces(),
      };
      res.status(200).json(response);
    }
  },
);

// ── GET /collections ─────────────────────────────────────────────────
app.get("/collections", (_req, res) => {
  const all = Array.from(collections.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const response: CollectionsListResponse = { collections: all };
  res.json(response);
});

// ── POST /collections/:id/places ─────────────────────────────────────
app.post("/collections/:id/places", (req, res) => {
  const { id } = req.params;
  const body = req.body as SavePlacesRequest;

  if (!Array.isArray(body.places)) {
    const err: ApiError = { error: "places[] is required" };
    res.status(400).json(err);
    return;
  }

  const existing = collections.get(id);

  const normalized = body.places.map(normalizePlace);

  if (existing) {
    // Append places to existing collection
    existing.places = [...existing.places, ...normalized];
    if (body.name) existing.name = body.name;
    const response: SavePlacesResponse = { collection: existing };
    res.status(200).json(response);
  } else {
    // Create new collection — name required
    if (!body.name) {
      const err: ApiError = { error: "name is required for new collections" };
      res.status(400).json(err);
      return;
    }

    const collection: Collection = {
      id,
      name: body.name,
      places: normalized,
      created_at: new Date().toISOString(),
    };
    collections.set(id, collection);
    const response: SavePlacesResponse = { collection };
    res.status(201).json(response);
  }
});

// ── PATCH /collections/:collectionId/places/:placeId ──────────────────
app.patch("/collections/:collectionId/places/:placeId", (req, res) => {
  const { collectionId, placeId } = req.params;
  const body = req.body as { isFavorite?: boolean; isVisited?: boolean };

  const collection = collections.get(collectionId);
  if (!collection) {
    const err: ApiError = { error: "Collection not found" };
    res.status(404).json(err);
    return;
  }

  const place = collection.places.find((p) => p.id === placeId);
  if (!place) {
    const err: ApiError = { error: "Place not found" };
    res.status(404).json(err);
    return;
  }

  if (typeof body.isFavorite === "boolean") place.isFavorite = body.isFavorite;
  if (typeof body.isVisited === "boolean") place.isVisited = body.isVisited;

  res.status(200).json({ collection });
});

// ── DELETE /collections/:collectionId/places/:placeId ─────────────────
app.delete("/collections/:collectionId/places/:placeId", (req, res) => {
  const { collectionId, placeId } = req.params;

  const collection = collections.get(collectionId);
  if (!collection) {
    const err: ApiError = { error: "Collection not found" };
    res.status(404).json(err);
    return;
  }

  const prevLen = collection.places.length;
  collection.places = collection.places.filter((p) => p.id !== placeId);
  if (collection.places.length === prevLen) {
    const err: ApiError = { error: "Place not found" };
    res.status(404).json(err);
    return;
  }

  res.status(200).json({ collection });
});

// ── GET /favorites ───────────────────────────────────────────────────
app.get("/favorites", (_req, res) => {
  const favorites: FavoriteItem[] = [];
  for (const col of collections.values()) {
    for (const place of col.places) {
      if (place.isFavorite) {
        favorites.push({
          ...place,
          collectionId: col.id,
          collectionName: col.name,
        });
      }
    }
  }
  const response: FavoritesResponse = { favorites };
  res.json(response);
});

// ── GET /collections/:id ─────────────────────────────────────────────
app.get("/collections/:id", (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) {
    const err: ApiError = { error: "Collection not found" };
    res.status(404).json(err);
    return;
  }
  res.json(collection);
});

// ── Health check ─────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
