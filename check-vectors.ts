import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Prisma standardně skrývá pole typu 'Unsupported' (vektory).
  // Musíme použít RAW SQL, abychom se k nim dostali.

  console.log("=== VÝSLEDEK ANALÝZY POSLEDNÍHO VIDEA (RAW) ===");

  // 1. Získání posledního videa pomocí SQL
  // Používáme přetypování ::text, abychom vektor dostali jako čitelný řetězec
  const videos = await prisma.$queryRaw<any[]>`
    SELECT id, title, status, "globalEmbedding"::text as "globalEmbedding"
    FROM "CoreVideo"
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  if (!videos || videos.length === 0) {
    console.log("Žádné video v Core systému nenalezeno.");
    return;
  }

  const lastVideo = videos[0];

  console.log(`Název: ${lastVideo.title}`);
  console.log(`Status: ${lastVideo.status}`);
  
  // Kontrola existence vektoru (řetězec "[...]")
  const hasGlobal = lastVideo.globalEmbedding && lastVideo.globalEmbedding.length > 5;
  console.log(`Global Vector: ${hasGlobal ? '✅ Vytvořen (Data nalezena)' : '❌ Chybí'}`);

  // 2. Získání segmentů pro toto video
  const segments = await prisma.$queryRaw<any[]>`
    SELECT id, "startTime", "endTime", summary, tags, embedding::text as embedding
    FROM "CoreSegment"
    WHERE "videoId" = ${lastVideo.id}
    ORDER BY "startTime" ASC
  `;

  console.log(`Počet segmentů: ${segments.length}`);
  console.log("\n--- Detail Segmentů ---");

  segments.forEach((seg, i) => {
    const vectorInfo = (seg.embedding && seg.embedding.length > 5) ? '✅ Vector OK' : '❌ Bez vektoru';
    const tagsDisplay = Array.isArray(seg.tags) ? seg.tags.join(', ') : seg.tags;
    
    console.log(`[${i+1}] ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)} | ${vectorInfo} | Tagy: ${tagsDisplay}`);
    console.log(`    Shrnutí: ${seg.summary?.substring(0, 50)}...`);
  });
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

check()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());