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

    // 4. Příprava Finálního Promptu (Upraveno pro opravu pozice času)
    const systemPrompt = `
Proveď detailní hierarchický rozklad (hierarchický strom) přiloženého přepisu videa. Cílem je získat přehled o obsahu videa.

**STRUKTURA A FORMÁT (Dodržuj přesně):**

1.  **Hierarchie:** Použij číslovaný seznam (0., 1., 1.1., 1.1.1.). Max hloubka 4 úrovně.
2.  **Obsah řádku:** Každý řádek musí následovat PŘESNĚ tento vzor:
    \`ČÍSLO. Název Tématu [Stručný popis obsahu] (ČAS-ČAS)\`

3.  **Pravidla pro pozici elementů:**
    * **ZAČÁTEK:** Vždy začni číslem (např. "1.1.").
    * **PROSTŘEDEK:** Následuje název a poté popis v hranatých závorkách [ ].
    * **KONEC:** Časová značka v kulatých závorkách (MM:SS-MM:SS) musí být **absolutně posledním textem na řádku**. Nikdy ji nedávej doprostřed!

4.  **Příklad správného formátu:**
    * *Špatně:* 1.1. Úvod (00:00-01:00) [O čem to je]
    * *Správně:* 1.1. Úvod [O čem to je] (00:00-01:00)

5.  **Jazyk:** Čeština.
6.  **Formátování:** Nepoužívej tučné písmo (**), markdown ani odrážky. Jen čistý text.

**Přiložený Přepis Videa:**
    `.trim();

    const fullPrompt = `${systemPrompt}\n${transcript}`;

    // 5. Inicializace a volání AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Konfigurace modelu
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
            temperature: 0.1,      // Snížena teplota pro maximální poslušnost formátu
            maxOutputTokens: 8192,
        }
    });

    console.log('🤖 Generuji obsah pomocí modelu gemini-2.0-flash (Fix Time Position)...');
    
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