import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";

vi.mock("../tagging", () => ({ tagPlace: vi.fn().mockResolvedValue(["restaurant"]) }));

import { app } from "../app";
import type {
  IngestResponse,
  SavePlacesResponse,
  CollectionsListResponse,
  FavoritesResponse,
} from "@spotclip/shared";

// Create a tiny temp file for upload tests
const FIXTURE_PATH = path.join(__dirname, "fixture.txt");
fs.writeFileSync(FIXTURE_PATH, "fake-media-content");

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /clips/ingest", () => {
  it("returns 400 when tiktok_url is missing", async () => {
    const res = await request(app)
      .post("/clips/ingest")
      .attach("media", FIXTURE_PATH);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tiktok_url/i);
  });

  it("returns 400 when no media files attached", async () => {
    const res = await request(app)
      .post("/clips/ingest")
      .field("tiktok_url", "https://tiktok.com/@user/video/123");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/media/i);
  });

  it("returns mock places on valid request", async () => {
    const res = await request(app)
      .post("/clips/ingest")
      .field("tiktok_url", "https://tiktok.com/@user/video/123")
      .attach("media", FIXTURE_PATH);

    expect(res.status).toBe(200);
    const body = res.body as IngestResponse;
    expect(body.clip_id).toBeDefined();
    expect(body.places.length).toBeGreaterThanOrEqual(2);
    expect(body.places[0]).toHaveProperty("name");
    expect(body.places[0]).toHaveProperty("city_guess");
    expect(body.places[0]).toHaveProperty("confidence");
    expect(body.places[0]).toHaveProperty("evidence");
  });
});

describe("POST /collections/:id/places", () => {
  it("returns 400 when body is invalid", async () => {
    const res = await request(app)
      .post("/collections/col-1/places")
      .send({});

    expect(res.status).toBe(400);
  });

  it("saves a collection and can retrieve it", async () => {
    const payload = {
      name: "Tokyo Trip",
      places: [
        {
          id: "p1",
          name: "Shibuya Crossing",
          city_guess: "Tokyo",
          confidence: 0.9,
          evidence: { source: "frame", index: 0 },
        },
      ],
    };

    const saveRes = await request(app)
      .post("/collections/col-1/places")
      .send(payload);

    expect(saveRes.status).toBe(201);
    const body = saveRes.body as SavePlacesResponse;
    expect(body.collection.name).toBe("Tokyo Trip");
    expect(body.collection.places).toHaveLength(1);

    // Verify GET retrieves it
    const getRes = await request(app).get("/collections/col-1");
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe("Tokyo Trip");
    expect(getRes.body.places[0]).toHaveProperty("isFavorite");
    expect(getRes.body.places[0]).toHaveProperty("isVisited");
    expect(getRes.body.places[0]).toHaveProperty("created_at");
    expect(Array.isArray(getRes.body.places[0].tags)).toBe(true);
    expect(getRes.body.places[0]).toHaveProperty("note");
  });
});

