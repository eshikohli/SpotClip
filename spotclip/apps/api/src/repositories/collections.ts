import type { Collection, ExtractedPlace, FavoriteItem, FavoritesResponse } from "@spotclip/shared";
import type { Spot, Collection as DbCollection, SpotTag, Tag } from "@prisma/client";
import { prisma } from "../db/prisma";

type SpotWithTags = Spot & {
  tags: (SpotTag & { tag: Tag })[];
};

type CollectionWithSpots = DbCollection & {
  spots: SpotWithTags[];
};

function mapSpotToExtractedPlace(spot: SpotWithTags): ExtractedPlace {
  const evidence =
    spot.evidenceSource === "audio" && spot.evidenceAudioTimestampSeconds != null
      ? {
          source: "audio" as const,
          timestamp_s: spot.evidenceAudioTimestampSeconds,
        }
      : {
          source: "frame" as const,
          index: spot.evidenceFrameIndex ?? 0,
        };

  const createdAtIso = spot.createdAt.toISOString();

  return {
    id: spot.id,
    name: spot.name,
    city_guess: spot.cityGuess,
    confidence: spot.confidence,
    evidence,
    isFavorite: spot.isFavorite,
    isVisited: spot.isVisited,
    created_at: createdAtIso,
    tags: spot.tags.map((t) => t.tag.name),
    note: spot.note ?? null,
  };
}

function mapCollection(db: CollectionWithSpots): Collection {
  return {
    id: db.id,
    name: db.name,
    created_at: db.createdAt.toISOString(),
    places: db.spots
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(mapSpotToExtractedPlace),
  };
}

export async function getCollections(): Promise<Collection[]> {
  const rows = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      spots: {
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
    },
  });
  return rows.map((c) => mapCollection(c));
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  const row = await prisma.collection.findUnique({
    where: { id },
    include: {
      spots: {
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
    },
  });
  if (!row) return null;
  return mapCollection(row);
}

export async function savePlacesToCollection(
  id: string,
  payload: { name?: string; places: ExtractedPlace[] },
): Promise<{ collection: Collection; isNew: boolean }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.collection.findUnique({
      where: { id },
    });

    if (!existing && !payload.name) {
      throw new Error("NAME_REQUIRED_FOR_NEW_COLLECTION");
    }

    let collection: CollectionWithSpots;

    if (!existing) {
      collection = await tx.collection.create({
        data: {
          id,
          name: payload.name!,
          spots: {
            create: payload.places.map((p) => ({
              id: p.id,
              name: p.name,
              cityGuess: p.city_guess,
              confidence: p.confidence,
              evidenceSource: p.evidence.source,
              evidenceFrameIndex:
                p.evidence.source === "frame" ? p.evidence.index : null,
              evidenceAudioTimestampSeconds:
                p.evidence.source === "audio" ? p.evidence.timestamp_s : null,
              note: p.note ?? null,
              isFavorite: p.isFavorite ?? false,
              isVisited: p.isVisited ?? false,
              createdAt: p.created_at ? new Date(p.created_at) : undefined,
              tags: {
                create: (p.tags ?? []).map((name) => ({
                  tag: {
                    connect: { name },
                  },
                })),
              },
            })),
          },
        },
        include: {
          spots: {
            include: {
              tags: { include: { tag: true } },
            },
          },
        },
      });
      return { collection: mapCollection(collection), isNew: true };
    }

    if (payload.name) {
      await tx.collection.update({
        where: { id },
        data: { name: payload.name },
      });
    }

    for (const p of payload.places) {
      await tx.spot.create({
        data: {
          id: p.id,
          name: p.name,
          cityGuess: p.city_guess,
          confidence: p.confidence,
          evidenceSource: p.evidence.source,
          evidenceFrameIndex:
            p.evidence.source === "frame" ? p.evidence.index : null,
          evidenceAudioTimestampSeconds:
            p.evidence.source === "audio" ? p.evidence.timestamp_s : null,
          note: p.note ?? null,
          isFavorite: p.isFavorite ?? false,
          isVisited: p.isVisited ?? false,
          createdAt: p.created_at ? new Date(p.created_at) : undefined,
          collectionId: id,
          tags: {
            create: (p.tags ?? []).map((name) => ({
              tag: { connect: { name } },
            })),
          },
        },
      });
    }

    collection = await tx.collection.findUniqueOrThrow({
      where: { id },
      include: {
        spots: {
          include: {
            tags: { include: { tag: true } },
          },
        },
      },
    });

    return { collection: mapCollection(collection), isNew: false };
  });
}

