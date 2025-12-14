import { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';
import CollectionCard from '@/components/public/CollectionCard';
import { Sparkles, BrainCircuit } from 'lucide-react';

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: 'AI Průvodci | Mediathek',
  description: 'Inteligentně generované sbírky a průvodci vytvoření na základě sémantické analýzy obsahu.',
};

export const dynamic = 'force-dynamic';

export default async function GuidesPage() {
  // 1. Načtení pouze SYSTÉMOVÝCH (AI) sbírek
  const aiCollections = await prisma.coreCollection.findMany({
    where: {
      origin: 'SYSTEM',
      videos: {
        some: {} // Jen neprázdné
      }
    },
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      videos: {
        take: 5,
        select: {
          youtubeId: true
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { videos: true }
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* HERO SEKCE */}
      <div className="relative bg-indigo-950 text-white border-b border-indigo-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute right-10 top-10 w-64 h-64 bg-purple-500 rounded-full blur-[100px]"></div>
            <div className="absolute left-10 bottom-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/50 border border-indigo-700 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
            <BrainCircuit size={14} />
            Semantic Core Active
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200">
            AI Průvodci
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-indigo-200/80">
            Podívejte se na svou knihovnu očima umělé inteligence. 
            Tyto sbírky vznikly automaticky na základě sémantické shody témat.
          </p>
        </div>
      </div>

      {/* MŘÍŽKA SBÍREK */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 -mt-8 relative z-20">
        
        {aiCollections.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Zatím žádné AI sbírky</h3>
            <p className="mt-1 text-gray-500">
              Systém se teprve učí. Přidejte více videí, aby mohl najít souvislosti.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {aiCollections.map((col) => (
              <div key={col.id} className="h-96 relative group">
                <div className="absolute -top-3 -right-3 z-30 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
                    AI GENERATED
                </div>
                
                <CollectionCard
                  id={col.id}
                  name={col.name}
                  seoDescription={col.description}
                  videoCount={col._count.videos}
                  thumbnails={col.videos.map(v => v.youtubeId)}
                  // KLÍČOVÁ OPRAVA: Explicitně říkáme, kam má odkaz vést
                  href={`/guides/${col.id}`}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}