import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
// 1. IMPORT NOVÉHO WRAPPERU
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

  // 2. AKTUALIZACE PRISMA DOTAZU PRO NAČTENÍ KAPITOL
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
    <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Název Videa */}
      <h1 className="text-3xl font-bold mb-5">{video.title}</h1>

      {/* 3. POUŽITÍ KLIENTSKÉHO WRAPPERU */}
      <VideoDetailClientWrapper
        youtubeId={video.youtubeId}
        chapters={video.chapters}
      />

      {/* Popis / Shrnutí */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Shrnutí</h2>
        <p className="text-gray-300 whitespace-pre-wrap text-lg">
          {video.summary}
        </p>
      </div>
    </main>
  );
}