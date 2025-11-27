-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "aiSuggestions" TEXT[],
ADD COLUMN     "practicalTips" TEXT[],
ADD COLUMN     "seoKeywords" TEXT[],
ADD COLUMN     "seoSummary" TEXT;
