import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
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
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'ADMIN';

  const video = await prisma.video.findUnique({
    where: { id: id },
    include: {
      chapters: { orderBy: { order: 'asc' } },
      transcript: { select: { content: true } },
      collections: { select: { id: true, name: true, isPublic: true } },
      author: { select: { email: true } }
    },
  });

  if (!video) notFound();

  const isPublic = video.collections.some(col => col.isPublic);
  if (!isPublic && !isAdmin) notFound();

  return (
    <main className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        <VideoDetailClientWrapper
          youtubeId={video.youtubeId}
          title={video.title}
          chapters={video.chapters}
          transcript={video.transcript?.content || null}
          practicalTips={video.practicalTips}
          seoSummary={video.seoSummary || video.summary}
          seoKeywords={video.seoKeywords}
          // PŘIDÁNO: Předáváme AI návrhy sbírek
          aiSuggestions={video.aiSuggestions}
          collections={video.collections}
          originalDescription={video.summary}
        />
      </div>
    </main>
  );
}