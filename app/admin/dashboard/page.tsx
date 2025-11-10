import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';

// Inicializace Prisma Clienta (pokud nemáte globální instanci v lib/prisma.ts)
// Poznámka: V produkci je lepší mít singleton instanci v samostatném souboru,
// ale pro tento účel a jednoduchost to funguje i takto přímo v RSC.
const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'; // Zajistí, že se stránka při každém načtení přegeneruje (aby byla data aktuální)

export default async function AdminDashboardPage() {
  // 1. Bezpečnostní kontrola na serveru
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    // Pokud není přihlášen nebo není ADMIN, přesměrujeme ho.
    // Middleware by to měl zachytit dříve, ale toto je druhá vrstva ochrany.
    redirect('/');
  }

  // 2. Načtení dat z databáze
  // Načteme všechna videa, seřazená od nejnovějších.
  const videos = await prisma.video.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    // Můžeme přinačíst i informace o autorovi, pokud bychom je chtěli zobrazit
    include: {
      author: {
        select: {
            email: true
        }
      }
    }
  });

  // 3. Vykreslení UI
  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Přehled Obsahu (Admin Dashboard)</h1>
        <Link
          href="/admin/add"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          + Přidat nové video
        </Link>
      </div>

      {videos.length === 0 ? (
        <p className="text-gray-500 text-lg">
          Zatím nebyla přidána žádná videa.
        </p>
      ) : (
        // Mřížka karet s videi
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Link
              href={`/admin/video/${video.id}`}
              key={video.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-indigo-500" // Přidán hover efekt
            >
              {/* Náhled videa z YouTube (volitelné, pro lepší orientaci) */}
              <div className="aspect-video bg-gray-100 relative">
                 <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                    alt={`Náhled videa ${video.title}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                 />
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold mb-2 line-clamp-2" title={video.title}>
                  {video.title}
                </h2>

                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <p>ID: <span className="font-mono">{video.youtubeId}</span></p>
                    <p>Autor: {video.author.email}</p>
                </div>

                <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 flex-1">
                  {video.summary}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                        {new Date(video.createdAt).toLocaleDateString('cs-CZ')}
                    </span>
                    {/* Zde v budoucnu budou tlačítka akcí */}
                    <span className="text-indigo-500 font-medium cursor-not-allowed opacity-50" title="Editace bude dostupná v další fázi">
                        Upravit
                    </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}