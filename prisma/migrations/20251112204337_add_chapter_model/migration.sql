-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER,
    "level" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "videoId" TEXT NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
