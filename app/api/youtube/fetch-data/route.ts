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

// Pomocná funkce pro ruční stažení obsahu
async function fetchContent(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'SOCS=CAI'
        }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.text();
}

// Fallback 1: HTML Scraping
async function scrapeMetadataFromHtml(videoId: string) {
    try {
        log('Fallback (HTML): Stahuji stránku...');
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const html = await fetchContent(url);
        
        const titleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
        const descMatch = html.match(/<meta property="og:description" content="(.*?)"/);
        
        const title = titleMatch ? he.decode(titleMatch[1]) : '';
        const description = descMatch ? he.decode(descMatch[1]) : '';
        
        if (title) log(`HTML Scraping úspěšný! Title: "${title.substring(0, 20)}..."`);
        
        return { title, description };
    } catch (e: any) {
        log(`HTML Scraping selhal: ${e.message}`);
        return { title: '', description: '' };
    }
}

// Fallback 2: oEmbed API (Nejspolehlivější pro Title, ale bez Description)
async function fetchOEmbedMetadata(videoId: string) {
    try {
        log('Fallback (oEmbed): Volám oficiální API...');
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(url, {
             headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }
        });
        
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        
        log(`oEmbed úspěšný! Title: "${json.title}"`);
        return { title: json.title || '', description: '' };
    } catch (e: any) {
        log(`oEmbed selhal: ${e.message}`);
        return { title: '', description: '' };
    }
}

// Fallback 3: Invidious API (Záchrana pro Description)
async function fetchInvidiousMetadata(videoId: string) {
    // Seznam veřejných instancí (kdyby jedna nešla)
    const instances = [
        'https://inv.tux.pizza',
        'https://vid.puffyan.us',
        'https://invidious.drgns.space'
    ];

    for (const instance of instances) {
        try {
            log(`Fallback (Invidious): Zkouším ${instance}...`);
            const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
                 headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (res.ok) {
                const json = await res.json();
                const title = json.title || '';
                const description = json.description || '';
                log(`Invidious úspěšný! Získána data.`);
                return { title, description };
            }
        } catch (e) {
            log(`Instance ${instance} selhala.`);
        }
    }
    return { title: '', description: '' };
}

// Pomocná funkce pro ruční stažení XML titulků z baseUrl
async function fetchManualTranscript(baseUrl: string): Promise<string | null> {
    try {
        const res = await fetch(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
        const xml = await res.text();
        
        const regex = /<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        let match;
        const parts = [];
        
        while ((match = regex.exec(xml)) !== null) {
            const startSec = parseFloat(match[1]);
            const content = he.decode(match[2].replace(/<[^>]*>/g, '')); 
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
    
    // --- ZÍSKÁNÍ METADAT (5-stupňová raketa) ---
    let title = info.basic_info.title || '';
    let description = info.basic_info.short_description || '';

    // Stupeň 2: RAW data z API
    if (!title) {
        log('Basic info prázdné. Zkouším RAW...');
        try {
            // @ts-ignore
            const videoDetails = info.player_response?.videoDetails;
            if (videoDetails) {
                title = videoDetails.title || '';
                description = videoDetails.shortDescription || '';
                log(`RAW metadata OK.`);
            }
        } catch (e) {}
    }

    // Stupeň 3: HTML Scraping
    if (!title || !description) {
        const htmlData = await scrapeMetadataFromHtml(videoId);
        if (!title && htmlData.title) title = htmlData.title;
        if (!description && htmlData.description) description = htmlData.description;
    }

    // Stupeň 4: Invidious API (Nový hrdina pro Description)
    if (!description) {
        log('Popis stále chybí. Volám Invidious API...');
        const invData = await fetchInvidiousMetadata(videoId);
        if (invData.description) {
            description = invData.description;
            if (!title) title = invData.title;
        }
    }

    // Stupeň 5: oEmbed (Poslední záchrana pro Title)
    if (!title) {
        const oembedData = await fetchOEmbedMetadata(videoId);
        if (oembedData.title) title = oembedData.title;
    }
    // -------------------------------------------

    log(`Finální Metadata - Title: "${title.substring(0, 20)}..."`);
    if (description) log(`Popis získán (${description.length} znaků).`);
    else log(`! Popis se nepodařilo získat ani z Invidious.`);

    // 4. Získání přepisu (Transcript)
    let transcript = '';
    let warning = null;

    try {
        log('Pokus 1: info.getTranscript()...');
        const transcriptData = await info.getTranscript();
        
        if (transcriptData?.transcript?.content?.body?.initial_segments) {
            const segments = transcriptData.transcript.content.body.initial_segments;
            log(`Úspěch! Nalezeno ${segments.length} segmentů.`);
            
            transcript = segments.map((seg: any) => {
                const text = seg.snippet?.text || '';
                const startMs = parseInt(seg.start_ms || '0', 10);
                const timeStr = formatTime(startMs);
                return `${timeStr} ${text}`;
            }).join('\n');

            log(`Přepis zformátován (s časovými značkami).`);
        }
    } catch (e: any) {
        log(`Pokus 1 selhal: ${e.message}.`);
        
        // Fallback pro přepis (XML)
        log('Pokus 2: Hledám caption_tracks (Fallback)...');
        const captions = (info as any).captions?.caption_tracks;
        
        if (captions && Array.isArray(captions) && captions.length > 0) {
            const manualTrack = captions.find((t: any) => t.kind !== 'asr');
            const targetTrack = manualTrack || captions[0];
            
            if (targetTrack.base_url) {
                log('Stahuji XML z base_url...');
                const manualText = await fetchManualTranscript(targetTrack.base_url);
                if (manualText && manualText.length > 0) {
                    transcript = manualText;
                    log(`Úspěch (Fallback XML).`);
                    warning = `Použit fallback režim (XML).`;
                }
            }
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