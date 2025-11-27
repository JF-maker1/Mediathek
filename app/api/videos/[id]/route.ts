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

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { 
      chapters: { orderBy: { order: 'asc' } },
      collections: true,
      transcript: true 
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

  const videoResponse = {
    ...video,
    transcript: video.transcript?.content || null 
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
    
    // --- ÚPRAVA PRO FÁZI 12 ---
    // Přidali jsme nová SEO pole do destrukturalizace
    const { 
      title, 
      summary, 
      structuredContent, 
      collectionIds, 
      transcript,
      seoSummary,
      seoKeywords,
      practicalTips,
      aiSuggestions
    } = body;

    const parsedChapters = parseStructuredContent(structuredContent || '');

    const updatedVideo = await prisma.$transaction(async (tx) => {
      // 1. Aktualizace videa + NOVÁ SEO POLE
      const video = await tx.video.update({
        where: { id: id },
        data: {
          title,
          summary,
          // Nová pole Fáze 12
          seoSummary,
          seoKeywords: seoKeywords || [],
          practicalTips: practicalTips || [],
          aiSuggestions: aiSuggestions || [],
          // --------------
          updatedAt: new Date(),
          collections: collectionIds ? {
            set: collectionIds.map((cid: string) => ({ id: cid }))
          } : undefined,
        },
      });

      // 2. Aktualizace Přepisu
      if (transcript !== undefined) {
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