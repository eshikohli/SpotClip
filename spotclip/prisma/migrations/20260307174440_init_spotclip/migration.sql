-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityGuess" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidenceSource" TEXT NOT NULL,
    "evidenceFrameIndex" INTEGER,
    "evidenceAudioTimestampSeconds" INTEGER,
    "note" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isVisited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotTag" (
    "spotId" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "SpotTag_pkey" PRIMARY KEY ("spotId","tagId")
);

-- CreateIndex
CREATE INDEX "idx_collection_created_at" ON "Collection"("createdAt", "id");

-- CreateIndex
CREATE INDEX "idx_spot_collection_id" ON "Spot"("collectionId");

-- CreateIndex
CREATE INDEX "idx_spot_is_favorite" ON "Spot"("isFavorite");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "idx_spottag_tag_id" ON "SpotTag"("tagId");

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotTag" ADD CONSTRAINT "SpotTag_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotTag" ADD CONSTRAINT "SpotTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
