import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findRelevantCollectionsForVideo } from '@/lib/core/librarian';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { videoId } = await request.json(); // Čekáme Legacy Video ID

    // 1. Najdeme CoreVideo ID
    const coreVideo = await prisma.coreVideo.findUnique({
      where: { legacyVideoId: videoId }
    });

    if (!coreVideo) {
      return NextResponse.json({ message: "Core video not found yet (processing?)" }, { status: 404 });
    }

    // 2. Zeptáme se Knihovníka
    // Threshold 0.0 znamená "ukaž všechno seřazené", abychom viděli, jestli to funguje, i když shoda bude malá
    const matches = await findRelevantCollectionsForVideo(coreVideo.id, 0.0);

    return NextResponse.json({ 
      coreVideoId: coreVideo.id,
      matches 
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}