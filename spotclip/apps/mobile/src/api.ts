import type {
  IngestResponse,
  SavePlacesResponse,
  CollectionsListResponse,
  Collection,
  ExtractedPlace,
} from "@spotclip/shared";

const BASE_URL = __DEV__
  ? "http://10.136.51.162:3001"
  : "http://10.136.51.162:3001"; // replace with production URL

interface MediaFile {
  uri: string;
  name: string;
  type: string;
}

export async function ingestClip(
  tiktokUrl: string,
  mediaFiles: MediaFile[],
): Promise<IngestResponse> {
  const form = new FormData();
  form.append("tiktok_url", tiktokUrl);

  for (const file of mediaFiles) {
    form.append("media", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  const res = await fetch(`${BASE_URL}/clips/ingest`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Ingest failed");
  }

  return res.json();
}

export async function saveCollection(
  collectionId: string,
  name: string,
  places: ExtractedPlace[],
): Promise<SavePlacesResponse> {
  const res = await fetch(`${BASE_URL}/collections/${collectionId}/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, places }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Save failed");
  }

  return res.json();
}

export async function getCollections(): Promise<CollectionsListResponse> {
  const res = await fetch(`${BASE_URL}/collections`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to fetch collections");
  }
  return res.json();
}

export async function getCollection(id: string): Promise<Collection> {
  const res = await fetch(`${BASE_URL}/collections/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to fetch collection");
  }
  return res.json();
}

export async function addPlacesToCollection(
  collectionId: string,
  places: ExtractedPlace[],
  name?: string,
): Promise<SavePlacesResponse> {
  const res = await fetch(`${BASE_URL}/collections/${collectionId}/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ places, ...(name ? { name } : {}) }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Save failed");
  }

  return res.json();
}
