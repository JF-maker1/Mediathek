-- 1. Vyčištění dat s CASCADE
-- CASCADE zajistí, že se smažou i záznamy v implicitních spojovacích tabulkách (jako _SegmentToGuide)
TRUNCATE TABLE "CoreSegment" CASCADE;
TRUNCATE TABLE "CoreVideo" CASCADE;
TRUNCATE TABLE "CoreCollection" CASCADE;

-- 2. Změna dimenzí vektorů z 1536 na 768
ALTER TABLE "CoreVideo" ALTER COLUMN "globalEmbedding" TYPE vector(768);
ALTER TABLE "CoreSegment" ALTER COLUMN "embedding" TYPE vector(768);
ALTER TABLE "CoreCollection" ALTER COLUMN "semanticCentroid" TYPE vector(768);