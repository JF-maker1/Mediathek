import { PrismaClient } from '@prisma/client';
import { generateEmbedding, segmentTranscript, AISegment, analyzeVideoTaxonomy } from '../ai/semantic-analyzer';
import { autoCategorizeVideo, organizeByTaxonomy } from './librarian';

const prisma = new PrismaClient();

interface SegmentWithVector extends AISegment {
  vector: number[];
  weight: number;
}

/**
 * Vypočítá VÁŽENÝ centroid.
 * Delší segmenty mají větší vliv na výsledný směr videa.
 */
function calculateWeightedCentroid(segments: SegmentWithVector[]): number[] {
  if (segments.length === 0) return [];
  
  const dim = segments[0].vector.length;
  const centroid = new Array(dim).fill(0);
  let totalWeight = 0;

  for (const seg of segments) {
    // Váha = délka trvání (v sekundách). Minimálně 10s, aby krátké štěky nezmizely úplně.
    const duration = Math.max(10, seg.endTime - seg.startTime);
    const weight = duration; 
    
    totalWeight += weight;

    for (let i = 0; i < dim; i++) {
      centroid[i] += seg.vector[i] * weight;
    }
  }

  // Normalizace (vydělení celkovou váhou)
  if (totalWeight > 0) {
    for (let i = 0; i < dim; i++) {
      centroid[i] /= totalWeight;
    }
  }
  
  return centroid;
}

