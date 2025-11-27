import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    // 1. Validace API klíče
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
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

    // 4. Adaptivní Prompt (Dle zadání Fáze 12)
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

    // 5. Inicializace AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Používáme gemini-2.0-flash (nebo 1.5-flash) s nastavením pro JSON
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash', // Pokud není dostupný, fallback na gemini-1.5-flash
        generationConfig: {
            temperature: 0.2, // Nízká teplota pro přesnost faktů
            responseMimeType: "application/json", // Vynucení JSON odpovědi
        }
    });

    console.log('🤖 Generuji SEO metadata pomocí Gemini (Adaptivní Prompt)...');
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI SEO vygenerováno.');

    // 6. Validace a parsování
    // I když vynucujeme JSON, pro jistotu ho zkusíme parsovat
    let jsonData;
    try {
        jsonData = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        return NextResponse.json({ message: 'AI nevrátila validní JSON.' }, { status: 500 });
    }

    return NextResponse.json({ 
      data: jsonData,
      message: 'Metadata úspěšně vygenerována.' 
    });

  } catch (error: any) {
    console.error('AI_GENERATE_SEO_ERROR', error);
    return NextResponse.json({ 
      message: 'Chyba při komunikaci s AI: ' + (error.message || 'Unknown error') 
    }, { status: 500 });
  }
}