import { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PlayCircle, BrainCircuit, ArrowLeft, Layers, CheckCircle } from 'lucide-react';

const prisma = new PrismaClient();

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const collection = await prisma.coreCollection.findUnique({
      where: { id },
      select: { name: true, description: true }
    });

    if (!collection) return { title: 'Nenalezeno' };
    return {
      title: `${collection.name} | AI Průvodce`,
      description: collection.description || `Automaticky generovaná sbírka.`,
    };
  } catch (e) {
    return { title: 'Detail Průvodce' };
  }
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Načtení dat z CoreCollection + videa
  const guide = await prisma.coreCollection.findUnique({
    where: { id },
    include: {
      videos: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, 
          title: true,
          summary: true,
          legacyVideoId: true, // Důležité pro odkaz na přehrávač
          youtubeId: true,
        }
      }
    }
  });

  if (!guide) notFound();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* HLAVIČKA */}
      <div className="bg-indigo-950 text-white relative overflow-hidden pb-16 pt-10">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <Link href="/guides" className="inline-flex items-center text-indigo-300 hover:text-white transition-colors mb-8 text-sm font-medium">
            <ArrowLeft size={16} className="mr-2" /> Zpět na seznam průvodců
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
               <BrainCircuit size={48} className="text-indigo-300" />
            </div>
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    {guide.name}
                  </h1>
                  <span className="px-2 py-1 bg-indigo-500/50 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-400/50">
                    AI Generated
                  </span>
               </div>
               <p className="text-lg text-indigo-200 max-w-2xl leading-relaxed">
                 {guide.description}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* OBSAH PRŮVODCE */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} /> Kurátorský výběr ({guide.videos.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {guide.videos.map((video, index) => (
                <div key={video.id} className="group relative p-6 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                   <div className="flex gap-6 items-start">
                      
                      {/* Náhled */}
                      <div className="shrink-0 w-40 aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-sm relative">
                         <img 
                            src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                            alt="" 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                         />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <PlayCircle className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all drop-shadow-md" size={32} />
                         </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {video.title}
                            </h3>
                         </div>
                         <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
                            {video.summary}
                         </p>
                         
                         {/* ODKAZ NA VIDEO (Pokud existuje Legacy ID) */}
                         {video.legacyVideoId ? (
                             <Link 
                                href={`/video/${video.legacyVideoId}`} 
                                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                             >
                                Přehrát video <ArrowLeft size={14} className="rotate-180 ml-1" />
                             </Link>
                         ) : (
                             <span className="text-xs text-red-400 italic">Video není propojeno s přehrávačem.</span>
                         )}
                      </div>

                      {/* Match Score (Placeholder) */}
                      <div className="hidden sm:flex flex-col items-end gap-1">
                         <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                            <CheckCircle size={10} /> Sémantická shoda
                         </div>
                      </div>

                   </div>
                   
                   {/* Klikací plocha přes celou kartu */}
                   {video.legacyVideoId && (
                       <Link href={`/video/${video.legacyVideoId}`} className="absolute inset-0 z-10" aria-label={`Přehrát ${video.title}`} />
                   )}
                </div>
              ))}
            </div>

            {guide.videos.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    Tato sbírka je prázdná.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}