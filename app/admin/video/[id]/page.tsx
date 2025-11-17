import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
// 1. IMPORT WRAPPERU
import VideoDetailClientWrapper from '@/components/VideoDetailClientWrapper';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

interface VideoDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  // Await params (Next.js 15+)
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    notFound();
  }

  // 2. Načtení dat (včetně kapitol)
  const video = await prisma.video.findUnique({
    where: { id: id },
    include: {
      chapters: {
        orderBy: {
          order: 'asc', // Seřadíme kapitoly dle 'order'
        },
      },
    },
  });

  if (!video) {
    notFound();
  }

  return (
    // ZMĚNA: Zvětšena šířka stránky na max-w-7xl/max-w-screen-2xl/max-w-[1366px] pro nový layout
    <main className="max-w-[1366px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Název Videa (zůstává nahoře) */}
      <h1 className="text-3xl font-bold mb-5">{video.title}</h1>

      {/* 3. POUŽITÍ KLIENTSKÉHO WRAPPERU */}
      {/* ZMĚNA: Předáváme nyní i 'summary' dovnitř wrapperu */}
      <VideoDetailClientWrapper
        youtubeId={video.youtubeId}
        chapters={video.chapters}
        summary={video.summary}
      />

      {/* ZMĚNA: Původní <div className="mt-8"> se shrnutím
          byl odsud odstraněn a přesunut dovnitř
          VideoDetailClientWrapperu, aby mohl být součástí layoutu.
      */}
    </main>
  );
}