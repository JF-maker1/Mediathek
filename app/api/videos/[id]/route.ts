import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseStructuredContent } from '@/lib/parser';

const prisma = new PrismaClient();

async function checkPermissions(
  videoId: string,
  session: any
): Promise<{ allowed: boolean; video: any; error?: NextResponse }> {
  if (!session) {
    return {
      allowed: false,
      video: null,
      error: new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  // ÚPRAVA: Načítáme i transcript a collections
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { 
      chapters: { orderBy: { order: 'asc' } },
      collections: true,
      transcript: true // NOVÉ: Načtení přepisu
    },
  });

  if (!video) {
    return {
      allowed: false,
      video: null,
      error: new NextResponse(JSON.stringify({ message: 'Video not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const isOwner = video.authorId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return {
      allowed: false,
      video: video,
      error: new NextResponse(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  // Zploštění struktury pro frontend (aby transcript byl přímo string, ne objekt)
  // Toto není nutné, pokud frontend počítá s objektem, ale pro jednoduchost:
  const videoResponse = {
    ...video,
    transcript: video.transcript?.content || null // Vrátíme jen text nebo null
  };

  return { allowed: true, video: videoResponse };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const params = await context.params;
    const { id } = params; 

    const { allowed, video, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    return NextResponse.json(video);
  } catch (error) {
    console.error('API_VIDEOS_GET_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id:string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const params = await context.params;
    const { id } = params;

    const { allowed, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    const body = await request.json();
    // NOVÉ: Načítáme i transcript
    const { title, summary, structuredContent, collectionIds, transcript } = body;

    const parsedChapters = parseStructuredContent(structuredContent || '');

    const updatedVideo = await prisma.$transaction(async (tx) => {
      // 1. Aktualizace videa
      const video = await tx.video.update({
        where: { id: id },
        data: {
          title,
          summary,
          updatedAt: new Date(),
          collections: collectionIds ? {
            set: collectionIds.map((cid: string) => ({ id: cid }))
          } : undefined,
        },
      });

      // 2. Aktualizace / Vytvoření přepisu (Upsert) - NOVÉ
      if (transcript !== undefined) {
        if (transcript.trim() === '') {
            // Pokud je prázdný, můžeme ho smazat, aby nezabíral místo? 
            // Pro teď raději aktualizujeme na prázdný string nebo necháme být.
            // Použijeme upsert, který zvládne obojí.
        }
        
        await tx.transcript.upsert({
          where: { videoId: id },
          create: {
            videoId: id,
            content: transcript,
          },
          update: {
            content: transcript,
          },
        });
      }

      // 3. Aktualizace kapitol
      await tx.chapter.deleteMany({
        where: { videoId: id },
      });

      if (parsedChapters.length > 0) {
        const chapterData = parsedChapters.map((chapter, index) => ({
          ...chapter,
          order: index,
          videoId: id,
        }));
        await tx.chapter.createMany({
          data: chapterData,
        });
      }

      return video;
    });

    return NextResponse.json(updatedVideo);
  } catch (error: any) {
    if (error.message.startsWith('Neplatný formát řádku')) {
      return new NextResponse(JSON.stringify({ message: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('API_VIDEOS_PUT_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const params = await context.params;
    const { id } = params;

    const { allowed, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    // Díky onDelete: Cascade v Prisma schématu se Transcript smaže automaticky
    await prisma.video.delete({
      where: { id: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('API_VIDEOS_DELETE_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}