"use client";

import React, { useState } from 'react';
import { List, FileText, CheckCircle2 } from 'lucide-react';
import { Prisma } from '@prisma/client';
import clsx from 'clsx';
import ChapterList from '@/components/ChapterList';
import TranscriptView from './TranscriptView';
import PracticalTipsView from './PracticalTipsView';

type Chapter = Prisma.ChapterGetPayload<{}>;

interface SmartSidebarProps {
  chapters: Chapter[];
  transcript: string | null;
  practicalTips: string[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  playerRef?: any;
}

type TabType = 'chapters' | 'transcript' | 'tips';

export default function SmartSidebar({
  chapters,
  transcript,
  practicalTips,
  duration,
  currentTime,
  onSeek
}: SmartSidebarProps) {
  
  const [activeTab, setActiveTab] = useState<TabType>(
    chapters.length > 0 ? 'chapters' : (transcript ? 'transcript' : 'tips')
  );

  const tabs = [
    { id: 'chapters', label: 'Kapitoly', icon: List, disabled: chapters.length === 0 },
    { id: 'transcript', label: 'Přepis', icon: FileText, disabled: !transcript },
    { id: 'tips', label: 'Tipy', icon: CheckCircle2, disabled: practicalTips.length === 0 },
  ] as const;

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-100px)] min-h-[500px]">
      
      {/* Hlavička */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
            disabled={tab.disabled}
            className={clsx(
              "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 text-xs sm:text-sm font-medium transition-all relative outline-none",
              tab.disabled && "opacity-40 cursor-not-allowed",
              !tab.disabled && "hover:bg-white dark:hover:bg-gray-700",
              activeTab === tab.id 
                ? "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 shadow-sm" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <tab.icon size={18} className={activeTab === tab.id ? "text-indigo-600" : "text-gray-400"} />
            <span>{tab.label}</span>
            
            {activeTab === tab.id && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tělo */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-white dark:bg-gray-800">
        
        {activeTab === 'chapters' && (
           <div className="p-4">
              <ChapterList 
                chapters={chapters} 
                // ZMĚNA: Předáváme currentTime pro zvýraznění
                currentTime={currentTime}
                playerRef={{ current: { seekTo: onSeek, playVideo: () => {} } } as any} 
              />
           </div>
        )}

        {activeTab === 'transcript' && transcript && (
          <div className="p-2">
            <TranscriptView
              transcript={transcript}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="p-4">
            <PracticalTipsView tips={practicalTips} />
          </div>
        )}

      </div>
    </div>
  );
}