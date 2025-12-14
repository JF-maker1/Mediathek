import { PrismaClient } from '@prisma/client';
// Použijeme relativní cestu bez .ts (ts-node si poradí v commonjs režimu)
import { ingestVideoToCore } from '../lib/core/ingestion';

const prisma = new PrismaClient();

// Pauza 15 sekund mezi videi, abychom nenahněvali Google (Rate Limits)
// U Free Tieru je limit cca 15 requestů za minutu, ale segmentace žere hodně.
const DELAY_BETWEEN_VIDEOS_MS = 15000; 

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runBackfill() {
  console.log("🚀 STARTUJI MASIVNÍ BACKFILL (SÉMANTICKÁ REANALÝZA)...");

  // 1. Načteme všechna Legacy videa
  const allVideos = await prisma.video.findMany({
    select: { id: true, title: true }
  });

  console.log(`📦 Nalezeno celkem ${allVideos.length} videí ke zpracování.`);
  console.log(`⏱️ Odhadovaný čas: ${Math.round((allVideos.length * 15) / 60)} minut.`);

  let processedCount = 0;
  let errorCount = 0;

  for (const video of allVideos) {
    processedCount++;
    console.log(`\n-----------------------------------------------------------`);
    console.log(`🎥 [${processedCount}/${allVideos.length}] Zpracovávám: "${video.title}"`);
    console.log(`🆔 ID: ${video.id}`);
    
    try {
      // Spustíme kompletní kolečko: Segmentace -> Vektory -> Knihovník
      await ingestVideoToCore(video.id);
      
    } catch (error) {
      console.error(`❌ Chyba u videa "${video.title}":`, error);
      errorCount++;
    }

    // Pauza pro nadechnutí API (jen pokud nejsme na konci)
    if (processedCount < allVideos.length) {
      console.log(`⏳ Chladím motory (${DELAY_BETWEEN_VIDEOS_MS / 1000}s)...`);
      await delay(DELAY_BETWEEN_VIDEOS_MS);
    }
  }

  console.log(`\n===========================================================`);
  console.log(`🏁 BACKFILL DOKONČEN!`);
  console.log(`✅ Úspěšně: ${processedCount - errorCount}`);
  console.log(`❌ Chyby: ${errorCount}`);
}

runBackfill()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());