export async function updateSpotInCollection(
  collectionId: string,
  spotId: string,
  patch: { isFavorite?: boolean; isVisited?: boolean; note?: string | null; tags?: string[] },
): Promise<Collection> {
  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new Error("COLLECTION_NOT_FOUND");
    }

    const spot = await tx.spot.findFirst({
      where: { id: spotId, collectionId },
    });
    if (!spot) {
      throw new Error("SPOT_NOT_FOUND");
    }

    await tx.spot.update({
      where: { id: spotId },
      data: {
        isFavorite:
          typeof patch.isFavorite === "boolean"
            ? patch.isFavorite
            : spot.isFavorite,
        isVisited:
          typeof patch.isVisited === "boolean"
            ? patch.isVisited
            : spot.isVisited,
        note:
          patch.note !== undefined
            ? patch.note === "" ? null : patch.note
            : spot.note,
      },
    });

    if (patch.tags !== undefined) {
      await tx.spotTag.deleteMany({
        where: { spotId },
      });

      if (patch.tags.length > 0) {
        await tx.spotTag.createMany({
          data: patch.tags.map((name) => ({
            spotId,
            tagId: 0,
          })),
          skipDuplicates: true,
        });

        // Replace the above placeholder createMany with real connects
        for (const name of patch.tags) {
          const tag = await tx.tag.findUnique({ where: { name } });
          if (tag) {
            await tx.spotTag.upsert({
              where: {
                spotId_tagId: {
                  spotId,
                  tagId: tag.id,
                },
              },
              update: {},
              create: {
                spotId,
                tagId: tag.id,
              },
            });
          }
        }
      }
    }

    const updated = await tx.collection.findUniqueOrThrow({
      where: { id: collectionId },
      include: {
        spots: {
          include: {
            tags: { include: { tag: true } },
          },
        },
      },
    });

    return mapCollection(updated);
  });
}

export async function deleteSpotFromCollection(
  collectionId: string,
  spotId: string,
): Promise<Collection> {
  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new Error("COLLECTION_NOT_FOUND");
    }

    const spot = await tx.spot.findFirst({
      where: { id: spotId, collectionId },
    });
    if (!spot) {
      throw new Error("SPOT_NOT_FOUND");
    }

    await tx.spot.delete({
      where: { id: spotId },
    });

    const updated = await tx.collection.findUniqueOrThrow({
      where: { id: collectionId },
      include: {
        spots: {
          include: {
            tags: { include: { tag: true } },
          },
        },
      },
    });

    return mapCollection(updated);
  });
}

export async function getFavorites(): Promise<FavoritesResponse> {
  const spots = await prisma.spot.findMany({
    where: { isFavorite: true },
    include: {
      collection: true,
      tags: {
        include: { tag: true },
      },
    },
  });

  const favorites: FavoriteItem[] = spots.map((spot) => {
    const evidence =
      spot.evidenceSource === "audio" && spot.evidenceAudioTimestampSeconds != null
        ? {
            source: "audio" as const,
            timestamp_s: spot.evidenceAudioTimestampSeconds,
          }
        : {
            source: "frame" as const,
            index: spot.evidenceFrameIndex ?? 0,
          };

    return {
      id: spot.id,
      name: spot.name,
      city_guess: spot.cityGuess,
      confidence: spot.confidence,
      evidence,
      isFavorite: spot.isFavorite,
      isVisited: spot.isVisited,
      created_at: spot.createdAt.toISOString(),
      tags: spot.tags.map((t) => t.tag.name),
      note: spot.note ?? null,
      collectionId: spot.collectionId,
      collectionName: spot.collection.name,
    };
  });

  return { favorites };
}

