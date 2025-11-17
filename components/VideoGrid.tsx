// V souladu se zadáním Fáze 8 vytváříme klientskou komponentu
"use client";

import Link from 'next/link';
// AKTUALIZACE: Importujeme typy z Prisma
import { Video, User } from '@prisma/client';

// AKTUALIZACE: Definujeme typ, který očekáváme (Video + Author)
// Toto je přesně to, co načítá stávající app/admin/dashboard/page.tsx
type VideoWithAuthor = Video & {
  author: { email: string | null } | null;
};

// Definujeme typ pro props
interface VideoGridProps {
  videos: VideoWithAuthor[];
  // Přidáme volitelný prop pro změnu odkazu (pro budoucí veřejnou stránku)
  baseHref?: string;
}

// Komponenta pouze přijímá pole videí a vykresluje je
export default function VideoGrid({ videos, baseHref = '/admin/video' }: VideoGridProps) {
  
  // Pokud nejsou žádná videa, zobrazíme zprávu
  if (videos.length === 0) {
    return (
      <p className="text-center text-gray-400">
        Nebyly nalezeny žádné video záznamy.
      </p>
    );
  }

  // Vykreslení mřížky - PŘEVZATO Z page.tsx
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <Link
          href={`${baseHref}/${video.id}`}
          key={video.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-indigo-500"
        >
          {/* Náhled videa z YouTube */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
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
                <p>Autor: {video.author?.email || 'Neznámý'}</p>
            </div>

            <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 flex-1">
              {video.summary}
            </p>

            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm">
                <span className="text-gray-400">
                    {new Date(video.createdAt).toLocaleDateString('cs-CZ')}
                </span>
                {/* Odkaz pro úpravy (zde jako příklad, pokud by baseHref byl /admin) */}
                {baseHref.startsWith('/admin') && (
                     <Link href={`/admin/edit/${video.id}`} className="text-indigo-500 hover:text-indigo-700 font-medium">
                        Upravit
                     </Link>
                )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
