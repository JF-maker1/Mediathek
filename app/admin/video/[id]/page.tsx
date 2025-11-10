import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
// POUŽITÍ ABSOLUTNÍ CESTY S ALIASEM '@'
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

// V Next.js 15+ jsou params Promise.
// Upravíme typ props, aby to reflektoval.
interface VideoDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Zajistí, že stránka bude vždy dynamicky generována (SSR)
export const dynamic = 'force-dynamic';

/**
 * Stránka detailu videa pro administrátory.
 * Načítá data na serveru (RSC).
 */
export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  // DŮLEŽITÁ ZMĚNA: Musíme počkat na params, protože je to Promise.
  const { id } = await params;

  // 1. Ověření role na serveru (dvojitá kontrola, i když middleware již existuje)
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
     // Middleware by měl zasáhnout dříve, ale toto je pojistka
     notFound(); 
  }

  // 2. Načtení dat o videu
  // Nyní už máme 'id' jako string, takže Prisma dotaz by měl projít.
  const video = await prisma.video.findUnique({
    where: { id: id },
  });

  // 3. Ošetření nenalezeného videa
  if (!video) {
    notFound();
  }

  // 4. Vykreslení stránky
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Název Videa */}
      <h1 className="text-3xl font-bold mb-5">{video.title}</h1>

      {/* Přehrávač Videa (design "plátna") */}
      {/* Kontejner s poměrem stran 16:9 */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' /* Poměr 16:9 */ }}>
        <VideoPlayer youtubeId={video.youtubeId} />
      </div>

      {/* Popis / Shrnutí */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Shrnutí</h2>
        {/* `whitespace-pre-wrap` zachová formátování (nové řádky) ze shrnutí */}
        <p className="text-gray-300 whitespace-pre-wrap text-lg">
          {video.summary}
        </p>
      </div>
    </main>
  );
}