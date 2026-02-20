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

  if (existing) {
    // Append places to existing collection
    existing.places = [...existing.places, ...body.places];
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
      places: body.places,
      created_at: new Date().toISOString(),
    };
    collections.set(id, collection);
    const response: SavePlacesResponse = { collection };
    res.status(201).json(response);
  }
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
