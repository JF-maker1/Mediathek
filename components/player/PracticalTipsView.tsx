"use client";

import React, { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface PracticalTipsViewProps {
  tips: string[];
}

export default function PracticalTipsView({ tips }: PracticalTipsViewProps) {
  // Lokální stav pro "zaškrtnutí" (zatím jen vizuální v rámci session)
  const [checkedState, setCheckedState] = useState<boolean[]>(
    new Array(tips.length).fill(false)
  );

  const toggleTip = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
  };

  if (!tips || tips.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500 italic text-sm">Pro toto video nejsou k dispozici žádné praktické tipy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-1">
      {tips.map((tip, index) => {
        const isChecked = checkedState[index];
        return (
          <div 
            key={index}
            onClick={() => toggleTip(index)}
            className={`
              flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all duration-200
              ${isChecked 
                /* STAV: POKLAD (Treasure) - Zlatavé pozadí (hodnota) + Zelená fajfka (růst) */
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 shadow-sm' 
                /* STAV: NEVYBRÁNO */
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700'
              }
            `}
          >
            {/* IKONA: Zelená fajfka (Sprout) */}
            <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? 'text-green-600 dark:text-green-500' : 'text-gray-400'}`}>
              {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
            
            {/* TEXT: Tmavý, čitelný, zvýrazněný */}
            <p className={`text-sm leading-relaxed transition-colors ${isChecked ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              {tip}
            </p>
          </div>
        );
      })}
    </div>
  );
}