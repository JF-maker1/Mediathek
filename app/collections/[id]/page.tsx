import { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import CollectionHeader from '@/components/public/CollectionHeader';

// --- PRISMA SINGLETON ---
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

// --- SEO METADATA ---
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { name: true, seoDescription: true, isPublic: true }
    });

    if (!collection || !collection.isPublic) return { title: 'Nenalezeno' };
    return {
      title: `${collection.name} | Mediathek`,
      description: collection.seoDescription || `Sbírka videí na téma ${collection.name}.`,
    };
  } catch (e) {
    return { title: 'Detail Sbírky' };
  }
}

// --- HLAVNÍ STRÁNKA ---
export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  console.log(`[CollectionDetail] Načítám data pro ID: ${id}`);

  try {
    // 1. Načtení dat z DB
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { createdAt: 'desc' }, // Řazení videí od nejnovějších
          include: {
             // Pouze ověření, zda existuje přepis
             transcript: { select: { id: true } } 
          }
        }
      }
    });

    // 2. Kontrola existence a práv
    if (!collection) {
      console.error(`[CollectionDetail] ❌ Sbírka neexistuje.`);
      notFound();
    }

    if (!collection.isPublic) {
      console.error(`[CollectionDetail] ⛔ Sbírka je soukromá.`);
      notFound();
    }

    // 3. Renderování UI
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        
        {/* A) Ambientní Hlavička */}
        <CollectionHeader
          name={collection.name}
          description={collection.seoDescription || collection.description}
          // Fallback pro klíčová slova
          keywords={collection.seoKeywords || collection.keywords || []}
          thumbnails={collection.videos.map(v => v.youtubeId)}
        />

        {/* B) Seznam Videí (Osnova) */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-20">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            
            {/* Hlavička seznamu */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Obsah Sbírky ({collection.videos.length})
              </h2>
              
              {collection.videos.length > 0 && (
                  <Link 
                      href={`/video/${collection.videos[0].id}`}
                      className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                      <PlayCircle size={16} /> Začít studovat
                  </Link>
              )}
            </div>

            {/* Položky seznamu */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {collection.videos.map((video, index) => (
                <Link 
                  key={video.id} 
                  href={`/video/${video.id}`}
                  className="group block hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors duration-200"
                >
                  <div className="flex items-start p-4 sm:p-6 gap-4 sm:gap-6">
                    
                    {/* Pořadové číslo */}
                    <div className="hidden sm:flex flex-col items-center pt-1 min-w-[2rem]">
                      <span className="text-xl font-bold text-gray-300 group-hover:text-indigo-400 transition-colors">
                          {(index + 1).toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Náhled videa */}
                    <div className="relative shrink-0 w-32 aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                      <img 
                          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                          <PlayCircle className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" />
                      </div>
                    </div>

                    {/* Informace o videu */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                        {video.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {video.seoSummary || video.summary}
                      </p>

                      {/* Štítky */}
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 font-medium">
                          <span className="flex items-center gap-1">
                              <PlayCircle size={12} /> Video
                          </span>
                          {video.transcript && (
                             <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                               Přepis dostupný
                             </span>
                          )}
                      </div>
                    </div>

                  </div>
                </Link>
              ))}
            </div>

            {/* Prázdný stav */}
            {collection.videos.length === 0 && (
                <div className="p-12 text-center text-gray-500">Tato sbírka je zatím prázdná.</div>
            )}

          </div>
        </div>
      </main>
    );

  } catch (error: any) {
    console.error('[CollectionDetail] CRITICAL ERROR:', error);
    return (
        <div className="p-10 text-center bg-red-50 text-red-600">
            <h1 className="text-xl font-bold">Chyba při načítání</h1>
            <p className="font-mono text-sm mt-2">{error.message}</p>
        </div>
    );
  }
}