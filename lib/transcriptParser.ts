import { timeToSeconds } from './parser';

// Definice struktury jednoho segmentu přepisu
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Parsuje surový text přepisu do strukturovaného pole objektů.
 * Očekávaný vstupní formát: "[MM:SS] Text..." nebo "[HH:MM:SS] Text..."
 * * @param rawText Surový text z databáze (Transcript.content)
 * @param totalDuration (Volitelné) Celková délka videa v sekundách pro výpočet konce posledního segmentu.
 */
export function parseTranscript(rawText: string, totalDuration: number = 0): TranscriptSegment[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const segments: TranscriptSegment[] = [];
  
  // Regex vysvětlení:
  // \[?              -> Volitelná otevírací hranatá závorka (pro robustnost)
  // (\d{1,2}:\d{2}(?::\d{2})?) -> CAPTURE GROUP 1: Čas (MM:SS nebo HH:MM:SS)
  // \]?              -> Volitelná uzavírací hranatá závorka
  // \s+              -> Whitespace
  // ([\s\S]*?)       -> CAPTURE GROUP 2: Text segmentu (non-greedy, bere vše včetně nových řádků)
  // (?=\[?\d{1,2}:\d{2}|$)-> Lookahead: Zastav se před dalším časem nebo na konci stringu
  const regex = /\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([\s\S]*?)(?=\[?\d{1,2}:\d{2}|$)/g;

  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const timeStr = match[1];
    const textContent = match[2].trim();

    const startTime = timeToSeconds(timeStr);

    // Přidáme segment zatím bez koncového času (doplníme v dalším kroku)
    // Trik: 'end' dočasně nastavíme na startTime, opravíme níže
    segments.push({
      start: startTime,
      end: startTime, 
      text: textContent
    });
  }

  // Druhý průchod: Dopočítání časů 'end'
  for (let i = 0; i < segments.length; i++) {
    if (i < segments.length - 1) {
      // Konec aktuálního segmentu je začátek toho následujícího
      segments[i].end = segments[i + 1].start;
    } else {
      // Poslední segment
      if (totalDuration > segments[i].start) {
        // Pokud známe délku videa, použijeme ji
        segments[i].end = totalDuration;
      } else {
        // Fallback: Odhadneme délku podle délky textu (cca 15 znaků za sekundu pro čtení)
        // nebo minimálně 5 sekund
        const estimatedDuration = Math.max(5, segments[i].text.length / 15);
        segments[i].end = segments[i].start + estimatedDuration;
      }
    }
  }

  return segments;
}