export async function ingestVideoToCore(legacyVideoId: string) {
  console.log(`[CORE INGEST] Startuji DCVA analýzu pro video ID: ${legacyVideoId}`);
  
  try {
    const video = await prisma.video.findUnique({
      where: { id: legacyVideoId },
      include: { transcript: true }
    });

    if (!video || !video.transcript || !video.transcript.content) {
      console.log(`[CORE INGEST] Video nemá přepis, přeskakuji.`);
      return;
    }

    // 1. ZKONTROLUJEME EXISTENCI (Recyklace)
    const existingCoreVideo = await prisma.coreVideo.findUnique({
      where: { youtubeId: video.youtubeId }
    });

    let coreVideoId = "";

    if (existingCoreVideo) {
      console.log(`[CORE INGEST] Nalezen existující záznam v Core (Recyklace).`);
      const updated = await prisma.coreVideo.update({
        where: { id: existingCoreVideo.id },
        data: {
          legacyVideoId: video.id,
          title: video.title,
          summary: video.summary || video.seoSummary,
          status: 'PROCESSING',
          lastProcessedAt: new Date()
        }
      });
      coreVideoId = updated.id;
    } else {
      console.log(`[CORE INGEST] Vytvářím zcela nový Core záznam.`);
      const created = await prisma.coreVideo.create({
        data: {
          legacyVideoId: video.id,
          youtubeId: video.youtubeId,
          title: video.title,
          summary: video.summary || video.seoSummary,
          status: 'PROCESSING'
        }
      });
      coreVideoId = created.id;
    }

    // 2. SEGMENTACE (DCVA Level)
    const estimatedDuration = video.transcript.content.length / 15;
    console.log(`[CORE INGEST] Segmentuji přepis...`);
    const segments = await segmentTranscript(video.transcript.content, estimatedDuration);
    console.log(`[CORE INGEST] Nalezeno ${segments.length} segmentů.`);

    // 3. VEKTORIZACE (S Kontextem a KeyTakeaway)
    const segmentDataWithVectors: SegmentWithVector[] = [];

    for (const seg of segments) {
      // Vylepšený text pro vektorizaci:
      // Obsahuje název videa (kotva) + téma segmentu + klíčovou myšlenku + obsah
      const contextHeader = `VIDEO: ${video.title}\nPOPIS: ${video.summary || ""}`;
      const segmentBody = `TÉMA: ${seg.summary}\nMYŠLENKA: ${seg.keyTakeaway || ""}\nOBSAH: ${seg.content}`;
      
      const textToEmbed = `${contextHeader}\n---\n${segmentBody}`;
      
      const vector = await generateEmbedding(textToEmbed);

      if (vector) {
        segmentDataWithVectors.push({ 
            ...seg, 
            vector,
            weight: 1 // Default, přepočítá se v centroidu
        });
      }
    }

    // 4. VÁŽENÝ CENTROID
    let globalVector: number[] | null = null;
    if (segmentDataWithVectors.length > 0) {
      globalVector = calculateWeightedCentroid(segmentDataWithVectors);
    }

    // 5. TAXONOMIE & HIERARCHIE (Architekt - Fáze 19.5)
    console.log(`[CORE INGEST] Analyzuji taxonomii (Root -> Branch)...`);
    const taxonomy = await analyzeVideoTaxonomy(video.transcript.content, video.title);
    console.log(`[CORE INGEST] Taxonomie: ${JSON.stringify(taxonomy)}`);

    // 6. ULOŽENÍ DO DB
    await prisma.$transaction(async (tx) => {
      // Smazat staré segmenty
      await tx.coreSegment.deleteMany({ where: { videoId: coreVideoId } });

      // Vložit nové segmenty
      for (const item of segmentDataWithVectors) {
        const vectorString = `[${item.vector.join(',')}]`;
        await tx.$executeRaw`
          INSERT INTO "CoreSegment" ("id", "videoId", "startTime", "endTime", "content", "summary", "tags", "embedding", "createdAt")
          VALUES (
            gen_random_uuid()::text, 
            ${coreVideoId}, 
            ${Math.floor(item.startTime)}, 
            ${Math.floor(item.endTime)}, 
            ${item.content}, 
            ${item.summary}, 
            ${item.tags}, 
            ${vectorString}::vector, 
            NOW()
          );
        `;
      }

      // Update CoreVideo (Vektor + Taxonomie + Status)
      if (globalVector) {
        const globalVectorString = `[${globalVector.join(',')}]`;
        
        // Krok A: Vektor (Raw SQL - nutné pro pgvector)
        await tx.$executeRaw`
          UPDATE "CoreVideo"
          SET "globalEmbedding" = ${globalVectorString}::vector
          WHERE "id" = ${coreVideoId};
        `;
        
        // Krok B: Taxonomie a Status (Prisma ORM)
        await tx.coreVideo.update({
          where: { id: coreVideoId },
          data: { 
            status: 'COMPLETED',
            lastProcessedAt: new Date(),
            taxonomy: taxonomy as any // JSON pole s Root -> Branch strukturou
          }
        });

      } else {
        // Bez vektoru, jen taxonomie a status
        await tx.coreVideo.update({
          where: { id: coreVideoId },
          data: { 
            status: 'COMPLETED',
            lastProcessedAt: new Date(),
            taxonomy: taxonomy as any
          }
        });
      }
    });

    console.log(`[CORE INGEST] ✅ DCVA Ingesce hotova. Stavím regály...`);

    // 7. HIERARCHICKÉ TŘÍDĚNÍ (Architekt - Stavba Regálů)
    // Vytvoří/přiřadí sbírky podle taxonomie Root -> Branch
    try {
      await organizeByTaxonomy(coreVideoId, taxonomy);
      console.log(`[LIBRARIAN] 📚 Regály postaveny podle taxonomie.`);
    } catch (taxError) {
      console.error(`[LIBRARIAN] ⚠️ Chyba při stavbě regálů:`, taxError);
    }

    // 8. (Volitelné) Starý Matchmaker pro "Průvodce" sbírky
    // Ponecháno pro zpětnou kompatibilitu, můžete odstranit pokud už není potřeba
    if (globalVector) {
       try {
         const result = await autoCategorizeVideo(coreVideoId);
         if (result.action === 'CREATED') {
            console.log(`[LIBRARIAN] ✨ Založena nová sbírka: "${result.collection}"`);
         } else if (result.action === 'JOINED') {
            console.log(`[LIBRARIAN] 🔗 Video přidáno do sbírky: "${result.collection}"`);
         }
       } catch (libError) {
         console.error(`[LIBRARIAN] ⚠️ Chyba při třídění:`, libError);
       }
    }

  } catch (error) {
    console.error(`[CORE INGEST] ❌ Chyba:`, error);
    await prisma.coreVideo.updateMany({
       where: { legacyVideoId: legacyVideoId },
       data: { status: 'FAILED' }
    });
  }
}