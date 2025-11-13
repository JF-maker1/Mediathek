import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseStructuredContent } from '@/lib/parser'; // 1. IMPORT PARSERU

const prisma = new PrismaClient();

/**
 * Pomocná funkce pro extrakci YouTube ID z různých formátů URL
 */
function extractYouTubeId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  try {
    // 1. Ověření sezení a role na serveru
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Zpracování požadavku
    const body = await request.json();
    const { youtubeUrl, title, summary, structuredContent } = body; // 2. PŘIDÁNÍ `structuredContent`

    if (!youtubeUrl || !title || !summary) {
      return new NextResponse(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Extrakce YouTube ID
    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      return new NextResponse(JSON.stringify({ message: 'Invalid YouTube URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. PARSOVÁNÍ KAPITOL (PŘED TRANSAKCÍ)
    // Musíme to provést zde, aby případná chyba parseru 
    // zabránila spuštění databázové transakce.
    const parsedChapters = parseStructuredContent(structuredContent || '');

    // 4. POUŽITÍ DATABÁZOVÉ TRANSAKCE
    // Tím zajistíme, že se video a jeho kapitoly uloží
    // buď obojí, nebo nic.
    const newVideo = await prisma.$transaction(async (tx) => {
      // 4a. Vytvoření videa
      const video = await tx.video.create({
        data: {
          youtubeId: youtubeId,
          title: title,
          summary: summary,
          authorId: session.user.id,
        },
      });

      // 4b. Vytvoření kapitol (pokud nějaké jsou)
      if (parsedChapters.length > 0) {
        const chapterData = parsedChapters.map((chapter, index) => ({
          ...chapter,
          order: index, // Přidání 'order'
          videoId: video.id, // Propojení s právě vytvořeným videem
        }));

        await tx.chapter.createMany({
          data: chapterData,
        });
      }

      return video;
    });

    return new NextResponse(JSON.stringify(newVideo), {
      status: 201, // 201 Created
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // 5. OŠETŘENÍ CHYB PARSERU A DB
    if (error instanceof Error) {
      if (error.message.startsWith('Neplatný formát řádku')) {
        // Chyba z našeho parseru
        return new NextResponse(JSON.stringify({ message: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if ((error as any).code === 'P2002') {
        // Prisma unique constraint violation
        return new NextResponse(JSON.stringify({ message: 'Video with this ID already exists' }), {
          status: 409, // Conflict
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    console.error('API_VIDEOS_POST_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}