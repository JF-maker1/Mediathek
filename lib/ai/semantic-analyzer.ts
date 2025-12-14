import { GoogleGenerativeAI } from "@google/generative-ai";

const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const allKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

function getRandomKey() {
  if (allKeys.length === 0) {
    console.error("[SemanticAnalyzer] CRITICAL: Žádné API klíče nenalezeny!");
    return "";
  }
  return allKeys[Math.floor(Math.random() * allKeys.length)];
}

function getGenAI() {
  const key = getRandomKey();
  return new GoogleGenerativeAI(key);
}

// === VEKTORY ===

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const cleanText = text.replace(/\n/g, " ").trim();
    if (!cleanText) return null;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent(cleanText);
    const embedding = result.embedding;
    
    return embedding.values;
  } catch (error: any) {
    console.error("Error generating embedding:", error.message);
    return null;
  }
}

// === SEGMENTACE (DCVA) ===

export interface AISegment {
  startTime: number;
  endTime: number;
  content: string;
  summary: string; 
  keyTakeaway: string;
  tags: string[];
}

export interface AnalysisResult {
  segments: AISegment[];
  mainDirection: string; // Hlavní směr videa
}

/**
 * DCVA: Deep Content Video Analysis
 * Analyzuje přepis a rozdělí ho na sémantické segmenty
 */
export async function segmentTranscript(transcript: string, duration: number): Promise<AISegment[]> {
  const prompt = `
Role: Jsi expertní video analytik (Deep Content Analyzer).
Tvým úkolem je analyzovat přepis videa, ignorovat marketingovou vatu a extrahovat faktickou informační strukturu.

VSTUPNÍ PŘEPIS:
"${transcript.substring(0, 30000)}" 
(Délka videa: ${Math.round(duration)}s)

INSTRUKCE PRO SEGMENTACI:
1. Rozděl text na logické sémantické bloky (podtémata). Ne podle času, ale podle změny myšlenky.
2. 'summary': Věcný, deskriptivní název tématu (např. "Mýtus o nutnosti portfolia").
3. 'keyTakeaway': Jedna věta shrnující hlavní fakt nebo radu v tomto segmentu.
4. 'tags': 2-3 klíčová slova pro tento segment.

VÝSTUPNÍ FORMÁT (JSON Array):
[
  {
    "startTime": 0,
    "endTime": 120,
    "summary": "Téma segmentu",
    "keyTakeaway": "Klíčová myšlenka...",
    "content": "Původní text segmentu...",
    "tags": ["Klíčové slovo"]
  }
]
`.trim();

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text) as AISegment[];

  } catch (error: any) {
    console.error("Error segmentation transcript:", error.message);
    return [{
      startTime: 0,
      endTime: duration,
      content: transcript,
      summary: "Celé video (Fallback)",
      keyTakeaway: "Analýza selhala.",
      tags: ["Fallback"]
    }];
  }
}

// === TAXONOMIE (FÁZE 19.5) ===

export interface TaxonomyResult {
  root: string;   // Hlavní obor (např. "Medicína", "Technologie")
  branch: string; // Podobor (např. "Kardiologie", "Web Development")
  leaf: string;   // Konkrétní téma (např. "Prevence infarktu", "React Framework")
}

/**
 * Analyzuje přepis a určí hierarchické zařazení videa.
 * Slouží k budování stromové struktury sbírek.
 */
export async function analyzeVideoTaxonomy(transcript: string, title: string): Promise<TaxonomyResult> {
  const prompt = `
Jsi hlavní architekt znalostní knihovny. Tvým úkolem je zařadit toto video do hierarchické taxonomie.
Ignoruj časovou osu, zaměř se na HLAVNÍ TÉMA a KONTEXT.

VIDEO: "${title}"
TEXT: "${transcript.substring(0, 15000)}"

INSTRUKCE:
Vytvoř taxonomický strom o 3 úrovních (Kořen -> Větev -> List).
1. ROOT (Hlavní obor): Velmi obecná kategorie (např. "Zdraví", "Technologie", "Byznys", "Věda", "Umění").
2. BRANCH (Podobor): Specifičtější disciplína v rámci oboru (např. "Výživa", "Webdesign", "Marketing", "Fyzika").
3. LEAF (Téma): Konkrétní zaměření videa (např. "Vitamíny", "CSS Triky", "SEO Strategie").

VÝSTUPNÍ FORMÁT (JSON):
{
  "root": "Název kořenové kategorie",
  "branch": "Název podkategorie",
  "leaf": "Název tématu"
}
`.trim();

  try {
    const genAI = getGenAI();
    // Používáme rychlý model, taxonomie nevyžaduje deep reasoning
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text) as TaxonomyResult;

  } catch (error: any) {
    console.error("Error analyzing taxonomy:", error.message);
    // Fallback: Pokud selže AI, vytvoříme generickou taxonomii
    return {
      root: "Nezařazené",
      branch: "Obecné",
      leaf: title.substring(0, 30)
    };
  }
}

// === METADATA SBÍREK ===

/**
 * Generuje metadata pro novou sbírku na základě prvního videa.
 * Pro zpětnou kompatibilitu - v nové verzi nahrazeno analyzeVideoTaxonomy.
 */
export async function generateCollectionMetadata(videoTitle: string, videoSummary: string) {
  const prompt = `
Jsi hlavní knihovník. Máš před sebou první video nové sbírky.
Navrhni NÁZEV a POPIS sbírky, která bude zastřešovat toto a podobná videa.
Název musí být obecný (kategorie), ne specifický pro toto jedno video.

VIDEO: "${videoTitle}"
OBSAH: "${videoSummary}"

VÝSTUP JSON: { "name": "...", "description": "..." }
  `.trim();

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(result.response.text());
  } catch (error) {
    return { name: "Nová sbírka", description: `Založeno na: ${videoTitle}` };
  }
}