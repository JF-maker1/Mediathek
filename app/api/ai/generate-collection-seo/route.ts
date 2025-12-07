import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. KONFIGURACE ZDROJŮ ---

const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const allKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

// Používáme ověřené modely (stejně jako v ostatních souborech)
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

// Diagnostika API klíčů
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

// Funkce pro bezpečné vytažení JSONu z textu
function extractJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch (e2) {
      const firstOpen = text.indexOf('{');
      const lastClose = text.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1) {
        try { return JSON.parse(text.substring(firstOpen, lastClose + 1)); } catch (e3) { return null; }
      }
      return null;
    }
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

  logStep(`AI Zrcadlo startuje. Klíčů: ${allKeys.length}, Modely: ${AVAILABLE_MODELS.length}`);

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
          temperature: 0.3, // Pro syntézu sbírky chceme méně kreativity (zachováno z původního kódu)
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
    // Kontrola API klíčů
    if (allKeys.length === 0) {
      return NextResponse.json({ message: 'Server Error: API Key not configured' }, { status: 500 });
    }

    // 1. Ověření sezení a role
    const session = await getServerSession(authOptions);
    const allowedRoles = ['ADMIN', 'KURATOR'];

    if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { collectionId } = body;

    // Načtení sbírky z databáze
    const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        include: {
            videos: {
                take: 20,
                select: { title: true, seoSummary: true, summary: true, seoKeywords: true }
            }
        }
    });

    if (!collection || collection.videos.length === 0) {
        return NextResponse.json({ message: 'Sbírka je prázdná.' }, { status: 400 });
    }

    // Příprava kontextu pro AI
    const videosContext = collection.videos.map(v => `
- VIDEO: "${v.title}"
  OBSAH: ${v.seoSummary || v.summary}
  TAGY: ${v.seoKeywords.join(', ')}
    `).join('\n\n');

    // --- KLÍČOVÁ ZMĚNA: PROMPT PRO SYNTÉZU ---
    const systemPrompt = `
Jsi šéfredaktor vzdělávacího portálu. Máš před sebou seznam videí, která tvoří jednu tematickou sbírku.

[VSTUPNÍ DATA - OBSAH SBÍRKY]:
${videosContext}

[TVŮJ ÚKOL]:
Vytvoř JEDNOTNOU anotaci pro celou tuto skupinu videí.
Hledej společné téma, které všechna videa spojuje. Ignoruj detaily jednotlivých videí, pokud nejsou důležité pro celek.
Nedeskriptuj videa jedno po druhém. Syntetizuj je do jednoho narativu.

[VÝSTUPNÍ FORMÁT]:
Vrať POUZE jeden JSON objekt (nikoliv pole!).
{
  "title": "Vymysli jeden výstižný název, který zastřešuje všechna videa (max 6 slov).",
  "description": "Napiš 2-3 věty o tom, co se divák v této sbírce dozví jako celek. Použij formulace jako 'Tato sbírka nabízí...', 'Série se zaměřuje na...'.",
  "keywords": ["5-10", "klíčových", "slov", "pro", "celou", "kategorii"]
}
    `.trim();

    logStep(`Generuji SEO Syntézu pro sbírku: ${collection.name} (${collection.videos.length} videí)`);
    
    const result = await generateWithRetry(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    logStep(`AI Raw response: ${text.substring(0, 100)}...`);

    // Extrakce JSONu z odpovědi
    const jsonResponse = extractJson(text);

    if (!jsonResponse) {
        throw new Error(`AI nevrátila validní JSON. Raw: ${text.substring(0, 100)}...`);
    }

    // Normalizace dat - bezpečnostní pojistka pro různé formáty odpovědí
    const normalizedData = {
        title: jsonResponse.title || jsonResponse.name || jsonResponse.seoTitle || jsonResponse.nazev || '',
        description: jsonResponse.description || jsonResponse.summary || jsonResponse.seoDescription || jsonResponse.popis || '',
        keywords: jsonResponse.keywords || jsonResponse.tags || jsonResponse.seoKeywords || jsonResponse.klicova_slova || []
    };

    return NextResponse.json({ 
      data: normalizedData,
      message: 'SEO sbírky úspěšně vygenerováno.',
      debug_logs: executionLogs
    });

  } catch (error: any) {
    console.error('AI_ERROR', error);
    return NextResponse.json({ 
      message: error.message || 'Neznámá chyba',
      debug_logs: executionLogs 
    }, { status: error.message?.includes('429') ? 429 : 500 });
  }
}