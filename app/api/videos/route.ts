import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseStructuredContent } from '@/lib/parser';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

function extractYouTubeId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  try {
    // 1. Ověření sezení a role
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Zpracování požadavku
    const body = await request.json();
    // NOVÉ: Přijímáme i 'transcript'
    const { youtubeUrl, title, summary, structuredContent, transcript } = body;

    if (!youtubeUrl || !title || !summary) {
      return new NextResponse(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      return new NextResponse(JSON.stringify({ message: 'Invalid YouTube URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Parsování kapitol
    const parsedChapters = parseStructuredContent(structuredContent || '');

    // 4. Transakce (Video + Transcript + Kapitoly)
    const newVideo = await prisma.$transaction(async (tx) => {
      // A. Vytvoření videa
      const video = await tx.video.create({
        data: {
          youtubeId: youtubeId,
          title: title,
          summary: summary,
          authorId: session.user.id,
        },
      });

      // B. Uložení přepisu (pokud existuje) - NOVÉ
      if (transcript && transcript.trim() !== '') {
        await tx.transcript.create({
          data: {
            videoId: video.id,
            content: transcript,
            language: 'cs', // Defaultně předpokládáme češtinu, nebo dle detekce
          }
        });
      }

      // C. Vytvoření kapitol
      if (parsedChapters.length > 0) {
        const chapterData = parsedChapters.map((chapter, index) => ({
          ...chapter,
          order: index,
          videoId: video.id,
        }));

        await tx.chapter.createMany({
          data: chapterData,
        });
      }

      return video;
    });

    return new NextResponse(JSON.stringify(newVideo), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Neplatný formát řádku')) {
        return new NextResponse(JSON.stringify({ message: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if ((error as any).code === 'P2002') {
        return new NextResponse(JSON.stringify({ message: 'Video with this ID already exists' }), {
          status: 409,
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