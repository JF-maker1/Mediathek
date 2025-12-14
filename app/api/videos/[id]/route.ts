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
      transcript: true,
      coreVideo: true // <--- PŘIDÁNO: Načítáme i Core data (taxonomii)
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

    console.log(`[VIDEO GET] Načítám video ID: ${id}`);

    const { allowed, video, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    console.log(`[VIDEO GET] ✅ Video nalezeno: ${video.title}`);
    return NextResponse.json(video);
  } catch (error) {
    console.error('[VIDEO GET] ❌ Chyba:', error);
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

    console.log(`[VIDEO UPDATE] Startuji aktualizaci pro video ID: ${id}`);

    const { allowed, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    const body = await request.json();
    
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
      
      // --- SMART LOGIKA: SANITIZACE SBÍREK ---
      // Před pokusem o update ověříme, která ID skutečně existují v databázi.
      // Tím předejdeme chybě "Expected X records, found Y" (P2025).
      let validCollectionIds: string[] = [];
      
      if (collectionIds && Array.isArray(collectionIds) && collectionIds.length > 0) {
        console.log(`[VIDEO UPDATE] Kontroluji existenci ${collectionIds.length} sbírek...`);
        
        const existingCollections = await tx.collection.findMany({
          where: {
            id: { in: collectionIds }
          },
          select: { id: true }
        });
        
        validCollectionIds = existingCollections.map(c => c.id);
        
        // Logování pro debug
        if (validCollectionIds.length !== collectionIds.length) {
          const missingCount = collectionIds.length - validCollectionIds.length;
          console.warn(`[VIDEO UPDATE] ⚠️ Varování: ${missingCount} sbírek neexistuje, budou přeskočeny.`);
          console.warn(`[VIDEO UPDATE] Požadováno: ${collectionIds.length}, Nalezeno: ${validCollectionIds.length}`);
        } else {
          console.log(`[VIDEO UPDATE] ✅ Všechny sbírky validní (${validCollectionIds.length})`);
        }
      }
      // ----------------------------------------

      // 1. Aktualizace videa
      console.log(`[VIDEO UPDATE] Aktualizuji základní metadata...`);
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
          collections: {
            // Použijeme POUZE existující ID (recyklace)
            set: validCollectionIds.map((cid) => ({ id: cid }))
          },
        },
      });

      // 2. Aktualizace Přepisu (Smart Update/Create)
      if (transcript !== undefined) {
        console.log(`[VIDEO UPDATE] Zpracovávám přepis...`);
        
        // --- SMART LOGIKA: KONTROLA EXISTENCE PŘEPISU ---
        const existingTranscript = await tx.transcript.findUnique({
          where: { videoId: id }
        });

        if (existingTranscript) {
          console.log(`[VIDEO UPDATE] Aktualizuji existující přepis (Recyklace)`);
          await tx.transcript.update({
            where: { videoId: id },
            data: {
              content: transcript,
            },
          });
        } else {
          console.log(`[VIDEO UPDATE] Vytvářím nový přepis`);
          await tx.transcript.create({
            data: {
              videoId: id,
              content: transcript,
            },
          });
        }
        // ------------------------------------------------
      }

      // 3. Aktualizace kapitol (Replace Strategy)
      console.log(`[VIDEO UPDATE] Aktualizuji kapitoly...`);
      
      // Nejdříve smažeme staré
      const deletedChapters = await tx.chapter.deleteMany({
        where: { videoId: id },
      });
      console.log(`[VIDEO UPDATE] Smazáno ${deletedChapters.count} starých kapitol`);

      // Pak vytvoříme nové
      if (parsedChapters.length > 0) {
        const chapterData = parsedChapters.map((chapter, index) => ({
          ...chapter,
          order: index,
          videoId: id,
        }));
        
        await tx.chapter.createMany({
          data: chapterData,
        });
        console.log(`[VIDEO UPDATE] Vytvořeno ${parsedChapters.length} nových kapitol`);
      } else {
        console.log(`[VIDEO UPDATE] Žádné nové kapitoly k vytvoření`);
      }

      return video;
    });

    console.log(`[VIDEO UPDATE] ✅ Hotovo pro video: ${updatedVideo.title}`);
    return NextResponse.json(updatedVideo);
    
  } catch (error: any) {
    // Specifické error handling
    if (error.message.startsWith('Neplatný formát řádku')) {
      console.error('[VIDEO UPDATE] ❌ Chyba parsování:', error.message);
      return new NextResponse(JSON.stringify({ message: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.error('[VIDEO UPDATE] ❌ Chyba:', error);
    console.error('[VIDEO UPDATE] Stack:', error.stack);
    
    // Vracíme error i s detailem pro snazší debug na klientovi
    return new NextResponse(
      JSON.stringify({ 
        message: 'Internal Server Error', 
        detail: error.message,
        code: error.code 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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

    console.log(`[VIDEO DELETE] Startuji mazání pro video ID: ${id}`);

    const { allowed, video, error } = await checkPermissions(id, session);
    if (!allowed) return error;

    await prisma.video.delete({
      where: { id: id },
    });

    console.log(`[VIDEO DELETE] ✅ Video smazáno: ${video.title}`);
    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    console.error('[VIDEO DELETE] ❌ Chyba:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}