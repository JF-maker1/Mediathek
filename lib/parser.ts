// Definujeme typ pro návratovou hodnotu
export interface ParsedChapter {
  text: string;
  startTime: number;
  endTime: number | null;
  level: number;
}

/**
 * Převede časový řetězec (MM:SS nebo HH:MM:SS) na sekundy.
 * Nyní exportováno pro použití v transcriptParser.ts (Fáze 13).
 */
export function timeToSeconds(timeStr: string): number {
  // Odstraníme případné závorky nebo whitespace, pokud by tam byly (pro robustnost)
  const cleanTime = timeStr.replace(/[\[\]\(\)]/g, '').trim();
  
  const parts = cleanTime.split(':').map(Number);
  
  // Formát MM:SS
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  // Formát HH:MM:SS
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  // Fallback nebo sekundy
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  
  return 0;
}

/**
 * Parsování strukturovaného obsahu z formátu MTF-H [cite: 185]
 */
export function parseStructuredContent(
  rawText: string
): Omit<ParsedChapter, 'order'>[] {
  const lines = rawText.split('\n').filter((line) => line.trim() !== ''); // Ignoruj prázdné řádky [cite: 218]
  const chapters: Omit<ParsedChapter, 'order'>[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 1. Extrakce časové značky na konci [cite: 201]
    const timeRegex = /\((\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?\)$/;
    const timeMatch = trimmedLine.match(timeRegex);

    if (!timeMatch) {
      throw new Error(
        `Neplatný formát řádku: Chybí časová značka (MM:SS) na konci. Řádek: "${trimmedLine}"`
      );
    }

    const startTime = timeToSeconds(timeMatch[1]);
    const endTime = timeMatch[2] ? timeToSeconds(timeMatch[2]) : null;

    // 2. Extrakce základu (vše před časem) [cite: 202]
    const baseText = trimmedLine.substring(0, timeMatch.index).trim();

    // 3. Extrakce číslování a výpočet úrovně [cite: 203]
    const numberingRegex = /^(\d+(?:\.\d+)*)\.?\s+/;
    const numberingMatch = baseText.match(numberingRegex);

    if (!numberingMatch) {
      throw new Error(
        `Neplatný formát řádku: Chybí hierarchické číslování (např. 1.1.) na začátku. Řádek: "${trimmedLine}"`
      );
    }

    // 4. Výpočet úrovně [cite: 204]
    // "1." -> level 0
    // "1.1." -> level 1
    // "1.1.1." -> level 2
    const level = numberingMatch[1].split('.').length - 1;

    // 5. Uložení textu (ZMĚNA: Ukládáme celý původní řádek) [cite: 205]
    const text = trimmedLine; // Celý řádek včetně časové značky

    chapters.push({ text, startTime, endTime, level });
  }

  return chapters;
}