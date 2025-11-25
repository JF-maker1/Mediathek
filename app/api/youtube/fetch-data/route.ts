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

// --- POMOCNÉ FUNKCE ---

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

async function scrapeTranscriptUrlFromHtml(videoId: string): Promise<string | null> {
    try {
        log('Scraping HTML pro titulky...');
        const res = await fetchWithBrowserHeaders(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await res.text();

        // 1. Deep Search (JSON Object)
        const playerResponseRegex = /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/;
        const playerMatch = html.match(playerResponseRegex);
        let tracks = null;

        if (playerMatch && playerMatch[1]) {
            try {
                const playerResponse = JSON.parse(playerMatch[1]);
                tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            } catch (e) {}
        }

        // 2. CaptionTracks Regex
        if (!tracks) {
            const directRegex = /(?:\"|\\")captionTracks(?:\"|\\")\s*:\s*(\[.*?\])/;
            const directMatch = html.match(directRegex);
            if (directMatch && directMatch[1]) {
                try {
                    const cleanJson = directMatch[1].replace(/\\"/g, '"');
                    tracks = JSON.parse(cleanJson);
                } catch (e) {}
            }
        }

        if (Array.isArray(tracks) && tracks.length > 0) {
            log('Nalezeny stopy titulků v HTML (JSON/Regex).');
            let track = tracks.find((t: any) => t.languageCode === 'sk' || t.languageCode === 'cs');
            if (!track) track = tracks.find((t: any) => t.languageCode === 'en');
            if (!track) track = tracks[0];
            if (track && track.baseUrl) return track.baseUrl;
        }

        // 3. Dirty Regex (URL String)
        const dirtyRegex = /"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]*)"/g;
        let dirtyMatch;
        let bestUrl = null;
        let enUrl = null;
        let anyUrl = null;

        while ((dirtyMatch = dirtyRegex.exec(html)) !== null) {
            let url = dirtyMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            if (url.includes('lang=cs') || url.includes('lang=sk')) { bestUrl = url; break; }
            if (url.includes('lang=en')) enUrl = url;
            if (!anyUrl) anyUrl = url;
        }

        if (bestUrl || enUrl || anyUrl) {
            log('Nalezeno URL titulků přes Dirty Regex.');
            return bestUrl || enUrl || anyUrl;
        }
        
    } catch (e) {}
    return null;
}

async function fetchInvidiousTranscript(videoId: string): Promise<string | null> {
    const instances = [
        'https://inv.tux.pizza',
        'https://vid.puffyan.us',
        'https://invidious.drgns.space',
        'https://invidious.fdn.fr',
        'https://yt.artemislena.eu'
    ];
    for (const instance of instances) {
        try {
            log(`Zkouším Invidious: ${instance}...`);
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
                        const vttText = await capRes.text();
                        return parseVttToPlain(vttText);
                    }
                }
            }
        } catch (e) {}
    }
    return null;
}

// --- HLAVNÍ HANDLER ---

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

    log(`Start Ultimate Scraper pro ID: ${videoId}`);

    // --- FÁZE A: METADATA ---
    let title = '';
    let description = '';
    
    // 1. InnerTube WEB (Metadata)
    let yt = null;
    let ytInfo = null;
    try {
        yt = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true, lang: 'cs', location: 'CZ' });
        ytInfo = await yt.getInfo(videoId);
        title = ytInfo?.basic_info?.title || '';
        description = ytInfo?.basic_info?.short_description || '';
    } catch (e) {}

    // 2. HTML Scraping (Metadata Fallback)
    if (!title) {
        try {
            const res = await fetchWithBrowserHeaders(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await res.text();
            const tM = html.match(/<meta property="og:title" content="(.*?)"/);
            const dM = html.match(/<meta property="og:description" content="(.*?)"/);
            title = tM ? he.decode(tM[1]) : '';
            description = dM ? he.decode(dM[1]) : '';
        } catch (e) {}
    }

    log(`Metadata - Title: "${title.substring(0, 20)}..."`);

    // --- FÁZE B: TITULKY (Ultimate Sequence) ---
    let transcript = '';
    let strategyUsed = '';

    // POKUS 1: InnerTube WEB Client (Standard)
    if (!transcript && ytInfo) {
        try {
            log('Pokus 1: InnerTube (WEB Client)...');
            const tData = await ytInfo.getTranscript();
            if (tData?.transcript?.content?.body?.initial_segments) {
                transcript = tData.transcript.content.body.initial_segments.map((seg: any) => 
                    `${formatTime(parseInt(seg.start_ms || '0', 10))} ${seg.snippet?.text || ''}`
                ).join('\n');
                strategyUsed = 'InnerTube (WEB)';
            }
        } catch (e: any) { 
            log(`Pokus 1 selhal: ${e.message}`); 
        }
    }

    // POKUS 2: InnerTube Caption Tracks (Raw Data)
    if (!transcript && ytInfo) {
        try {
            log('Pokus 2: InnerTube Caption Tracks...');
            const captions = (ytInfo as any).captions?.caption_tracks;
            if (captions?.[0]?.base_url) {
                const txt = await fetchManualTranscript(captions[0].base_url);
                if (txt) { transcript = txt; strategyUsed = 'InnerTube (Raw XML)'; }
            }
        } catch (e) {}
    }

    // POKUS 3: HTML Scraping (Deep Search & Dirty Regex)
    if (!transcript) {
        log('Pokus 3: HTML Scraping (Deep & Dirty)...');
        const baseUrl = await scrapeTranscriptUrlFromHtml(videoId);
        if (baseUrl) {
            const txt = await fetchManualTranscript(baseUrl);
            if (txt) { transcript = txt; strategyUsed = 'HTML Scraping'; }
        } else {
            log('HTML Scraping nenašel URL.');
        }
    }

    // POKUS 4: Invidious Proxy (Poslední záchrana)
    if (!transcript) {
        log('Pokus 4: Invidious Proxy...');
        const txt = await fetchInvidiousTranscript(videoId);
        if (txt) { transcript = txt; strategyUsed = 'Invidious Proxy'; }
    }

    if (transcript) {
        log(`✅ ÚSPĚCH! Titulky staženy pomocí: ${strategyUsed}`);
    } else {
        log('❌ Všechny metody selhaly.');
    }

    return NextResponse.json({
      title,
      description,
      transcript,
      warning: !transcript ? 'Titulky se nepodařilo získat.' : null,
      debugLogs 
    });

  } catch (error: any) {
    log(`CRITICAL ERROR: ${error.message}`);
    return NextResponse.json({ message: 'Error', error: error.message, debugLogs }, { status: 500 });
  }
}