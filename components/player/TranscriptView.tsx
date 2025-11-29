"use client";

import React, { useEffect, useState, useRef } from 'react';
import { parseTranscript, TranscriptSegment } from '@/lib/transcriptParser';

interface TranscriptViewProps {
  transcript: string; // Surový text
  currentTime: number;
  duration: number; // Potřebné pro parser (dopočet posledního segmentu)
  onSeek: (time: number) => void;
}

export default function TranscriptView({ 
  transcript, 
  currentTime, 
  duration,
  onSeek 
}: TranscriptViewProps) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // 1. Jednorázové parsování při načtení
  useEffect(() => {
    if (transcript) {
      const parsed = parseTranscript(transcript, duration);
      setSegments(parsed);
    }
  }, [transcript, duration]);

  // 2. Auto-scroll efekt (když se změní aktivní segment)
  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center', // Zarovná aktivní text na střed okna
      });
    }
  }, [currentTime]); // Spustí se při změně času, ale reálně jen když se změní ref

  if (!transcript) {
    return <div className="p-4 text-gray-500 text-sm italic">Přepis není k dispozici.</div>;
  }

  return (
    <div className="space-y-4 p-1">
      {segments.map((seg, index) => {
        // Je tento segment aktivní?
        const isActive = currentTime >= seg.start && currentTime < seg.end;

        return (
          <div
            key={index}
            // Uložíme ref na aktivní element pro auto-scroll
            ref={isActive ? activeSegmentRef : null}
            onClick={() => onSeek(seg.start)}
            className={`
              p-2 rounded cursor-pointer transition-all duration-200 text-sm leading-relaxed
              ${isActive 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-gray-900 dark:text-gray-100 font-medium scale-[1.02] shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            <span className="text-xs text-gray-400 font-mono mr-2 select-none">
              {new Date(seg.start * 1000).toISOString().substring(14, 19)}
            </span>
            {seg.text}
          </div>
        );
      })}
      
      {segments.length === 0 && (
        <p className="text-gray-500">Načítám přepis...</p>
      )}
    </div>
  );
}