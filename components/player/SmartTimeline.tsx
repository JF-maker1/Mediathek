"use client";

import React, { useState } from 'react';
import { Prisma } from '@prisma/client';
import { timeToSeconds } from '@/lib/parser'; // Použijeme existující utilitu

type Chapter = Prisma.ChapterGetPayload<{}>;

interface SmartTimelineProps {
  chapters: Chapter[];
  duration: number; // Celková délka videa v sekundách
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function SmartTimeline({ 
  chapters, 
  duration, 
  currentTime, 
  onSeek 
}: SmartTimelineProps) {
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);

  if (!chapters || chapters.length === 0 || duration === 0) {
    return null; // Pokud nejsou data, nezobrazujeme nic
  }

  // Seřadíme kapitoly podle času (pro jistotu)
  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="relative w-full h-4 mt-2 mb-6 group cursor-pointer select-none">
      {/* Kontejner lišty */}
      <div className="flex w-full h-full rounded-full overflow-hidden shadow-sm bg-gray-200 dark:bg-gray-700">
        
        {sortedChapters.map((chapter, index) => {
          // Výpočet konce kapitoly: buď začátek další, nebo konec videa
          const nextChapterStart = sortedChapters[index + 1]?.startTime || duration;
          const chapterEnd = chapter.endTime || nextChapterStart;
          
          // Ochrana proti negativní délce (pokud jsou data v DB špatně)
          const chapterDuration = Math.max(0, chapterEnd - chapter.startTime);
          const widthPercent = (chapterDuration / duration) * 100;

          // Je tato kapitola právě aktivní?
          const isActive = currentTime >= chapter.startTime && currentTime < chapterEnd;

          // Barvy: Střídání pro lepší odlišení segmentů
          const isEven = index % 2 === 0;
          const baseColor = isEven 
            ? 'bg-indigo-300 dark:bg-indigo-900' 
            : 'bg-indigo-200 dark:bg-indigo-800';
          
          const activeColor = 'bg-indigo-500 dark:bg-indigo-500'; // Výraznější pro aktivní

          return (
            <div
              key={chapter.id}
              style={{ width: `${widthPercent}%` }}
              className={`relative h-full transition-colors duration-200 hover:brightness-110 ${isActive ? activeColor : baseColor}`}
              onClick={() => onSeek(chapter.startTime)}
              onMouseEnter={() => setHoveredChapter(chapter.text)}
              onMouseLeave={() => setHoveredChapter(null)}
            />
          );
        })}
      </div>

      {/* Indikátor aktuálního času (Progress Pin) */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none transition-all duration-200 ease-linear z-10"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      />

      {/* Hover Tooltip (Bublina s názvem) */}
      {hoveredChapter && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          {hoveredChapter}
        </div>
      )}
    </div>
  );
}