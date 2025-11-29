"use client";

import { useRef, useState, useEffect } from 'react';
import { Prisma } from '@prisma/client';
import { BookOpen, Layers } from 'lucide-react';

import VideoPlayer from '@/components/VideoPlayer';
import SmartSidebar from '@/components/player/SmartSidebar';
import SmartTimeline from '@/components/player/SmartTimeline';

type Chapter = Prisma.ChapterGetPayload<{}>;
type Collection = { id: string; name: string };

interface VideoDetailClientWrapperProps {
  youtubeId: string;
  title: string;
  chapters: Chapter[];
  transcript: string | null;
  practicalTips: string[];
  seoSummary: string;
  seoKeywords: string[];
  aiSuggestions: string[];
  collections: Collection[];
  originalDescription: string;
}

export default function VideoDetailClientWrapper({
  youtubeId,
  title,
  chapters,
  transcript,
  practicalTips,
  seoSummary,
  seoKeywords,
  aiSuggestions,
  collections,
  originalDescription
}: VideoDetailClientWrapperProps) {
  
  const playerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayerReady = (event: { target: any }) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        if (Math.abs(time - currentTime) > 0.5 || time === 0) {
          setCurrentTime(time);
        }
        setIsPlaying(playerRef.current.getPlayerState() === 1);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentTime]);

  const handleSeek = (time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      playerRef.current.playVideo();
      setCurrentTime(time);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* === LEVÝ SLOUPEC (Video) === */}
      <div className="lg:col-span-8 w-full min-w-0">
        
        {/* Přehrávač */}
        <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-lg" style={{ paddingBottom: '56.25%' }}>
          <div className="absolute inset-0">
             <VideoPlayer youtubeId={youtubeId} onReady={handlePlayerReady} />
          </div>
        </div>

        {/* Smart Timeline */}
        <div className="mt-4">
            <SmartTimeline 
                chapters={chapters} 
                duration={duration} 
                currentTime={currentTime} 
                onSeek={handleSeek} 
            />
        </div>

        {/* Kontext */}
        <div className="mt-6 space-y-6">
            
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {title}
            </h1>

            {/* AI Abstrakt + Tagy + Témata (Sjednocená minimalistická karta) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-l-4 border-indigo-500 shadow-sm">
                
                {/* 1. Abstrakt */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg shrink-0">
                        <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            O čem to je
                         </h3>
                         <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed"> {/* Text barva sjednocena s abstraktem */}
                            {seoSummary}
                         </p>
                    </div>
                </div>

                {/* 2. Klíčová slova (Tagy) */}
                {/* SOFT INDIGO:
                    Default: bg-indigo-50/50 (jemná) + text-gray-600
                    Hover: bg-indigo-100/50 (trochu výraznější) + text-gray-900
                */}
                {seoKeywords && seoKeywords.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 pl-0 sm:pl-[3.25rem]">
                        {seoKeywords.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 cursor-default border bg-indigo-50/50 text-gray-600 border-indigo-100/50 hover:bg-indigo-100/50 hover:text-gray-900 hover:border-indigo-200/50 dark:bg-indigo-900/20 dark:text-gray-400 dark:border-indigo-800 dark:hover:bg-indigo-900/40 dark:hover:text-gray-200">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* 3. Témata (AI Suggestions) */}
                {/* INVERZNÍ SOFT INDIGO:
                    Default: bg-indigo-100/50 (trochu výraznější) + text-gray-600
                    Hover: bg-indigo-50/50 (jemná) + text-gray-900
                */}
                {aiSuggestions && aiSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pl-0 sm:pl-[3.25rem]">
                        {aiSuggestions.map((sug, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 cursor-default border bg-indigo-100/50 text-gray-600 border-indigo-200/50 hover:bg-indigo-50/50 hover:text-gray-900 hover:border-indigo-100/50 dark:bg-indigo-900/40 dark:text-gray-400 dark:border-indigo-700 dark:hover:bg-indigo-900/20 dark:hover:text-gray-200">
                                {sug}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Navigace (Sbírky) */}
            {collections && collections.length > 0 && (
                 <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <Layers className="text-gray-400 w-4 h-4" />
                    <span className="text-sm text-gray-500 mr-1">Součást sbírek:</span>
                    {collections.map(col => (
                        <span key={col.id} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                            {col.name}
                        </span>
                    ))}
                 </div>
            )}

            {/* Hluboký ponor */}
            <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Původní popis</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                    {originalDescription}
                </div>
            </div>

        </div>
      </div>

      {/* === PRAVÝ SLOUPEC (Smart Sidebar) === */}
      <div className="lg:col-span-4 w-full">
        <div className="sticky top-6">
            <SmartSidebar 
                chapters={chapters}
                transcript={transcript}
                practicalTips={practicalTips}
                duration={duration}
                currentTime={currentTime}
                onSeek={handleSeek}
            />
        </div>
      </div>

    </div>
  );
}