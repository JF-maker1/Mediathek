import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseStructuredContent } from '@/lib/parser'; // Důležitý import z Fáze 6

const prisma = new PrismaClient();

/**
 * Pomocná funkce pro RBAC (Role-Based Access Control)
 * Ověří, zda má uživatel právo provést akci.
 */
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

  // Oprava z "Korekce plánu": Přidáno `include` pro FR5
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { chapters: { orderBy: { order: 'asc' } } },
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

  return { allowed: true, video: video };
}

/**
 * GET: Načte jedno video (pro editaci)
 * NFR1: Chráněno RBAC
 */
export async function GET(
  request: Request,
  // FINÁLNÍ OPRAVA: Samotný 'context' je objekt, 'params' uvnitř je Promise
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Nejprve musíme 'await'-ovat 'context.params'
    const params = await context.params;
    const { id } = params; 

    const { allowed, video, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    // Vracíme video (včetně kapitol), které bude použito k předvyplnění formuláře
    return NextResponse.json(video);
  } catch (error) {
    console.error('API_VIDEOS_GET_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * PUT: Aktualizuje video (Editace)
 * NFR1: Chráněno RBAC
 * NFR2: Používá transakci
 */
export async function PUT(
  request: Request,
  // FINÁLNÍ OPRAVA: Samotný 'context' je objekt, 'params' uvnitř je Promise
  context: { params: Promise<{ id:string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Nejprve musíme 'await'-ovat 'context.params'
    const params = await context.params;
    const { id } = params;

    // 1. Ověření oprávnění
    const { allowed, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    // 2. Zpracování těla požadavku
    const body = await request.json();
    const { title, summary, structuredContent } = body;

    // 3. Parsování obsahu
    const parsedChapters = parseStructuredContent(structuredContent || '');

    // 4. Atomická transakce (NFR2)
    const updatedVideo = await prisma.$transaction(async (tx) => {
      // Krok 4a: Aktualizace základních dat videa
      const video = await tx.video.update({
        where: { id: id },
        data: {
          title,
          summary,
          updatedAt: new Date(), // Explicitně nastavíme čas aktualizace
        },
      });

      // Krok 4b: Smazání starých kapitol
      await tx.chapter.deleteMany({
        where: { videoId: id },
      });

      // Krok 4c: Vytvoření nových kapitol
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

/**
 * DELETE: Smaže video
 * NFR1: Chráněno RBAC
 * NFR3: Mazání kapitol řešeno přes `onDelete: Cascade` ve schématu
 */
export async function DELETE(
  request: Request,
  // FINÁLNÍ OPRAVA: Samotný 'context' je objekt, 'params' uvnitř je Promise
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Nejprve musíme 'await'-ovat 'context.params'
    const params = await context.params;
    const { id } = params;

    // 1. Ověření oprávnění
    const { allowed, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    // 2. Smazání videa
    await prisma.video.delete({
      where: { id: id },
    });

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error('API_VIDEOS_DELETE_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}