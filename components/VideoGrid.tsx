"use client";

import Link from 'next/link';
import { Video } from '@prisma/client';

type VideoWithDetails = Video & {
  author: { email: string | null } | null;
  collections: { id: string; name: string }[];
};

interface VideoGridProps {
  videos: VideoWithDetails[];
  baseHref?: string;
  showEditButton?: boolean;
}

export default function VideoGrid({ videos, baseHref = '/admin/video', showEditButton }: VideoGridProps) {
  
  if (videos.length === 0) {
    return (
      <p className="text-center text-gray-400">
        Nebyly nalezeny žádné video záznamy.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <div
          key={video.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-indigo-500 group"
        >
          {/* 1. HLAVNÍ ODKAZ (Obrázek + Tělo) */}
          <Link href={`${baseHref}/${video.id}`} className="flex-1 flex flex-col">
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
                 <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                    alt={`Náhled videa ${video.title}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                 />
              </div>

              <div className="p-5 flex-1">
                  <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors" title={video.title}>
                    {video.title}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <p>ID: <span className="font-mono">{video.youtubeId}</span></p>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-0">
                    {video.summary}
                  </p>
              </div>
          </Link>

          {/* 2. PATIČKA (Samostatný blok, aby se nekřížily odkazy) */}
          <div className="mt-auto pt-2 pb-2 border-t border-gray-200 dark:border-gray-700 
                          text-xs space-y-1 
                          bg-violet-50 dark:bg-violet-900/30">
            
            <div className="text-gray-600 dark:text-gray-300 space-y-1 px-5">
              <p>
                <strong>Sbírka(y):</strong> {
                  video.collections.length > 0 
                    ? video.collections.map(c => c.name).join(', ') 
                    : 'Nezařazeno'
                }
              </p>
              <p>
                <strong>Kurátor:</strong> {video.author?.email || 'Neznámý'}
              </p>
            </div>

            <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 px-5">
              <span>
                  {new Date(video.createdAt).toLocaleDateString('cs-CZ')}
              </span>
              
              {/* Tlačítko Upravit je nyní bezpečně vedle hlavního odkazu, ne uvnitř */}
              {showEditButton === true && (
                   <Link 
                      href={`/admin/edit/${video.id}`} 
                      className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors hover:underline p-1"
                   >
                      Upravit
                   </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}