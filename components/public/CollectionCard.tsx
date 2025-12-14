"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, PlayCircle } from 'lucide-react';

interface CollectionCardProps {
  id: string;
  name: string;
  seoDescription?: string | null;
  videoCount: number;
  thumbnails: string[]; 
  href?: string; // NOVÉ: Volitelný odkaz
}

export default function CollectionCard({
  id,
  name,
  seoDescription,
  videoCount,
  thumbnails = [],
  href // Destructure
}: CollectionCardProps) {
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHovered && thumbnails?.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveThumbIndex((prev) => (prev + 1) % thumbnails.length);
      }, 1500); 
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setActiveThumbIndex(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, thumbnails]);

  const currentThumb = thumbnails && thumbnails.length > 0 ? thumbnails[activeThumbIndex] : null;

  // LOGIKA ODKAZU: Pokud přijde 'href' (z Guides), použij ho. Jinak klasika.
  const targetLink = href || `/collections/${id}`;

  return (
    <Link href={targetLink} className="block group h-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-indigo-500/50 hover:-translate-y-1">
        
        <div 
          className="relative aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
            <Layers size={12} /> {videoCount}
          </div>

          <AnimatePresence mode="popLayout">
            {currentThumb ? (
              <motion.img
                key={currentThumb}
                src={`https://img.youtube.com/vi/${currentThumb}/mqdefault.jpg`}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Layers className="w-12 h-12 opacity-20" />
              </div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center z-10">
            <PlayCircle className="text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 w-12 h-12 drop-shadow-lg" />
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {name}
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
            {seoDescription || "Sbírka videí bez popisu."}
          </p>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
            <span className="group-hover:text-indigo-500 transition-colors font-medium">Prozkoumat sbírku &rarr;</span>
          </div>
        </div>

      </div>
    </Link>
  );
}