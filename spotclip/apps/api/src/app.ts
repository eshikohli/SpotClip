import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuid } from "uuid";
import type {
  IngestResponse,
  Collection,
  SavePlacesRequest,
  SavePlacesResponse,
  ApiError,
} from "@spotclip/shared";
import { getMockPlaces } from "./mock";

export const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// In-memory store for collections
const collections = new Map<string, Collection>();

// ── POST /clips/ingest ───────────────────────────────────────────────
app.post(
  "/clips/ingest",
  upload.array("media", 10),
  (req, res) => {
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

    const response: IngestResponse = {
      clip_id: uuid(),
      places: getMockPlaces(),
    };

    res.status(200).json(response);
  },
);

// ── POST /collections/:id/places ─────────────────────────────────────
app.post("/collections/:id/places", (req, res) => {
  const { id } = req.params;
  const body = req.body as SavePlacesRequest;

  if (!body.name || !Array.isArray(body.places)) {
    const err: ApiError = { error: "name and places[] are required" };
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