describe("POST /collections/:id/places – append", () => {
  it("appends places to an existing collection", async () => {
    // Create initial collection
    await request(app)
      .post("/collections/col-append/places")
      .send({
        name: "Append Test",
        places: [
          { id: "a1", name: "Place A", city_guess: "NYC", confidence: 0.8, evidence: { source: "frame", index: 0 } },
        ],
      });

    // Append more places
    const res = await request(app)
      .post("/collections/col-append/places")
      .send({
        places: [
          { id: "a2", name: "Place B", city_guess: "LA", confidence: 0.7, evidence: { source: "frame", index: 1 } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.collection.places).toHaveLength(2);
    expect(res.body.collection.places[0].name).toBe("Place A");
    expect(res.body.collection.places[1].name).toBe("Place B");
  });
});

describe("GET /collections", () => {
  it("returns an array of collections", async () => {
    const res = await request(app).get("/collections");
    expect(res.status).toBe(200);
    const body = res.body as CollectionsListResponse;
    expect(Array.isArray(body.collections)).toBe(true);
    expect(body.collections.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /collections/:id", () => {
  it("returns 404 for unknown collection", async () => {
    const res = await request(app).get("/collections/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /collections/:collectionId/places/:placeId", () => {
  it("returns 404 for unknown collection", async () => {
    const res = await request(app)
      .patch("/collections/nonexistent/places/p1")
      .send({ isFavorite: true });
    expect(res.status).toBe(404);
  });

  it("updates isFavorite and isVisited", async () => {
    await request(app)
      .post("/collections/col-patch/places")
      .send({
        name: "Patch Test",
        places: [
          {
            id: "place-patch-1",
            name: "Spot A",
            city_guess: "NYC",
            confidence: 0.8,
            evidence: { source: "frame", index: 0 },
          },
        ],
      });

    const patchRes = await request(app)
      .patch("/collections/col-patch/places/place-patch-1")
      .send({ isFavorite: true, isVisited: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.collection.places[0].isFavorite).toBe(true);
    expect(patchRes.body.collection.places[0].isVisited).toBe(true);

    const getRes = await request(app).get("/collections/col-patch");
    expect(getRes.body.places[0].isFavorite).toBe(true);
    expect(getRes.body.places[0].isVisited).toBe(true);
  });

  it("updates note and tags (valid)", async () => {
    await request(app)
      .post("/collections/col-patch-note/places")
      .send({
        name: "Note Test",
        places: [
          {
            id: "place-note-1",
            name: "Spot",
            city_guess: "NYC",
            confidence: 0.8,
            evidence: { source: "frame", index: 0 },
          },
        ],
      });

    const patchRes = await request(app)
      .patch("/collections/col-patch-note/places/place-note-1")
      .send({ note: "Great coffee here", tags: ["coffee", "restaurant"] });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.collection.places[0].note).toBe("Great coffee here");
    expect(patchRes.body.collection.places[0].tags).toEqual(["coffee", "restaurant"]);

    const getRes = await request(app).get("/collections/col-patch-note");
    expect(getRes.body.places[0].note).toBe("Great coffee here");
    expect(getRes.body.places[0].tags).toEqual(["coffee", "restaurant"]);
  });

  it("returns 400 for invalid tags (not in allowed set)", async () => {
    await request(app)
      .post("/collections/col-tag-err/places")
      .send({
        name: "Tag Err",
        places: [
          {
            id: "place-tag-1",
            name: "Spot",
            city_guess: "NYC",
            confidence: 0.8,
            evidence: { source: "frame", index: 0 },
          },
        ],
      });

    const res = await request(app)
      .patch("/collections/col-tag-err/places/place-tag-1")
      .send({ tags: ["invalid-tag"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/allowed set|tags/i);
  });

  it("returns 400 for more than 3 tags", async () => {
    await request(app)
      .post("/collections/col-tag-max/places")
      .send({
        name: "Tag Max",
        places: [
          {
            id: "place-tag-max-1",
            name: "Spot",
            city_guess: "NYC",
            confidence: 0.8,
            evidence: { source: "frame", index: 0 },
          },
        ],
      });

    const res = await request(app)
      .patch("/collections/col-tag-max/places/place-tag-max-1")
      .send({ tags: ["coffee", "restaurant", "bar", "viewpoint"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/max|3/i);
  });
});

describe("DELETE /collections/:collectionId/places/:placeId", () => {
  it("returns 404 for unknown collection", async () => {
    const res = await request(app).delete("/collections/nonexistent/places/p1");
    expect(res.status).toBe(404);
  });

  it("removes place from collection", async () => {
    await request(app)
      .post("/collections/col-del/places")
      .send({
        name: "Delete Test",
        places: [
          {
            id: "place-del-1",
            name: "To Remove",
            city_guess: "LA",
            confidence: 0.7,
            evidence: { source: "frame", index: 0 },
          },
        ],
      });

    const delRes = await request(app).delete("/collections/col-del/places/place-del-1");
    expect(delRes.status).toBe(200);
    expect(delRes.body.collection.places).toHaveLength(0);

    const getRes = await request(app).get("/collections/col-del");
    expect(getRes.body.places).toHaveLength(0);
  });
});

describe("GET /favorites", () => {
  it("returns empty list when no favorites", async () => {
    const res = await request(app).get("/favorites");
    expect(res.status).toBe(200);
    const body = res.body as FavoritesResponse;
    expect(Array.isArray(body.favorites)).toBe(true);
  });

  it("returns favorited places with collection info", async () => {
    await request(app)
      .post("/collections/col-fav/places")
      .send({
        name: "Fav Collection",
        places: [
          {
            id: "place-fav-1",
            name: "Favorite Spot",
            city_guess: "Paris",
            confidence: 0.9,
            evidence: { source: "frame", index: 0 },
          },
        ],
      });
    await request(app)
      .patch("/collections/col-fav/places/place-fav-1")
      .send({ isFavorite: true });

    const res = await request(app).get("/favorites");
    expect(res.status).toBe(200);
    const body = res.body as FavoritesResponse;
    expect(body.favorites.length).toBeGreaterThanOrEqual(1);
    const fav = body.favorites.find((f) => f.id === "place-fav-1");
    expect(fav).toBeDefined();
    expect(fav!.name).toBe("Favorite Spot");
    expect(fav!.collectionId).toBe("col-fav");
    expect(fav!.collectionName).toBe("Fav Collection");
  });
});
