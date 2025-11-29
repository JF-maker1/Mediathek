import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    // 1. Validace API klíče
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ message: 'API Key missing' }, { status: 500 });

    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // 2. Data z requestu
    const body = await request.json();
    const { videoContext, existingCollections } = body;

    if (!videoContext || !existingCollections) {
      return NextResponse.json({ message: 'Missing data' }, { status: 400 });
    }

    // 3. Prompt Engineering (Hybridní model)
    // Minimalizujeme data sbírek pro úsporu tokenů (jen ID, Název a max 100 znaků popisu)
    const collectionsMinified = existingCollections.map((c: any) => ({
      id: c.id,
      name: c.name,
      desc: c.description ? c.description.substring(0, 100) : ''
    }));

    const systemPrompt = `
Jsi expertní kurátor digitální knihovny. Tvým úkolem je analyzovat video a zařadit ho do kontextu sbírek.

VSTUPNÍ DATA:
1. VIDEO (Kontext):
   - Název: "${videoContext.title}"
   - Shrnutí: "${videoContext.summary}"
   - Klíčová slova: "${videoContext.keywords}"
   - AI Návrhy témat: "${videoContext.aiSuggestions}"

2. EXISTUJÍCÍ SBÍRKY (ID, Název, Popis):
   ${JSON.stringify(collectionsMinified)}

INSTRUKCE:
1. ÚKOL KLASIFIKACE (Pořádek): Projdi existující sbírky. Pokud video sémanticky zapadá do tématu sbírky, přidej její ID do pole "matches". Buď velkorysý - pokud to tam aspoň trochu patří, zařaď to.
2. ÚKOL EVOLUCE (Růst): Pokud video obsahuje silné, specifické téma, které není dobře pokryto žádnou existující sbírkou, navrhni 1 novou sbírku. Vygeneruj pro ni výstižný Název a Popis. Pokud video dobře zapadá do starých, nové nenavrhuj.

VÝSTUPNÍ FORMÁT (JSON):
{
  "matches": ["id_sbirky_1", "id_sbirky_2"],
  "new_proposals": [
    { "name": "Název Nové Sbírky", "description": "Popis nové sbírky..." }
  ]
}
Odpověz POUZE validním JSON objektem.
`.trim();

    // 4. Volání AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
    });

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    // 5. Zpracování
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(text);
    } catch (e) {
        // Fallback pro případné formátovací chyby
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
        jsonResponse = JSON.parse(cleanText);
    }

    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error('AI_MATCH_ERROR', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}