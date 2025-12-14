import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { ArrowLeft, PlayCircle, Clock, Hash, Database } from 'lucide-react';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default async function AdminAiCollectionDetail({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !['ADMIN', 'KURATOR'].includes(session.user?.role || '')) {
    redirect('/');
  }

  // 1. Hluboký dotaz do databáze
  // Chceme Sbírku -> Videa -> Segmenty
  const collection = await prisma.coreCollection.findUnique({
    where: { id },
    include: {
      videos: {
        include: {
          segments: {
            orderBy: { startTime: 'asc' } // Seřadit segmenty chronologicky
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!collection) notFound();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-20">
      
      {/* HEADER */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <Link href="/admin/ai-collections" className="inline-flex items-center text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Zpět na seznam
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {collection.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
            {collection.description}
        </p>
        <div className="mt-4 flex gap-4 text-xs font-mono text-gray-400">
            <span>ID: {collection.id}</span>
            <span>Vektory: 768 dim</span>
            <span>Origin: {collection.origin}</span>
        </div>
      </div>

      {/* VIDEO LIST */}
      <div className="space-y-12">
        {collection.videos.map((video, vIndex) => (
            <div key={video.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                
                {/* VIDEO HLAVIČKA */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-6 items-start">
                    
                    {/* Náhled (Link na přehrávač) */}
                    <div className="shrink-0 w-48 aspect-video bg-black rounded-lg overflow-hidden relative shadow-md group">
                        <img 
                            src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                            alt="" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        {video.legacyVideoId && (
                            <Link href={`/video/${video.legacyVideoId}`} className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                                <PlayCircle className="text-white opacity-80 group-hover:scale-110 transition-transform" size={40} />
                            </Link>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded">
                                VIDEO #{vIndex + 1}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">CoreID: {video.id}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {video.title}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {video.summary}
                        </p>
                    </div>
                </div>

                {/* SEGMENTY (PODROBNOSTI) */}
                <div className="p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Database size={14} /> Sémantické Segmenty ({video.segments.length})
                    </h3>
                    
                    <div className="space-y-3">
                        {video.segments.map((seg) => (
                            <div key={seg.id} className="flex gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors text-sm">
                                
                                {/* Čas */}
                                <div className="shrink-0 w-24 text-gray-500 font-mono text-xs flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                                </div>

                                {/* Obsah */}
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-gray-200 mb-1">
                                        {seg.summary}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {seg.tags.map((tag, tIdx) => (
                                            <span key={tIdx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                <Hash size={10} className="mr-1 opacity-50" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Debug Info (Vektor) */}
                                <div className="shrink-0 text-[10px] text-gray-400 text-right">
                                    {/* Zde bychom mohli zobrazit shodu, kdybychom ji měli spočítanou */}
                                    <div>Vector: OK</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        ))}
      </div>
    </div>
  );
}