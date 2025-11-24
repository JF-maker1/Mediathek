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

    // 4. Příprava Finálního Promptu (Dle zadání Fáze 11)
    // Používáme backticks (`) pro víceřádkový text.
    const systemPrompt = `
Proveď detailní hierarchický rozklad (hierarchický strom) přiloženého přepisu videa. Cílem je získat přehled o obsahu videa, podobný obsahu knihy.

**Požadavky na strukturu a formát:**

1.  **Hlavní Téma (Kořen):** Identifikuj nejdůležitější hlavní téma (ústřední myšlenku) celého videa. Uveď ho jako číslovaný bod "0. Hlavní téma".
2.  **Hierarchický Rozklad (Strom):** Rozlož Hlavní téma do hierarchické struktury číslovaného seznamu.
    * **Číslování:** Použij standardní hierarchické číslování (např. 1., 2., 1.1., 1.2., 2.1., 2.2., 2.3., 1.1.1. atd.).
    * **Větvení:** Každý nadřazený pojem (tam, kde je to logické) rozděl na dva či více podřízených pojmů (např. bod 2. se může rozdělit na 2.1., 2.2. a 2.3.).
3.  **Hloubka Rozkladu:** Pokračuj v hierarchickém rozkladu, ale zastav se na maximálně **čtvrté úrovni** (např. na úrovni 1.1.1.1.). Již nevytvářej pátou úroveň (např. 1.1.1.1.1.).
4.  **Struktura Každého Bodu:** Každý číslovaný bod musí obsahovat dvě části:
    * A) **Výstižný Název Tématu.** Pro tento název **nepoužívej žádné formátování** (jako je tučné písmo nebo hvězdičky **).
    * B) [Následovaný stručným popisem obsahu daného tématu, uzavřeným v hranatých závorkách].
5.  **Časové Úseky:** Ke každému bodu na každé úrovni hierarchie přidej přesný časový úsek ve formátu (MM:SS-MM:SS). Tato časová značka musí být umístěna **vždy až na samém konci daného řádku**.
6.  **Formát Závorek (Kritické):**
    * Pro časové úseky používej **výhradně kulaté závorky ()**.
    * Pro jakékoli doplňující poznámky, shrnutí obsahu nebo popisky (viz bod 4B) používej **výhradně hranaté závorky []**.
    * Je povoleno i vnořování hranatých závorek (např. [text popisující [vnořený text] detail]).
    * Každý řádek smí obsahovat pouze jeden pár kulatých závorek, vyhrazený pro časovou značku.
7.  **Jazyk:** Použij češtinu.
8.  **Formátování a Oddělovače (Kritické pro .txt):**
    * Mezi hlavními částmi nejvyšší úrovně (např. mezi body 1. a 2.) **NEPOUŽÍVEJ** žádné horizontální oddělovače (jako ---).
    * Každý číslovaný bod (včetně názvu, popisu a časové značky) musí být na samostatném řádku.
    * **Každý řádek musí začínat POUZE svým hierarchickým číslováním** (např. "0.", "1.", "1.1.", "1.1.1.1."). **NEPOUŽÍVEJ** žádné znaky odrážek (jako * nebo -) ani automatické číslování Markdownu před těmito čísly.
    * Odsazení pro vizuální hierarchii vytvoř pomocí mezer (např. dvě mezery pro každou další úroveň).

**Přiložený Přepis Videa:**
    `.trim();

    const fullPrompt = `${systemPrompt}\n${transcript}`;

    // 5. Inicializace a volání AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Konfigurace modelu pro přesnější dodržování instrukcí
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
            temperature: 0.2,      // Nízká teplota = menší kreativita, větší přesnost formátování
            maxOutputTokens: 8192, // Dostatek prostoru pro dlouhý strukturovaný výstup
        }
    });

    console.log('🤖 Generuji obsah pomocí modelu gemini-2.0-flash (Final Prompt)...');
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI obsah úspěšně vygenerován.');

    // 6. Návrat výsledku
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