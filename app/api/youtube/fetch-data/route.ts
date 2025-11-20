import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Innertube, UniversalCache } from 'youtubei.js';
import he from 'he';

// --- LOGOVACÍ ÚLOŽIŠTĚ ---
let debugLogs: string[] = [];
function log(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
  debugLogs.push(`[${timestamp}] ${msg}`);
}

function extractYouTubeId(url: string): string | null {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Pomocná funkce pro formátování času (ms -> MM:SS)
function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
}

// Pomocná funkce pro ruční stažení XML titulků z baseUrl (Fallback)
async function fetchManualTranscript(baseUrl: string): Promise<string | null> {
    try {
        const res = await fetch(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
        const xml = await res.text();
        
        // Jednoduchý regex parser pro XML s časovými značkami
        // Hledá: <text start="123.45" ...>Obsah</text>
        const regex = /<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        let match;
        const parts = [];
        
        while ((match = regex.exec(xml)) !== null) {
            const startSec = parseFloat(match[1]);
            const content = he.decode(match[2].replace(/<[^>]*>/g, '')); // Dekódovat a odstranit vnořené tagy
            
            if (content.trim()) {
                const timeStr = formatTime(startSec * 1000);
                parts.push(`${timeStr} ${content}`);
            }
        }
        
        if (parts.length > 0) {
            return parts.join('\n');
        }
        
    } catch (e) {
        console.error('Manual fetch error:', e);
    }
    return null;
}

export async function GET(request: Request) {
  debugLogs = [];
  
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. URL
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    log(`Start request for URL: ${url}`);

    if (!url) return NextResponse.json({ message: 'Missing URL' }, { status: 400 });

    const videoId = extractYouTubeId(url);
    log(`Extracted Video ID: ${videoId}`);
    
    if (!videoId) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    // 3. Inicializace InnerTube
    log('Inicializuji youtubei.js (InnerTube)...');
    const yt = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        lang: 'en',
        location: 'US' 
    });

    log('Získávám Info o videu (GetInfo)...');
    const info = await yt.getInfo(videoId);
    
    const title = info.basic_info.title || '';
    const description = info.basic_info.short_description || '';
    log(`Metadata získána. Title: "${title.substring(0, 20)}..."`);

    // 4. Získání přepisu (Transcript)
    let transcript = '';
    let warning = null;

    // A. Pokus o Moderní API (getTranscript)
    try {
        log('Pokus 1: info.getTranscript()...');
        const transcriptData = await info.getTranscript();
        
        if (transcriptData?.transcript?.content?.body?.initial_segments) {
            const segments = transcriptData.transcript.content.body.initial_segments;
            log(`Úspěch! Nalezeno ${segments.length} segmentů.`);
            
            // ZMĚNA: Formátování s časovými značkami
            transcript = segments.map((seg: any) => {
                const text = seg.snippet?.text || '';
                // start_ms je v milisekundách, ale jako string
                const startMs = parseInt(seg.start_ms || '0', 10);
                const timeStr = formatTime(startMs);
                
                return `${timeStr} ${text}`;
            }).join('\n'); // Spojíme novým řádkem pro lepší čitelnost

            log(`Přepis zformátován (s časovými značkami).`);
        }
    } catch (e: any) {
        log(`Pokus 1 selhal: ${e.message}.`);
        
        // B. Pokus o Fallback (Ruční stažení přes baseUrl z metadat)
        log('Pokus 2: Hledám caption_tracks v metadatech (Fallback)...');
        
        // TypeScript workaround
        const captions = (info as any).captions?.caption_tracks;
        
        if (captions && Array.isArray(captions) && captions.length > 0) {
            log(`Nalezeno ${captions.length} stop v metadatech.`);
            
            const manualTrack = captions.find((t: any) => t.kind !== 'asr');
            const targetTrack = manualTrack || captions[0];
            
            log(`Vybírám stopu: ${targetTrack.name?.text} (${targetTrack.language_code})`);
            
            if (targetTrack.base_url) {
                log('Stahuji XML z base_url...');
                const manualText = await fetchManualTranscript(targetTrack.base_url);
                if (manualText && manualText.length > 0) {
                    transcript = manualText;
                    log(`Úspěch! Staženo ${transcript.length} znaků přes Fallback.`);
                    warning = `Použit fallback režim (XML).`;
                } else {
                    log('Fallback stažení vrátilo prázdná data.');
                }
            } else {
                log('Stopa nemá base_url.');
            }
        } else {
            log('Metadata neobsahují žádné caption_tracks.');
        }
    }

    if (!transcript) {
        if (!warning) warning = 'Titulky se nepodařilo získat.';
        log('Všechny pokusy selhaly.');
    }

    return NextResponse.json({
      title,
      description,
      transcript,
      warning,
      debugLogs 
    });

  } catch (error: any) {
    log(`CRITICAL ERROR: ${error.message}`);
    return NextResponse.json({ 
        message: 'Internal Server Error', 
        error: error.message,
        debugLogs 
    }, { status: 500 });
  }
}