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
}

export default function VideoDetailClientWrapper({
  youtubeId,
  chapters,
}: VideoDetailClientWrapperProps) {
  // Reference pro ovládání přehrávače
  const playerRef = useRef(null);

  return (
    <>
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

      {/* Strukturovaný Obsah */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Strukturovaný obsah</h2>
        <ChapterList chapters={chapters} playerRef={playerRef} />
      </div>
    </>
  );
}