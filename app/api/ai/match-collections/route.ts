import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// --- 1. KONFIGURACE ---

const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const allKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

// Seznam modelů seřazený od nejstabilnějších po experimentální
const AVAILABLE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash',
  'gemini-flash-latest'
];

let executionLogs: string[] = [];

function logStep(msg: string) {
  const time = new Date().toLocaleTimeString();
  const logMsg = `[${time}] ${msg}`;
  console.log(logMsg);
  executionLogs.push(logMsg);
}

// Funkce pro bezpečné vytažení JSONu z textu
function extractJson(text: string) {
  if (!text) return null;
  
  // 1. Zkusíme přímý parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // 2. Odstranění markdown bloků ```json ... ```
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch (e2) {
      // 3. Hledání prvního '{' a posledního '}' (agresivní extrakce)
      const firstOpen = text.indexOf('{');
      const lastClose = text.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1) {
        try {
          return JSON.parse(text.substring(firstOpen, lastClose + 1));
        } catch (e3) { return null; }
      }
      return null;
    }
  }
}

async function listAvailableModels(apiKey: string) {
  try {
    logStep(`🔍 DIAGNOSTIKA: Ptám se Google API na modely...`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      const modelNames = data.models.map((m: any) => m.name.replace('models/', ''));
      logStep(`📋 DOSTUPNÉ: ${modelNames.slice(0, 5).join(', ')}...`);
    }
  } catch (e: any) {
    logStep(`❌ Chyba diagnostiky: ${e.message}`);
  }
}

function getRandomKey(excludeKey: string = '') {
  if (allKeys.length === 0) return '';
  const availableKeys = allKeys.length > 1 
    ? allKeys.filter(k => k !== excludeKey) 
    : allKeys;
  return availableKeys[Math.floor(Math.random() * availableKeys.length)];
}

function getRandomModel() {
  return AVAILABLE_MODELS[Math.floor(Math.random() * AVAILABLE_MODELS.length)];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 2. FUNKCE GENEROVÁNÍ ---

async function generateWithRetry(prompt: string, retries = 6) {
  let lastUsedKey = '';
  executionLogs = []; 

  logStep(`AI Matchmaker startuje. Klíčů: ${allKeys.length}, Modely: ${AVAILABLE_MODELS.length}`);

  for (let i = 0; i < retries; i++) {
    const currentKey = getRandomKey(lastUsedKey);
    const currentModelName = getRandomModel();
    
    lastUsedKey = currentKey;
    const keyId = `...${currentKey.slice(-4)}`;

    try {
      logStep(`Pokus ${i + 1}/${retries} | Klíč: ${keyId} | Model: ${currentModelName}`);
      
      const genAI = new GoogleGenerativeAI(currentKey);
      
      const model = genAI.getGenerativeModel({ 
        model: currentModelName, 
        generationConfig: {
          // responseMimeType: "application/json" // Vypnuto pro větší kompatibilitu, řešíme to v promptu
          temperature: 0.1, 
          maxOutputTokens: 2048,
        }
      });

      const result = await model.generateContent(prompt);
      logStep(`✅ ÚSPĚCH! Model ${currentModelName} odpověděl.`);
      return result;

    } catch (error: any) {
      const errorMsg = error.message || '';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('Quota');
      const isNotFound = errorMsg.includes('404') || errorMsg.includes('not found');
      const isKeyError = errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID');

      let reason = 'Neznámá chyba';
      if (isRateLimit) reason = 'Rate Limit';
      if (isNotFound) reason = 'Model nenalezen';
      if (isKeyError) reason = 'Neplatný API klíč';

      logStep(`❌ CHYBA (${reason}) na ${currentModelName}: ${errorMsg.substring(0, 50)}...`);
      
      if (i === retries - 1 && isKeyError) {
         await listAvailableModels(currentKey);
      }

      if (i < retries - 1) {
          const waitTime = isRateLimit ? 2000 : 1000;
          logStep(`⏳ Čekám ${waitTime/1000}s a zkouším jinou kombinaci...`);
          await delay(waitTime);
          continue;
      }
      
      throw error;
    }
  }
  throw new Error('Vyčerpány všechny pokusy.');
}

export async function POST(request: Request) {
  try {
    if (allKeys.length === 0) {
      return NextResponse.json({ message: 'Server Error: API Key not configured' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    const allowedRoles = ['ADMIN', 'KURATOR'];

    if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { videoContext, existingCollections } = body;

    if (!videoContext || !existingCollections) {
      return NextResponse.json({ message: 'Missing data' }, { status: 400 });
    }

    // Minimalizace dat pro prompt
    const collectionsMinified = existingCollections.map((c: any) => ({
      id: c.id,
      name: c.name,
      desc: c.description ? c.description.substring(0, 100) : ''
    }));

    // ZACHOVANÝ PROMPT Z ROUTE.TS
    const systemPrompt = `
Jsi expertní kurátor digitální knihovny. Tvým úkolem je analyzovat video a zařadit ho do kontextu sbírek.

VSTUPNÍ DATA:
1. VIDEO (Kontext):
   - Název: "${videoContext.title}"
   - Shrnutí: "${videoContext.summary}"
   - Klíčová slova: "${videoContext.keywords}"
   - AI Návrhy témat: "${videoContext.aiSuggestions}"

2. EXISTUJÍCÍ SBÍRKY (ID, Název, Popis):
   ${JSON.stringify(collectionsMinified)}

INSTRUKCE:
1. ÚKOL KLASIFIKACE (Pořádek): Projdi existující sbírky. Pokud video sémanticky zapadá do tématu sbírky, přidej její ID do pole "matches". Buď velkorysý - pokud to tam aspoň trochu patří, zařaď to.
2. ÚKOL EVOLUCE (Růst): Pokud video obsahuje silné, specifické téma, které není dobře pokryto žádnou existující sbírkou, navrhni 1 novou sbírku. Vygeneruj pro ni výstižný Název a Popis. Pokud video dobře zapadá do starých, nové nenavrhuj.

VÝSTUPNÍ FORMÁT (JSON):
{
  "matches": ["id_sbirky_1", "id_sbirky_2"],
  "new_proposals": [
    { "name": "Název Nové Sbírky", "description": "Popis nové sbírky..." }
  ]
}
Odpověz POUZE validním JSON objektem.
`.trim();

    const result = await generateWithRetry(systemPrompt);
    const response = await result.response;
    const text = response.text();

    // Debugging: Vypíšeme, co AI vrátila, pokud to spadne
    if (!text) {
        throw new Error("AI vrátila prázdnou odpověď.");
    }

    // Použití robustního parseru
    const jsonResponse = extractJson(text);

    if (!jsonResponse) {
        console.error("[AI RAW RESPONSE]:", text); // Pro debug v terminálu
        throw new Error(`Nepodařilo se parsovat JSON z AI odpovědi. Raw: ${text.substring(0, 50)}...`);
    }

    return NextResponse.json({
      ...jsonResponse,
      debug_logs: executionLogs
    });

  } catch (error: any) {
    console.error('[AI_MATCH_ERROR]', error);
    return NextResponse.json({ 
      message: 'Chyba AI Matchmaker: ' + (error.message || 'Neznámá chyba'),
      debug_logs: executionLogs 
    }, { status: error.message?.includes('429') ? 429 : 500 });
  }
}