// V souladu se zadáním Fáze 8 vytváříme klientskou komponentu
"use client";

import Link from 'next/link';
// Importujeme typy z Prisma
import { Video, User } from '@prisma/client';

// Typ pro data komponenty
type VideoWithDetails = Video & {
  author: { email: string | null } | null;
  collections: { id: string; name: string }[];
};

interface VideoGridProps {
  videos: VideoWithDetails[];
  baseHref?: string;
  showEditButton?: boolean;
}

// Komponenta pouze přijímá pole videí a vykresluje je
export default function VideoGrid({ videos, baseHref = '/admin/video', showEditButton }: VideoGridProps) {
  
  // Pokud nejsou žádná videa, zobrazíme zprávu
  if (videos.length === 0) {
    return (
      <p className="text-center text-gray-400">
        Nebyly nalezeny žádné video záznamy.
      </p>
    );
  }

  // Vykreslení mřížky
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <Link
          href={`${baseHref}/${video.id}`}
          key={video.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-indigo-500"
        >
          {/* Náhled videa z YouTube (Zóna 1 - část 1) */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
             <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                alt={`Náhled videa ${video.title}`}
                className="w-full h-full object-cover"
                loading="lazy"
             />
          </div>

          {/* Kontejner pro textový obsah (tělo i zápatí) */}
          <div className="flex-1 flex flex-col">

            {/* Zóna 1 - část 2 (Tělo - obsah z internetu) */}
            {/* Přidán flex-1 pro lepší rozvržení - zápatí bude vždy dole */}
            <div className="p-5 flex-1">
              <h2 className="text-xl font-semibold mb-2 line-clamp-2" title={video.title}>
                {video.title}
              </h2>

              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <p>ID: <span className="font-mono">{video.youtubeId}</span></p>
              </div>

              <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-0">
                {video.summary}
              </p>
            </div>

            {/* Zóna 2 (Zápatí - obsah aplikace) */}
            {/* Snížené odsazení (pt-2 pb-2) a mezery (space-y-1) pro kompaktnější vzhled */}
            <div className="mt-auto pt-2 pb-2 border-t border-gray-200 dark:border-gray-700 
                            text-xs space-y-1 
                            bg-violet-50 dark:bg-violet-900/30">
              
              {/* Sekce 1: Kurátorská metadata */}
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

              {/* Sekce 2: Datum a Edit link */}
              <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 px-5">
                <span>
                    {new Date(video.createdAt).toLocaleDateString('cs-CZ')}
                </span>
                {showEditButton === true && (
                     <Link href={`/admin/edit/${video.id}`} className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors hover:text-indigo-400">
                        Upravit
                     </Link>
                )}
              </div>
            </div>
            {/* === KONEC ZÁPATÍ === */}
          </div>
        </Link>
      ))}
    </div>
  );
}