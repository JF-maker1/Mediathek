"use client";

import { Prisma } from '@prisma/client';
import { RefObject, useEffect, useRef } from 'react';

// Explicitně definujeme typ, který očekáváme z Prisma dotazu
type ChapterWithData = Prisma.ChapterGetPayload<{}>;

interface ChapterListProps {
  chapters: ChapterWithData[];
  playerRef: RefObject<any>; // Reference na YouTube přehrávač
  currentTime?: number; // NOVÉ: Přijímáme aktuální čas pro zvýraznění
}

export default function ChapterList({ chapters, playerRef, currentTime = 0 }: ChapterListProps) {
  const activeChapterRef = useRef<HTMLButtonElement>(null);

  if (!chapters || chapters.length === 0) {
    return <p className="text-gray-900 dark:text-gray-100 p-4">Pro toto video není dostupný strukturovaný obsah.</p>;
  }

  const handleChapterClick = (startTime: number) => {
    playerRef.current?.seekTo(startTime, true);
    playerRef.current?.playVideo();
  };

  // Auto-scroll efekt (aby aktivní kapitola byla vždy vidět)
  useEffect(() => {
    if (activeChapterRef.current) {
      activeChapterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest', // 'nearest' je méně rušivé než 'center' pro seznamy
      });
    }
  }, [currentTime]); // Spustí se při změně aktivní kapitoly

  return (
    <div className="space-y-1">
      {chapters.map((chapter, index) => {
        // Logika pro zjištění, zda je kapitola aktivní
        // Kapitola je aktivní, pokud čas je >= její start A zároveň < start další kapitoly
        const nextChapterStart = chapters[index + 1]?.startTime ?? Infinity;
        const isActive = currentTime >= chapter.startTime && currentTime < nextChapterStart;

        return (
          <button
            key={chapter.id}
            // Pokud je aktivní, přiřadíme ref pro auto-scroll
            ref={isActive ? activeChapterRef : null}
            onClick={() => handleChapterClick(chapter.startTime)}
            className={`
              block w-full text-left p-2 rounded-md transition-all duration-200 text-sm
              ${isActive 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-gray-900 dark:text-gray-100 font-bold border-l-4 border-yellow-400 pl-3 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-4 border-transparent pl-3'
              }
            `}
            style={{
              // Hierarchické odsazení na základě 'level' z DB
              // Přičteme padding, aby to vypadalo hezky
              marginLeft: `${chapter.level * 16}px`,
              width: `calc(100% - ${chapter.level * 16}px)`,
            }}
          >
            <div className="flex justify-between items-baseline gap-2">
              <span>{chapter.text}</span>
              <span className={`text-xs font-mono shrink-0 ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>
                {new Date(chapter.startTime * 1000).toISOString().substring(14, 19)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}