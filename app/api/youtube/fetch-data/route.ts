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

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
}

// Pomocná funkce pro stažení obsahu s hlavičkami prohlížeče
async function fetchWithBrowserHeaders(url: string) {
    return fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8', 
            'Cookie': 'SOCS=CAI; CONSENT=YES+cb.20210328-17-p0.en+FX+417'
        }
    });
}

// VTT Parser
function parseVttToPlain(vtt: string): string {
    const lines = vtt.split('\n');
    const result = [];
    for(let i=0; i<lines.length; i++) {
        const line = lines[i].trim();
        if(line.includes('-->')) {
            const startTime = line.split('-->')[0].trim();
            let text = '';
            let j = i + 1;
            while(j < lines.length && lines[j].trim() !== '' && !lines[j].includes('-->')) {
                text += lines[j].trim() + ' ';
                j++;
            }
            
            const timeParts = startTime.split(':');
            let timeStr = '';
            if(timeParts.length === 3) {
                const h = parseInt(timeParts[0]);
                const m = parseInt(timeParts[1]);
                const s = parseInt(timeParts[2].split('.')[0]);
                if(h > 0) timeStr = `[${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}]`;
                else timeStr = `[${m}:${s.toString().padStart(2,'0')}]`;
            }
            
            if(text) {
                const cleanText = text.replace(/<[^>]*>/g, '');
                result.push(`${timeStr} ${he.decode(cleanText).trim()}`);
            }
            i = j - 1;
        }
    }
    return result.join('\n');
}

// --- FALLBACKS ---

async function scrapeMetadataFromHtml(videoId: string) {
    try {
        log('Fallback (HTML/Googlebot): Stahuji stránku...');
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });
        if (!res.ok) throw new Error(`HTML fetch status ${res.status}`);
        const html = await res.text();
        const titleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
        const descMatch = html.match(/<meta property="og:description" content="(.*?)"/);
        return { 
            title: titleMatch ? he.decode(titleMatch[1]) : '', 
            description: descMatch ? he.decode(descMatch[1]) : '' 
        };
    } catch (e: any) {
        log(`HTML Scraping selhal: ${e.message}`);
        return { title: '', description: '' };
    }
}

async function fetchOEmbedMetadata(videoId: string) {
    try {
        log('Fallback (oEmbed): Volám oficiální API...');
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
             headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        return { title: json.title || '', description: '' };
    } catch (e: any) {
        log(`oEmbed selhal: ${e.message}`);
        return { title: '', description: '' };
    }
}

async function fetchInvidiousMetadata(videoId: string) {
    const instances = ['https://inv.tux.pizza', 'https://vid.puffyan.us'];
    for (const instance of instances) {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
                 headers: { 'User-Agent': 'Mozilla/5.0' },
                 signal: controller.signal
            });
            if (res.ok) {
                const json = await res.json();
                return { title: json.title || '', description: json.description || '' };
            }
        } catch (e) {}
    }
    return { title: '', description: '' };
}

async function fetchInvidiousTranscript(videoId: string): Promise<string | null> {
    const instances = [
        'https://inv.tux.pizza',
        'https://vid.puffyan.us',
        'https://invidious.drgns.space',
        'https://invidious.fdn.fr'
    ];
    for (const instance of instances) {
        try {
            log(`Fallback (Invidious): Zkouším ${instance}...`);
            const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
                const json = await res.json();
                const captions = json.captions;
                if (Array.isArray(captions) && captions.length > 0) {
                    let track = captions.find((t: any) => t.languageCode === 'sk' || t.languageCode === 'cs');
                    if (!track) track = captions.find((t: any) => t.languageCode === 'en');
                    if (!track) track = captions[0]; 
                    const capRes = await fetch(instance + track.url);
                    if (capRes.ok) {
                        return parseVttToPlain(await capRes.text());
                    }
                }
            }
        } catch (e) {}
    }
    return null;
}

async function fetchManualTranscript(baseUrl: string): Promise<string | null> {
    try {
        const res = await fetchWithBrowserHeaders(baseUrl);
        const xml = await res.text();
        const regex = /<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        let match;
        const parts = [];
        while ((match = regex.exec(xml)) !== null) {
            const startSec = parseFloat(match[1]);
            const content = he.decode(match[2].replace(/<[^>]*>/g, '')); 
            if (content.trim()) {
                parts.push(`${formatTime(startSec * 1000)} ${content}`);
            }
        }
        if (parts.length > 0) return parts.join('\n');
    } catch (e) {
        console.error('Manual fetch error:', e);
    }
    return null;
}

