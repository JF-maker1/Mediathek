import { PrismaClient } from '@prisma/client';
// Používáme relativní cestu bez .ts pro kompatibilitu s ts-node
import { generateCollectionMetadata, TaxonomyResult } from '../ai/semantic-analyzer';

const prisma = new PrismaClient();

// Definice výsledku hledání
export interface MatchResult {
  collectionId: string;
  name: string;
  similarity: number;
}

/**
 * 1. MATCHMAKER: Najde relevantní sbírky (READ-ONLY)
 * Stále užitečné pro doporučování "Kam by to ještě mohlo patřit?"
 */
export async function findRelevantCollectionsForVideo(coreVideoId: string, threshold = 0.7): Promise<MatchResult[]> {
  const videoData = await prisma.$queryRaw<any[]>`
    SELECT "globalEmbedding"::text 
    FROM "CoreVideo" 
    WHERE id = ${coreVideoId}
  `;

  if (!videoData || videoData.length === 0 || !videoData[0].globalEmbedding) {
    return [];
  }

  const vectorString = videoData[0].globalEmbedding;

  const matches = await prisma.$queryRaw<any[]>`
    SELECT 
      id as "collectionId", 
      name, 
      1 - ("semanticCentroid" <=> ${vectorString}::vector) as similarity
    FROM "CoreCollection"
    WHERE "semanticCentroid" IS NOT NULL
    AND "origin" = 'SYSTEM' 
    AND 1 - ("semanticCentroid" <=> ${vectorString}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT 1;
  `;

  return matches.map(m => ({
    collectionId: m.collectionId,
    name: m.name,
    similarity: m.similarity
  }));
}

/**
 * 2. CENTROID UPDATE: Přepočítá těžiště sbírky
 */
export async function updateCollectionCentroid(coreCollectionId: string) {
  const videos = await prisma.$queryRaw<any[]>`
    SELECT cv."globalEmbedding"::text
    FROM "CoreVideo" cv
    JOIN "_CoreVideoToCollection" link ON link."A" = cv.id
    WHERE link."B" = ${coreCollectionId}
    AND cv."globalEmbedding" IS NOT NULL
  `;
  
  if (videos.length === 0) return;

  const vectorArrays: number[][] = videos.map(v => JSON.parse(v.globalEmbedding));
  const dim = vectorArrays[0].length;
  const centroid = new Array(dim).fill(0);

  for (const vec of vectorArrays) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectorArrays.length;
  }

  const centroidString = `[${centroid.join(',')}]`;
  await prisma.$executeRaw`
    UPDATE "CoreCollection" 
    SET "semanticCentroid" = ${centroidString}::vector 
    WHERE id = ${coreCollectionId}
  `;
}

/**
 * 3. HIERARCHICKÝ ARCHITEKT (Fáze 19.5)
 * Zařadí video do stromové struktury (Root -> Branch) podle taxonomie z AI.
 */
export async function organizeByTaxonomy(coreVideoId: string, taxonomy: TaxonomyResult) {
  console.log(`[LIBRARIAN] Stavím regály pro video: ${coreVideoId}`);
  console.log(`[LIBRARIAN] Taxonomie: ${taxonomy.root} > ${taxonomy.branch}`);

  // A. Najdi nebo vytvoř ROOT sbírku (Hlavní obor)
  // Hledáme sbírku typu SYSTEM, která nemá rodiče
  let rootCollection = await prisma.coreCollection.findFirst({
    where: {
      name: taxonomy.root,
      origin: 'SYSTEM',
      parentId: null
    }
  });

  if (!rootCollection) {
    console.log(`[LIBRARIAN] Zakládám ROOT sbírku: "${taxonomy.root}"`);
    rootCollection = await prisma.coreCollection.create({
      data: {
        name: taxonomy.root,
        description: `Hlavní kategorie: ${taxonomy.root}`,
        type: 'STANDARD',
        origin: 'SYSTEM'
      }
    });
  }

  // B. Najdi nebo vytvoř BRANCH sbírku (Podobor)
  // Hledáme sbírku, která má správné jméno A JEJÍŽ rodič je náš Root
  let branchCollection = await prisma.coreCollection.findFirst({
    where: {
      name: taxonomy.branch,
      origin: 'SYSTEM',
      parentId: rootCollection.id
    }
  });

  if (!branchCollection) {
    console.log(`[LIBRARIAN] Zakládám BRANCH sbírku: "${taxonomy.branch}" (pod "${taxonomy.root}")`);
    branchCollection = await prisma.coreCollection.create({
      data: {
        name: taxonomy.branch,
        description: `Podkategorie v sekci ${taxonomy.root}`,
        type: 'STANDARD',
        origin: 'SYSTEM',
        parentId: rootCollection.id // Vazba na rodiče!
      }
    });
  }

  // C. Zařazení videa do BRANCH sbírky
  // Videa dáváme do "větve", ne do "kořene" (aby byl kořen přehledný)
  // Můžeme zvážit i zařazení do Leaf (Téma), pokud bychom chtěli 3 úrovně,
  // ale pro začátek je 2-úrovňová struktura (Obor > Podobor) přehlednější.
  
  await prisma.coreCollection.update({
    where: { id: branchCollection.id },
    data: {
      videos: { connect: { id: coreVideoId } }
    }
  });

  console.log(`[LIBRARIAN] 🔗 Video zařazeno do: "${taxonomy.root} > ${taxonomy.branch}"`);

  // D. Aktualizace centroidů
  // Aktualizujeme vektor větve (aby se učila, co obsahuje)
  await updateCollectionCentroid(branchCollection.id);
  // Volitelně můžeme aktualizovat i kořen, ale to může být výpočetně náročné u velkých knihoven
}

/**
 * 4. AUTONOMNÍ ORGANIZÁTOR (Legacy Wrapper)
 * Ponecháno pro zpětnou kompatibilitu, ale nyní primárně spoléháme na taxonomii.
 * Můžeme to použít jako fallback, pokud taxonomie selže.
 */
export async function autoCategorizeVideo(coreVideoId: string) {
  // Tato funkce se nyní používá méně, protože hlavní logiku přebírá organizeByTaxonomy.
  // Můžeme ji nechat pro "Průvodce" (Guide), kteří vznikají z vektorů segmentů.
  return { action: 'SKIPPED', collection: 'Managed by Taxonomy' };
}