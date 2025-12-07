import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- 1. KONFIGURACE ---

const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const allKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

// OPRAVA: Seznam modelů přesně podle vaší diagnostiky z logu.
// 1.5-flash tam nebyl, proto používáme 'latest' aliasy a verzi 2.5
const AVAILABLE_MODELS = [
  'gemini-flash-latest',          // Alias, který by měl fungovat
  'gemini-pro-latest',            // Stabilní alias
  'gemini-2.5-flash',             // Nejnovější dostupná verze ve vašem seznamu
  'gemini-2.0-flash-lite-preview-02-05' // Lite verze mívají lepší limity
];

let executionLogs: string[] = [];

function logStep(msg: string) {
  const time = new Date().toLocaleTimeString();
  const logMsg = `[${time}] ${msg}`;
  console.log(logMsg);
  executionLogs.push(logMsg);
}

// Diagnostika (ponechána pro jistotu)
async function listAvailableModels(apiKey: string) {
  try {
    logStep(`🔍 DIAGNOSTIKA: Ptám se Google API na modely...`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      const modelNames = data.models.map((m: any) => m.name.replace('models/', ''));
      logStep(`📋 DOSTUPNÉ: ${modelNames.slice(0, 5).join(', ')}...`); // Výpis jen prvních 5 pro přehlednost
    }
  } catch (e: any) {
    logStep(`❌ Chyba diagnostiky: ${e.message}`);
  }
}

if (allKeys.length === 0) {
    console.error(`[AI SYSTEM] CHYBA: Žádné API klíče nenalezeny!`);
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

  logStep(`Startuji generování. Modely: ${AVAILABLE_MODELS.join(', ')}`);

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
          temperature: 0.4,
          maxOutputTokens: 8192,
        }
      });

      const result = await model.generateContent(prompt);
      logStep(`✅ ÚSPĚCH! Model ${currentModelName} odpověděl.`);
      return result;

    } catch (error: any) {
      const errorMsg = error.message || '';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('Quota');
      const isNotFound = errorMsg.includes('404') || errorMsg.includes('not found');

      logStep(`❌ CHYBA (${isNotFound ? '404' : 'Limit/Jiná'}) na ${currentModelName}: ${errorMsg.substring(0, 50)}...`);
      
      if (i < retries - 1) {
          const waitTime = isRateLimit ? 2000 : 1000;
          logStep(`⏳ Zkouším jinou kombinaci za ${waitTime/1000}s...`);
          await delay(waitTime);
          continue;
      }
      
      // Při posledním pokusu spustíme diagnostiku
      if (i === retries - 1) await listAvailableModels(currentKey);
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
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 403 });
    }

    const body = await request.json();
    const { transcript, title } = body; 

    if (!transcript) {
      return NextResponse.json({ message: 'Chybí přepis videa.' }, { status: 400 });
    }

    // PŮVODNÍ PROMPT
    const systemPrompt = `
Jsi expertní analytik a editor. Tvým úkolem je vytvořit **hluboce strukturovaný** obsah z přepisu videa.

[=== CÍL ===]
Nechci jen seznam bodů. Chci detailní taxonomii obsahu.
Tvým úkolem je najít logické celky (Kapitoly) a ty **rozebrat na prvočinitele** (Podkapitoly).

[=== POVINNÁ STRUKTURA ===]
Výstup musí striktně dodržovat tento formát:
{Číslo}. {Název} [{Detailní popis v závorce}] ({Čas_Od}-{Čas_Do})

Příklady číslování:
1. Hlavní téma
1.1. Podtéma (detail)
1.2. Další aspekt
2. Další téma

[=== PRAVIDLA (CRITICAL) ===]
1. **VYNUCENÁ HIERARCHIE:** Snaž se, aby alespoň 50 % hlavních bodů mělo podbody (X.1, X.2). Plochý seznam je selhání.
2. **ORPHAN RULE:** Pokud vytvoříš 1.1, musí následovat 1.2. (Podkapitola nesmí být sama).
3. **ČASOVÁNÍ:** Časy musí na sebe navazovat. Konec 1.1 je začátek 1.2.
4. **JAZYK:** Čeština. Žádný Markdown (*, **).

[=== PŘÍKLAD VÝSTUPU (TAKTO TO MUSÍ VYPADAT) ===]
1. Úvod do problematiky [Definice základních pojmů a představení kontextu] (00:00-02:15)
1.1. Historický kontext [Jak se problém vyvíjel v čase] (00:00-01:10)
1.2. Současný stav [Aktuální data a statistiky] (01:10-02:15)
2. Analýza příčin [Rozbor důvodů, proč situace nastala] (02:15-05:00)
2.1. Vnější faktory [Vliv prostředí a okolností] (02:15-03:45)
2.2. Vnitřní faktory [Psychologické aspekty] (03:45-05:00)

ZDE JE PŘEPIS K ANALÝZE: (Video: "${title}")
    `.trim();

    const fullPrompt = `${systemPrompt}\n${transcript.substring(0, 30000)}`;

    const result = await generateWithRetry(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ 
      content: text,
      message: 'Obsah úspěšně vygenerován.',
      debug_logs: executionLogs
    });

  } catch (error: any) {
    console.error('[AI FINAL ERROR]:', error.message);
    return NextResponse.json({ 
      message: 'Chyba AI: ' + (error.message || 'Neznámá chyba'),
      debug_logs: executionLogs 
    }, { status: error.message?.includes('429') ? 429 : 500 });
  }
}