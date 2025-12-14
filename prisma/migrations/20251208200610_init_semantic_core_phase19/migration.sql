-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('STANDARD', 'GUIDE');

-- CreateEnum
CREATE TYPE "CollectionOrigin" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CoreVideo" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "legacyVideoId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "globalEmbedding" vector(1536),
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreSegment" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[],
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoreSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CollectionType" NOT NULL DEFAULT 'STANDARD',
    "origin" "CollectionOrigin" NOT NULL DEFAULT 'USER',
    "semanticCentroid" vector(1536),
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoreVideoToCollection" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoreVideoToCollection_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SegmentToGuide" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SegmentToGuide_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoreVideo_youtubeId_key" ON "CoreVideo"("youtubeId");

-- CreateIndex
CREATE UNIQUE INDEX "CoreVideo_legacyVideoId_key" ON "CoreVideo"("legacyVideoId");

-- CreateIndex
CREATE INDEX "_CoreVideoToCollection_B_index" ON "_CoreVideoToCollection"("B");

-- CreateIndex
CREATE INDEX "_SegmentToGuide_B_index" ON "_SegmentToGuide"("B");

-- AddForeignKey
ALTER TABLE "CoreVideo" ADD CONSTRAINT "CoreVideo_legacyVideoId_fkey" FOREIGN KEY ("legacyVideoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreSegment" ADD CONSTRAINT "CoreSegment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "CoreVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreCollection" ADD CONSTRAINT "CoreCollection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CoreCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoreVideoToCollection" ADD CONSTRAINT "_CoreVideoToCollection_A_fkey" FOREIGN KEY ("A") REFERENCES "CoreCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoreVideoToCollection" ADD CONSTRAINT "_CoreVideoToCollection_B_fkey" FOREIGN KEY ("B") REFERENCES "CoreVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SegmentToGuide" ADD CONSTRAINT "_SegmentToGuide_A_fkey" FOREIGN KEY ("A") REFERENCES "CoreCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SegmentToGuide" ADD CONSTRAINT "_SegmentToGuide_B_fkey" FOREIGN KEY ("B") REFERENCES "CoreSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
