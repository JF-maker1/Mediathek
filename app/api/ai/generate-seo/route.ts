import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- 1. KONFIGURACE ZDROJŮ (Multi-key + Multi-model support) ---

const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const allKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

// Používáme ověřené modely
const AVAILABLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-flash-latest',          
  'gemini-pro-latest',            
  'gemini-2.5-flash',             
  'gemini-2.0-flash-lite-preview-02-05' 
];

// Logovací pole
let executionLogs: string[] = [];

function logStep(msg: string) {
  const time = new Date().toLocaleTimeString();
  const logMsg = `[${time}] ${msg}`;
  console.log(logMsg);
  executionLogs.push(logMsg);
}

// Diagnostika
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

// --- 2. FUNKCE GENEROVÁNÍ S RETRY MECHANIKOU ---

async function generateWithRetry(prompt: string, retries = 6) {
  let lastUsedKey = '';
  executionLogs = []; 

  logStep(`Generátor metadat startuje. Klíčů: ${allKeys.length}, Modely: ${AVAILABLE_MODELS.length}`);

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
          temperature: 0.2, // Nízká teplota pro přesnost faktů
          maxOutputTokens: 2048,
          responseMimeType: "application/json", // Vynucení JSON odpovědi
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
         logStep(`⛔ Poslední pokus selhal na klíči. Spouštím diagnostiku...`);
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

// --- 3. MAIN POST HANDLER ---

export async function POST(request: Request) {
  try {
    // 1. Validace API klíče
    if (allKeys.length === 0) {
      return NextResponse.json({ message: 'Server Error: API Key not configured' }, { status: 500 });
    }

    // 2. Bezpečnostní kontrola
    const session = await getServerSession(authOptions);
    const allowedRoles = ['ADMIN', 'KURATOR'];

    if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Získání dat
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ message: 'Chybí přepis videa (transcript).' }, { status: 400 });
    }

    // 4. Adaptivní Prompt (PŮVODNÍ PROMPT Z route.ts - ZACHOVÁN BEZ ZMĚN)
    const systemPrompt = `
Jsi expertní analytik vzdělávacího obsahu a kurátor. Tvým úkolem je vytvořit strukturovaná metadata z přepisu videa pro webovou aplikaci Mediathek.

**INSTRUKCE PRO ANALÝZU:**
1.  **Zoom Out (Kontext):** Pochop hlavní myšlenku a teoretický rámec videa.
2.  **Zoom In (Entity):** Identifikuj konkrétní látky, metody a termíny.
3.  **Filtr Praktičnosti (Prioritizace - Adaptivní logika):**
      * **Priorita A (Taktické / Skóre 8-10):** Hledej primárně explicitní instrukce (dávkování, recepty, konkrétní cvičení).
      * **Priorita B (Strategické / Skóre 5-7):** Pokud chybí A, hledej strategická doporučení (např. 'zaměřte se na spánek', 'vyhněte se stresu').
      * **Priorita C (Konceptuální / Skóre 1-4):** Pokud je video čistě teoretické, extrahuj klíčové principy nutné k pochopení tématu.

**POŽADOVANÝ VÝSTUP (Strict JSON):**
Musíš vrátit POUZE validní JSON objekt bez markdown formátování (\`\`\`json).
Výstup musí být vždy v **ČEŠTINĚ**.

Struktura JSON:
{
  "summary": "Bohatý odstavec (2-3 věty), který spojuje teoretický kontext videa s navrhovaným řešením. Musí být atraktivní pro čtenáře.",
  "keywords": ["Pole", "5-10", "nejdůležitějších", "pojmů", "entit", "látek"],
  "practical_tips": ["Pole 3-6 konkrétních bodů. Seřaď je od nejpraktičtějších (recepty) po strategické (principy). Formátuj jako imperativ (např. 'Užívejte...', 'Pozorujte...')."],
  "suggestions": ["Pole 3-5 stručných návrhů názvů sbírek, kam video tématicky zapadá."]
}

**PŘEPIS VIDEA:**
    `.trim();

    const fullPrompt = `${systemPrompt}\n${transcript}`;

    console.log('🤖 Generuji metadata pomocí Gemini (Adaptivní Prompt s retry)...');
    
    // 5. Generování s retry mechanikou
    const result = await generateWithRetry(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI metadata vygenerována.');

    // 6. Validace a parsování
    let jsonData;
    try {
        // I když vynucujeme JSON, pro jistotu ho zkusíme parsovat
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        jsonData = JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        return NextResponse.json({ 
          message: 'AI nevrátila validní JSON.',
          debug_logs: executionLogs 
        }, { status: 500 });
    }

    return NextResponse.json({ 
      data: jsonData,
      message: 'Metadata úspěšně vygenerována.',
      debug_logs: executionLogs
    });

  } catch (error: any) {
    console.error('AI_GENERATE_SEO_ERROR', error);
    return NextResponse.json({ 
      message: 'Chyba při komunikaci s AI: ' + (error.message || 'Unknown error'),
      debug_logs: executionLogs 
    }, { status: error.message?.includes('429') ? 429 : 500 });
  }
}