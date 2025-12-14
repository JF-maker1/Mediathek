import { PrismaClient } from '@prisma/client';
// OPRAVA: Odstraněna koncovka .ts (vyřešíme to v CLI parametru)
import { autoCategorizeVideo } from './lib/core/librarian'; 

const prisma = new PrismaClient();

async function runTest() {
  console.log("--- TEST AUTONOMNÍHO KNIHOVNÍKA (START) ---");

  // 1. Najdeme poslední zpracované video v Core systému
  const lastVideo = await prisma.coreVideo.findFirst({
    where: { status: 'COMPLETED' }, // Musí být hotové (mít vektory)
    orderBy: { createdAt: 'desc' }
  });

  if (!lastVideo) {
    console.error("❌ Žádné video se statusem COMPLETED nebylo nalezeno.");
    return;
  }

  console.log(`🔍 Testuji na videu: "${lastVideo.title}"`);
  console.log(`🆔 Core ID: ${lastVideo.id}`);

  // 2. Spustíme automatizaci
  try {
    const result = await autoCategorizeVideo(lastVideo.id);
    
    console.log("\n--- VÝSLEDEK MISE ---");
    if (result.action === 'CREATED') {
      console.log(`✨ STVOŘENÍ: Byla založena nová sbírka!`);
      console.log(`📂 Název: "${result.collection}"`);
    } else if (result.action === 'JOINED') {
      console.log(`🔗 PŘIPOJENÍ: Video bylo zařazeno do existující sbírky.`);
      console.log(`📂 Název: "${result.collection}"`);
    } else {
      console.log(`⚠️ JINÝ VÝSLEDEK:`, result);
    }

  } catch (error) {
    console.error("\n❌ KRITICKÁ CHYBA PŘI TESTU:", error);
  }
}

runTest()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());