// VYLEPŠENÝ SCRAPER (Deep Search + Dirty Regex)
async function scrapeTranscriptUrlFromHtml(videoId: string): Promise<string | null> {
    try {
        log('Fallback (HTML/Captions): Hledám adresu titulků (Deep Search)...');
        const res = await fetchWithBrowserHeaders(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await res.text();

        // 1. Pokus: Regex přímo na URL (nejhrubší síla)
        // Hledáme jakýkoliv odkaz na API timedtext, který je v uvozovkách
        // Vzor: "baseUrl":"https://www.youtube.com/api/timedtext?..."
        const dirtyRegex = /"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]*)"/g;
        let dirtyMatch;
        
        // Projdeme všechny nalezené URL a zkusíme najít českou/slovenskou
        let bestUrl = null;
        let enUrl = null;
        let anyUrl = null;

        while ((dirtyMatch = dirtyRegex.exec(html)) !== null) {
            // Odstraníme escape znaky (\u0026 -> &)
            let url = dirtyMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            
            if (url.includes('lang=cs') || url.includes('lang=sk')) {
                bestUrl = url;
                break; // Našli jsme ideál
            }
            if (url.includes('lang=en')) enUrl = url;
            if (!anyUrl) anyUrl = url;
        }

        if (bestUrl || enUrl || anyUrl) {
            const finalUrl = bestUrl || enUrl || anyUrl;
            log(`Dirty Regex našel URL titulků!`);
            return finalUrl;
        }

        // 2. Pokus: Strukturované hledání (CaptionTracks)
        const directRegex = /(?:\"|\\")captionTracks(?:\"|\\")\s*:\s*(\[.*?\])/;
        const directMatch = html.match(directRegex);
        if (directMatch && directMatch[1]) {
            try {
                const cleanJson = directMatch[1].replace(/\\"/g, '"');
                const tracks = JSON.parse(cleanJson);
                if (Array.isArray(tracks) && tracks.length > 0) {
                    let track = tracks.find((t: any) => t.languageCode === 'sk' || t.languageCode === 'cs');
                    if (!track) track = tracks.find((t: any) => t.languageCode === 'en');
                    if (!track) track = tracks[0];
                    if (track && track.baseUrl) return track.baseUrl;
                }
            } catch (e) {}
        }
        
    } catch (e: any) {
        log(`HTML Caption Scraping selhal: ${e.message}`);
    }
    return null;
}

export async function GET(request: Request) {
  debugLogs = [];
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ message: 'Missing URL' }, { status: 400 });

    const videoId = extractYouTubeId(url);
    if (!videoId) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    log(`Start request for Video ID: ${videoId}`);

    // --- KROK 1: InnerTube (WEB Client - Oprava pro Lokál) ---
    log('Inicializuji youtubei.js (Klient: DEFAULT/WEB)...');
    let ytInfo = null;
    try {
        const yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true,
            lang: 'cs',
            location: 'CZ'
            // Odstraněno client_type: 'ANDROID' -> Způsobovalo pády na lokále
        });
        log('Získávám Info o videu (GetInfo)...');
        ytInfo = await yt.getInfo(videoId);
    } catch (e: any) {
        log(`InnerTube Init/GetInfo chyba: ${e.message}`);
    }
    
    // --- METADATA ---
    let title = ytInfo?.basic_info?.title || '';
    let description = ytInfo?.basic_info?.short_description || '';

    if (!title) {
        try {
            // @ts-ignore
            const videoDetails = ytInfo?.player_response?.videoDetails;
            if (videoDetails) {
                title = videoDetails.title || '';
                description = videoDetails.shortDescription || '';
            }
        } catch (e) {}
    }
    if (!title || !description) {
        const htmlData = await scrapeMetadataFromHtml(videoId);
        if (!title && htmlData.title) title = htmlData.title;
        if (!description && htmlData.description) description = htmlData.description;
    }
    if (!description) {
        const invData = await fetchInvidiousMetadata(videoId);
        if (invData.description) description = invData.description;
        if (!title && invData.title) title = invData.title;
    }
    if (!title) {
        const oembedData = await fetchOEmbedMetadata(videoId);
        if (oembedData.title) title = oembedData.title;
    }

    log(`Finální Metadata - Title: "${title.substring(0, 20)}..."`);
    
    // --- TRANSKRIPT ---
    let transcript = '';
    let warning = null;

    // Pokus 1: InnerTube API
    if (ytInfo) {
        try {
            log('Pokus 1: info.getTranscript()...');
            const transcriptData = await ytInfo.getTranscript();
            if (transcriptData?.transcript?.content?.body?.initial_segments) {
                const segments = transcriptData.transcript.content.body.initial_segments;
                log(`Úspěch! Nalezeno ${segments.length} segmentů.`);
                transcript = segments.map((seg: any) => {
                    const text = seg.snippet?.text || '';
                    const startMs = parseInt(seg.start_ms || '0', 10);
                    return `${formatTime(startMs)} ${text}`;
                }).join('\n');
            }
        } catch (e: any) {
            log(`Pokus 1 selhal: ${e.message}`);
        }
    }

    // Pokus 2: InnerTube Caption Tracks
    if (!transcript && ytInfo) {
        try {
            log('Pokus 2: InnerTube caption_tracks...');
            const captions = (ytInfo as any).captions?.caption_tracks;
            if (captions && captions.length > 0) {
                const targetTrack = captions[0];
                if (targetTrack.base_url) {
                    const manualText = await fetchManualTranscript(targetTrack.base_url);
                    if (manualText) {
                        transcript = manualText;
                        log(`Úspěch (Fallback XML).`);
                        warning = `Použit fallback režim (XML).`;
                    }
                }
            }
        } catch (e) {}
    }

    // Pokus 3: HTML Scraping (Deep + Dirty Regex)
    if (!transcript) {
        log('Pokus 3: HTML Scraping (Bypass Vercel)...');
        const baseUrl = await scrapeTranscriptUrlFromHtml(videoId);
        if (baseUrl) {
            log('Stahuji XML z nalezené HTML adresy...');
            const manualText = await fetchManualTranscript(baseUrl);
            if (manualText) {
                transcript = manualText;
                log('Úspěch (HTML Scraping)!');
                warning = 'Použit silný fallback (HTML Scraping).';
            }
        } else {
            log('HTML Scraping nenašel stopu titulků.');
        }
    }

    // Pokus 4: Invidious API
    if (!transcript) {
        log('Pokus 4: Invidious Proxy...');
        const invText = await fetchInvidiousTranscript(videoId);
        if (invText) {
            transcript = invText;
            log('Úspěch (Invidious API)!');
            warning = 'Použit Invidious Proxy.';
        }
    }

    if (!transcript) {
        if (!warning) warning = 'Titulky se nepodařilo získat (ani přes fallbacky).';
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