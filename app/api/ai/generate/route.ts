import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    // 1. Diagnostika API Klíče
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: GEMINI_API_KEY is missing');
      return NextResponse.json({ message: 'Server Error: API Key not configured' }, { status: 500 });
    }

    // 2. Bezpečnostní kontrola
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // 3. Získání dat
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ message: 'Chybí přepis videa (transcript).' }, { status: 400 });
    }

    // 4. Příprava Promptu (Agresivní hierarchie)
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

ZDE JE PŘEPIS K ANALÝZE:
    `.trim();

    const fullPrompt = `${systemPrompt}\n${transcript}`;

    // 5. Inicializace a volání AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Použijeme gemini-2.0-flash, který fungoval (nezpůsoboval 404),
    // ale s vyšší teplotou pro větší kreativitu při hledání struktury.
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash', 
        generationConfig: {
            temperature: 0.4, // Zvýšeno pro podporu větvení myšlenek
            maxOutputTokens: 8192,
        }
    });

    console.log('🤖 Generuji obsah pomocí modelu gemini-2.0-flash (Aggressive Hierarchy Prompt)...');
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI obsah úspěšně vygenerován.');

    return NextResponse.json({ 
      content: text,
      message: 'Obsah úspěšně vygenerován.' 
    });

  } catch (error: any) {
    console.error('AI_GENERATE_ERROR', error);
    return NextResponse.json({ 
      message: 'Chyba při komunikaci s AI: ' + (error.message || 'Unknown error') 
    }, { status: 500 });
  }
}