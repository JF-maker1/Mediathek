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

    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

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

    const videosContext = collection.videos.map(v => `
- "${v.title}": ${v.seoSummary || v.summary} (${v.seoKeywords.join(', ')})
    `).join('\n');

    // Prompt pro "Zrcadlo" - AI analyzuje realitu
    const systemPrompt = `
Jsi nekompromisní editor. Tvým úkolem je analyzovat "Realitu" této sbírky videí a nastavit jí zrcadlo.

OBSAH SBÍRKY:
${videosContext}

INSTRUKCE:
1. Ignoruj původní záměr autora. Soustřeď se jen na to, co ve sbírce SKUTEČNĚ je.
2. Navrhni "title": Výstižný, krátký název (max 5 slov), který přesně popisuje obsah.
3. Navrhni "description": Syntéza obsahu. O čem to je? Pro koho to je?
4. Navrhni "keywords": 5-10 tagů.

VÝSTUP (JSON, Čeština):
{
  "title": "...",
  "description": "...",
  "keywords": ["..."]
}
    `.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
    });

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    
    let jsonData = JSON.parse(text.replace(/```json|```/g, ''));

    return NextResponse.json({ data: jsonData });

  } catch (error: any) {
    console.error('AI_ERROR', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}