import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ArrowRight, Brain, Layers, Zap, PlayCircle } from 'lucide-react';
import CollectionCard from '@/components/public/CollectionCard';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

// Prisma Singleton
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 1. DATA FETCHING (REAL DB)
  
  // A) Hero Sbírka: Vybereme 1 veřejnou sbírku, která má nejvíce videí (jako "top" obsah)
  // nebo prostě nejnovější. Zde volím nejnovější aktualizovanou.
  const heroCollection = await prisma.collection.findFirst({
    where: { 
      isPublic: true, 
      videos: { some: {} } // Musí mít videa
    },
    orderBy: { updatedAt: 'desc' },
    include: { 
      videos: { take: 1, select: { youtubeId: true } },
      _count: { select: { videos: true } }
    }
  });

  // B) Showcase: Další 3 veřejné sbírky (vyjma té v Hero)
  const showcaseCollections = await prisma.collection.findMany({
    where: { 
      isPublic: true, 
      videos: { some: {} },
      id: heroCollection ? { not: heroCollection.id } : undefined
    },
    take: 3,
    orderBy: { createdAt: 'desc' }, // Nejnovější
    include: {
      _count: { select: { videos: true } },
      videos: { 
        take: 5, 
        select: { youtubeId: true }, 
        orderBy: { createdAt: 'desc' } 
      }
    }
  });

  // C) Latest Videos: 5 nejnovějších videí (z veřejných sbírek)
  // Poznámka: Video je veřejné, pokud je v alespoň jedné veřejné sbírce.
  const latestVideos = await prisma.video.findMany({
    where: { 
      collections: { 
        some: { isPublic: true } 
      } 
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, youtubeId: true }
  });

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* === SEKCE A: HERO (KCP Princip) === */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40 bg-[rgb(var(--bg-primary))] border-b border-gray-200 dark:border-gray-800">
        
        {/* Ambientní pozadí (dekorace) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 dark:opacity-20 pointer-events-none">
           <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500 rounded-full blur-[128px]" />
           <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Mediathek 2.0
          </div>

          {/* H1: Claim */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[rgb(var(--text-primary))] mb-6 text-balance animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            Přestaň scrollovat,<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              začni studovat.
            </span>
          </h1>

          {/* H2: Sub-claim */}
          <p className="max-w-2xl mx-auto text-xl text-[rgb(var(--text-secondary))] mb-10 text-balance animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Váš osobní ostrov v moři internetového obsahu. Vytvářejte kurátorské sbírky videí, získávejte AI vhledy a budujte si vlastní strukturovanou knihovnu znalostí.
          </p>

          {/* CTA: Výzva k akci */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Button href="/collections" variant="primary" size="lg" className="w-full sm:w-auto group">
              Vstoupit do knihovny
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {!session && (
              <Button href="/register" variant="outline" size="lg" className="w-full sm:w-auto">
                Vytvořit účet zdarma
              </Button>
            )}
            {session && (
               <Button href="/dashboard" variant="ghost" size="lg" className="w-full sm:w-auto">
                Přejít na můj Dashboard
              </Button>
            )}
          </div>

        </div>
      </section>

      {/* === SEKCE B: FEATURE GRID (Proč my?) === */}
      <section className="py-24 bg-[rgb(var(--bg-secondary))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Proč používat Mediathek?</h2>
            <p className="text-[rgb(var(--text-secondary))] mt-2">Nástroje pro digitální kurátory.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Karta 1 */}
            <div className="p-8 rounded-2xl bg-[rgb(var(--bg-primary))] border border-gray-100 dark:border-gray-800 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Místo chaosu témata</h3>
              <p className="text-[rgb(var(--text-secondary))]">
                Videa neukládáme na hromadu. Třídíme je do živých sbírek, které dávají obsahu kontext a smysl.
              </p>
            </div>

            {/* Karta 2 */}
            <div className="p-8 rounded-2xl bg-[rgb(var(--bg-primary))] border border-gray-100 dark:border-gray-800 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Insight</h3>
              <p className="text-[rgb(var(--text-secondary))]">
                Neztrácejte čas. Umělá inteligence vám z každého videa vytáhne klíčové myšlenky, kapitoly a praktické tipy.
              </p>
            </div>

            {/* Karta 3 */}
            <div className="p-8 rounded-2xl bg-[rgb(var(--bg-primary))] border border-gray-100 dark:border-gray-800 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center mb-6 text-teal-600 dark:text-teal-400">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Klid na práci</h3>
              <p className="text-[rgb(var(--text-secondary))]">
                Žádné reklamy, žádné algoritmické doporučování. Jen vy a obsah, který jste si vybrali ke studiu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === SEKCE C: SHOWCASE (Důkaz) === */}
      {showcaseCollections.length > 0 && (
        <section className="py-24 bg-[rgb(var(--bg-primary))] border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold">Doporučené sbírky</h2>
                <p className="text-[rgb(var(--text-secondary))] mt-2">Výběr z veřejného katalogu.</p>
              </div>
              <Button href="/collections" variant="outline" size="sm" className="hidden sm:inline-flex">
                Zobrazit vše
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {showcaseCollections.map((col) => (
                <div key={col.id} className="h-96">
                  <CollectionCard
                    id={col.id}
                    name={col.name}
                    seoDescription={col.seoDescription || col.description}
                    videoCount={col._count.videos}
                    thumbnails={col.videos.map(v => v.youtubeId)}
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-8 sm:hidden">
               <Button href="/collections" variant="outline" className="w-full">
                Zobrazit vše
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* === SEKCE D: ČERSTVÝ OBSAH === */}
      {latestVideos.length > 0 && (
        <section className="py-12 bg-black text-white overflow-hidden">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Právě přidáno
              </h3>
              
              <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar snap-x">
                 {latestVideos.map(video => (
                    <Link key={video.id} href={`/video/${video.id}`} className="snap-start shrink-0 w-64 group">
                       <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative mb-3 border border-gray-800 group-hover:border-gray-600 transition-colors">
                          <img 
                            src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                            alt="" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                             <PlayCircle className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" />
                          </div>
                       </div>
                       <h4 className="text-sm font-medium text-gray-300 group-hover:text-white line-clamp-2 transition-colors">
                          {video.title}
                       </h4>
                    </Link>
                 ))}
              </div>
           </div>
        </section>
      )}

    </div>
  );
}