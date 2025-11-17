"use client";

import { useRef } from 'react';
import { Prisma } from '@prisma/client';
import VideoPlayer from '@/components/VideoPlayer';
import ChapterList from '@/components/ChapterList';

// Přijímáme data načtená na serveru
type ChapterWithData = Prisma.ChapterGetPayload<{}>;

interface VideoDetailClientWrapperProps {
  youtubeId: string;
  chapters: ChapterWithData[];
  summary: string; // ZMĚNA: Nyní přijímáme i summary
}

export default function VideoDetailClientWrapper({
  youtubeId,
  chapters,
  summary, // ZMĚNA: Používáme summary
}: VideoDetailClientWrapperProps) {
  // Reference pro ovládání přehrávače
  const playerRef = useRef(null);

  return (
    // [NASTAVENI GRID A POMERU SLOUPCU ZDE] Grid a poměr sloupců
    <div className="lg:grid lg:grid-cols-14 lg:gap-8">
      
      {/* --- LEVÝ SLOUPEC (Video a Shrnutí) --- */}
      {/* [NASTAVENI GRID A POMERU SLOUPCU ZDE] Levý sloupec - video */}
      <div className="lg:col-span-8">
        {/* Přehrávač Videa */}
        <div
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ paddingTop: '56.25%' /* Poměr 16:9 */ }}
        >
          <VideoPlayer
            youtubeId={youtubeId}
            onReady={(event) => (playerRef.current = event.target)}
          />
        </div>

        {/* Popis / Shrnutí (Přesunuto sem) */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Shrnutí</h2>
          {/* Používáme opravené třídy pro barvu textu (z minulé úpravy) */}
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-lg">
            {summary}
          </p>
        </div>
      </div>

      {/* --- PRAVÝ SLOUPEC (Strukturovaný Obsah) --- */}
      {/* [NASTAVENI GRID A POMERU SLOUPCU ZDE] Pravý sloupec - obsah */}
      <div className="lg:col-span-6 mt-8 lg:mt-0">
        
        {/* Wrapper, který zajistí "přilepení" (sticky) a scrollování */}
        {/* 'lg:sticky' - přilepí se na desktopu
            'lg:top-8' - odsazení 8px od vršku viewportu
            'lg:max-h-[90vh]' - maximální výška (90% výšky okna)
            'lg:overflow-y-auto' - přidá posuvník, pokud je obsah delší
        */}
        <div className="lg:sticky lg:top-8 lg:max-h-[90vh] lg:overflow-y-auto rounded-lg">
          {/* Strukturovaný Obsah */}
          <div>
            {/* Odebráno mt-8, řeší se vnějším divem */}
            <h2 className="text-2xl font-semibold mb-4">Strukturovaný obsah</h2>
            <ChapterList chapters={chapters} playerRef={playerRef} />
          </div>
        </div>
      </div>
    </div>
  );
}