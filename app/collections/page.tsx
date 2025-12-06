import { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';
import CollectionCard from '@/components/public/CollectionCard';
import { Layers } from 'lucide-react';

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: 'Katalog Sbírek | Mediathek',
  description: 'Procházejte tematické sbírky videí, kurátorsky sestavené pro efektivní vzdělávání a objevování souvislostí.',
};

export const dynamic = 'force-dynamic';

export default async function CollectionsCatalogPage() {
  // 1. Načtení pouze VEŘEJNÝCH sbírek, které nejsou prázdné
  const collections = await prisma.collection.findMany({
    where: {
      isPublic: true,
      videos: {
        some: {} // Zobrazit jen sbírky, které mají alespoň jedno video
      }
    },
    orderBy: {
      updatedAt: 'desc', // Nejčerstvější nahoře
    },
    include: {
      // Pro "Živou obálku" potřebujeme náhledy videí (stačí ID)
      videos: {
        take: 5, // Načteme prvních 5 pro rotaci
        select: {
          youtubeId: true
        },
        // --- OPRAVA ZDE: ---
        // Původně: order: 'asc' (neexistuje) -> Nově: createdAt: 'desc' (nejnovější)
        orderBy: {
          createdAt: 'desc' 
        }
      },
      // Získáme celkový počet videí
      _count: {
        select: { videos: true }
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Sekce */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl mb-4">
            Katalog Témat
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
            Objevujte strukturované znalosti. Od zdraví po technologie, kurátorsky zpracované do souvislostí.
          </p>
        </div>
      </div>

      {/* Mřížka sbírek */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {collections.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Layers className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Zatím žádné veřejné sbírky</h3>
            <p className="mt-1 text-gray-500">Kurátoři právě pracují na novém obsahu. Přijďte brzy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
              <div key={collection.id} className="h-96">
                <CollectionCard
                  id={collection.id}
                  name={collection.name}
                  seoDescription={collection.seoDescription || collection.description}
                  videoCount={collection._count.videos}
                  thumbnails={collection.videos.map(v => v.youtubeId)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}