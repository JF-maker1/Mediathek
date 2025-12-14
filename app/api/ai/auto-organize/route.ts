import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { autoCategorizeVideo } from '@/lib/core/librarian';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { videoId } = await request.json(); // Legacy ID

    // 1. Najdeme Core ID
    const coreVideo = await prisma.coreVideo.findUnique({
      where: { legacyVideoId: videoId }
    });

    if (!coreVideo) {
      return NextResponse.json({ message: "Core video not ready" }, { status: 404 });
    }

    if (coreVideo.status !== 'COMPLETED') {
      return NextResponse.json({ message: "Video analysis not finished yet" }, { status: 400 });
    }

    // 2. Spustíme automatizaci
    const result = await autoCategorizeVideo(coreVideo.id);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}