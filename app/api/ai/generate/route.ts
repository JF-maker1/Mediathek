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

    // 4. Příprava Promptu
    const systemPrompt = `
Prosím z přiloženého přepisu videa v příloze vytvoř jednoduchý jednoúrovňový strukturovaný obsah tohoto videa, kde každá odrážka bude číslována svým pořadím ve formátu "X."
    `.trim();

    const fullPrompt = `${systemPrompt}\n\n--- PŘEPIS VIDEA ---\n${transcript}`;

    // 5. Inicializace a volání AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // POUŽÍVÁME MODEL Z VAŠEHO SEZNAMU (gemini-2.0-flash)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('🤖 Generuji obsah pomocí modelu gemini-2.0-flash...');
    
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