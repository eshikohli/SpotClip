import type { PrismaClient } from "@prisma/client";

const TAGS = [
  "cafe/bakery",
  "food truck",
  "coffee",
  "bar",
  "club",
  "activity location",
  "viewpoint",
  "restaurant",
  "dessert",
  "bakery",
  "activity",
  "shopping",
  "brunch",
  "nightlife",
];

export async function seedTags(prisma: PrismaClient): Promise<void> {
  await prisma.tag.createMany({
    data: TAGS.map((name) => ({ name })),
    skipDuplicates: true,
  });
}

