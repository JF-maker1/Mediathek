import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ message: 'API Key missing' }, { status: 500 });

    // 1. Ověření sezení a role
    const session = await getServerSession(authOptions);

    // Definice rolí, které mají právo provádět tuto akci (Admin i Kurátor)
    const allowedRoles = ['ADMIN', 'KURATOR'];

    // Pokud uživatel nemá session, nemá roli, nebo jeho role není v seznamu povolených -> 403
    if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { collectionId } = body;

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
    });

    console.log(`[AI] Generuji SEO Syntézu pro sbírku: ${collection.name} (${collection.videos.length} videí)`);
    
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    
    console.log(`[AI] Raw response: ${text.substring(0, 100)}...`);

    // Čištění a parsování
    let cleanText = text.replace(/```json|```/g, '').trim();
    let jsonData;
    
    try {
        jsonData = JSON.parse(cleanText);
    } catch (e) {
        console.error('[AI] JSON Parse Error:', cleanText);
        return NextResponse.json({ message: 'AI vrátila neplatný JSON' }, { status: 500 });
    }

    // Bezpečnostní pojistka: Pokud by AI i přes zákaz vrátila pole, 
    // pokusíme se najít objekt, který vypadá jako shrnutí, nebo vezmeme první a upravíme ho v logice (zde jen bereme první).
    if (Array.isArray(jsonData)) {
        console.log('[AI] Varování: AI vrátila pole. Beru první prvek.');
        jsonData = jsonData[0];
    }

    const normalizedData = {
        title: jsonData.title || jsonData.name || jsonData.seoTitle || jsonData.nazev || '',
        description: jsonData.description || jsonData.summary || jsonData.seoDescription || jsonData.popis || '',
        keywords: jsonData.keywords || jsonData.tags || jsonData.seoKeywords || jsonData.klicova_slova || []
    };

    return NextResponse.json({ data: normalizedData });

  } catch (error: any) {
    console.error('AI_ERROR', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}