import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { app } from "../app";
import type { IngestResponse, SavePlacesResponse } from "@spotclip/shared";

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
  });
});

describe("GET /collections/:id", () => {
  it("returns 404 for unknown collection", async () => {
    const res = await request(app).get("/collections/nonexistent");
    expect(res.status).toBe(404);
  });
});
