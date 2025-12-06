"use client";

import React from 'react';
import { Tag } from 'lucide-react';

interface CollectionHeaderProps {
  name: string;
  description?: string | null;
  keywords: string[];
  thumbnails: string[]; // Pole YouTube ID pro generování pozadí
}

export default function CollectionHeader({
  name,
  description,
  keywords,
  thumbnails
}: CollectionHeaderProps) {
  
  // Vezmeme maximálně 4 náhledy pro pozadí, aby to nebylo přeplácané
  const bgImages = thumbnails.slice(0, 4);

  return (
    <div className="relative w-full overflow-hidden bg-gray-900 text-white min-h-[400px] flex items-center justify-center">
      
      {/* === 1. AMBIENTNÍ POZADÍ === */}
      <div className="absolute inset-0 grid grid-cols-2 opacity-40">
        {bgImages.map((id, index) => (
          <div key={index} className="relative w-full h-full">
            <img 
              src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} 
              alt="" 
              className="w-full h-full object-cover filter blur-xl scale-110" 
            />
          </div>
        ))}
        {/* Pokud nejsou obrázky, fallback gradient */}
        {bgImages.length === 0 && (
           <div className="col-span-2 w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900"></div>
        )}
      </div>

      {/* Tmavý gradient překryv pro čitelnost */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
      <div className="absolute inset-0 bg-black/30" />

      {/* === 2. OBSAH === */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16">
        
        {/* Štítky (Keywords) */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {keywords.map((keyword, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 uppercase tracking-wider"
              >
                <Tag size={10} className="mr-1.5" />
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* Titulek */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
          {name}
        </h1>

        {/* AI Popis (Průvodce) */}
        <div className="prose prose-lg prose-invert mx-auto text-gray-200 leading-relaxed">
          {description ? (
            <p>{description}</p>
          ) : (
            <p className="italic opacity-70">Tato sbírka zatím nemá kurátorský popis.</p>
          )}
        </div>

      </div>
    </div>
  );
}