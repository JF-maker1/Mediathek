    import { NextResponse } from 'next/server';
    import { PrismaClient } from '@prisma/client';
    import { getServerSession } from 'next-auth/next';
    import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Import z vaší existující auth konfigurace

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
        const { youtubeUrl, title, summary } = body;

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

        // 4. Uložení do databáze
        const newVideo = await prisma.video.create({
          data: {
            youtubeId: youtubeId,
            title: title,
            summary: summary,
            authorId: session.user.id, // Propojení na přihlášeného admina
          },
        });

        return new NextResponse(JSON.stringify(newVideo), {
          status: 201, // 201 Created
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (error) {
        // Ošetření případné chyby (např. duplicitní youtubeId)
        if (error instanceof Error && (error as any).code === 'P2002') { // Prisma unique constraint violation
            return new NextResponse(JSON.stringify({ message: 'Video with this ID already exists' }), {
                status: 409, // Conflict
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.error('API_VIDEOS_POST_ERROR', error);
        return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
