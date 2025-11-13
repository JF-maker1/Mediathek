"use client";

import { Prisma } from '@prisma/client';
import { RefObject } from 'react';

// Explicitně definujeme typ, který očekáváme z Prisma dotazu
type ChapterWithData = Prisma.ChapterGetPayload<{}>;

interface ChapterListProps {
  chapters: ChapterWithData[];
  playerRef: RefObject<any>; // Reference na YouTube přehrávač
}

export default function ChapterList({ chapters, playerRef }: ChapterListProps) {
  if (!chapters || chapters.length === 0) {
    return <p className="text-gray-400">Pro toto video není dostupný strukturovaný obsah.</p>;
  }

  const handleChapterClick = (startTime: number) => {
    playerRef.current?.seekTo(startTime); // Funkce pro skok v čase
    playerRef.current?.playVideo(); // Volitelné: rovnou spustit přehrávání
  };

  return (
    <div className="space-y-2">
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          onClick={() => handleChapterClick(chapter.startTime)}
          className="block w-full text-left p-3 rounded-md transition-colors text-gray-200 hover:bg-gray-700"
          style={{
            // Hierarchické odsazení na základě 'level' z DB
            marginLeft: `${chapter.level * 20}px`,
            width: `calc(100% - ${chapter.level * 20}px)`,
          }}
        >
          {/* Zobrazíme text (který již obsahuje číslování) */}
          {chapter.text}
        </button>
      ))}
    </div>
  );
}