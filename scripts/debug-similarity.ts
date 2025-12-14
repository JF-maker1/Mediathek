import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COLLECTION_A = "Zdraví z přírody";
const COLLECTION_B = "Síla Přírody";

async function measureSimilarity() {
  console.log(`🔍 DIAGNOSTIKA: Měřím sémantickou vzdálenost...`);
  console.log(`🅰️  Levý břeh: "${COLLECTION_A}"`);
  console.log(`🅱️  Pravý břeh: "${COLLECTION_B}"`);

  // SQL dotaz využívající pgvector operátor <=> (vzdálenost)
  // Podobnost = 1 - Vzdálenost
  const result = await prisma.$queryRaw<any[]>`
    SELECT 
      c1.name as name1,
      c2.name as name2,
      1 - (c1."semanticCentroid" <=> c2."semanticCentroid") as similarity
    FROM "CoreCollection" c1, "CoreCollection" c2
    WHERE c1.name = ${COLLECTION_A}
      AND c2.name = ${COLLECTION_B}
      AND c1."semanticCentroid" IS NOT NULL
      AND c2."semanticCentroid" IS NOT NULL
  `;

  console.log("\n------------------------------------------------");
  
  if (result.length === 0) {
    console.log("❌ Chyba: Jedna nebo obě sbírky nebyly nalezeny (nebo nemají vektor).");
    console.log("Zkontrolujte přesné názvy v databázi.");
  } else {
    const similarity = parseFloat(result[0].similarity);
    const percentage = (similarity * 100).toFixed(2);
    
    console.log(`🎯 VÝSLEDEK MĚŘENÍ:`);
    console.log(`📊 Podobnost: ${similarity.toFixed(4)} (${percentage} %)`);
    
    console.log("\n--- VERDIKT ---");
    if (similarity > 0.8) {
      console.log("🟢 Velmi vysoká shoda. Měly se sloučit už při 0.8.");
    } else if (similarity > 0.7) {
      console.log("🟡 Střední shoda. Pokud snížíte práh na 0.7, SLOUČÍ SE.");
    } else {
      console.log("🔴 Nízká shoda. I po snížení prahu zůstanou oddělené.");
    }
  }
  console.log("------------------------------------------------\n");
}

measureSimilarity()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());