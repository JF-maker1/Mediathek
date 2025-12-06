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

    // 4. Příprava Promptu (Návrat k ověřené detailní verzi)
    const systemPrompt = `
Jsi expertní analytik video obsahu a editor. Tvým úkolem je provést hloubkovou sémantickou analýzu přiloženého přepisu a vytvořit strukturovaný, hierarchický obsah v češtině.

[===ZÁMĚR===] Rozložit obsah videa na logické celky (Kapitola > Sekce > Detail) s přesným časovým vymezením. Cílem je vytvořit přehlednou mapu videa, kde každá část má svůj jasný začátek a konec. Struktura musí být vyvážená – žádná větev hierarchie nesmí končit osamoceným bodem (tzv. "orphan rule").

[=== PŘÍSNÁ PRAVIDLA SYNTAXE (Musí být dodržena na 100 %) ===]

Formát řádku: {Hierarchické_číslo}. {Název} [{Popis_obsahu}] ({Čas_Od}-{Čas_Do})

Číslo: Na začátku řádku (např. 1., 1.1., 1.1.1.).

Název: Stručný titulek (max 7 slov).

Popis: Vždy v hranatých závorkách [...].

Čas: Vždy v kulatých závorkách (...) na úplném konci řádku. Formát MM:SS. Časy na sebe musí plynule navazovat bez mezer.

Pravidlo větvení (Kritické):

Pokud se rozhodneš vytvořit nižší úroveň (např. podkapitolu 1.1.), musí následovat minimálně ještě jedna položka stejné úrovně (1.2.).

ZAKÁZÁNO: Mít položku 1., která má pouze podpoložku 1.1. a nic dalšího.

POVOLENO: Položka 1. má podpoložky 1.1. a 1.2., nebo položka 1. nemá žádné podpoložky.

Jazyk a styl:

Výstup vždy v češtině, bez ohledu na jazyk vstupu.

Pouze prostý text (žádné Markdown formátování jako tučné písmo či kurzíva).

[=== INSTRUKCE PRO ZPRACOVÁNÍ ===]

Analýza: Přečti celý text a identifikuj hlavní tematické bloky.

Segmentace: Rozděl bloky na menší celky. Vždy kontroluj, zda má smysl dělit dál – pokud nemůžeš najít alespoň dva různé aspekty (podbody) daného tématu, nevytvářej pro ně novou úroveň, ale zahrň je do popisu nadřazeného bodu.

Časování: Přiřaď přesné časy startu a konce každé myšlenky. Konec jedné sekce je začátkem druhé.

Překlad: Názvy a popisy formuluj přirozenou češtinou.

Kontrola: Před vypsáním ověř, že žádné hierarchické číslo nezůstalo osamocené (např. pokud existuje X.1., musí existovat i X.2.).

ZDE JE PŘEPIS K ANALÝZE:
    `.trim();

    const fullPrompt = `${systemPrompt}\n${transcript}`;

    // 5. Inicializace a volání AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Konfigurace modelu - Návrat k osvědčenému modelu a mírné zvýšení teploty
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash', // Změna z 2.0 na 1.5 pro stabilitu
        generationConfig: {
            temperature: 0.2, // Mírně zvýšeno z 0.1 pro lepší kreativitu při strukturování
            maxOutputTokens: 8192,
        }
    });

    console.log('🤖 Generuji obsah pomocí modelu gemini-1.5-flash (Restored Original Prompt)...');
    
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