"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteButtonProps {
  videoId: string;
}

export default function DeleteButton({ videoId }: DeleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      // FIX: Pokud server vrátí 404 (Not Found), znamená to, že video už neexistuje.
      // Z pohledu uživatele je cíl splněn (video je pryč), takže to nepovažujeme za chybu.
      if (!res.ok && res.status !== 404) {
        const data = await res.json();
        throw new Error(data.message || 'Smazání se nezdařilo');
      }

      setShowModal(false);
      // Refresh stránky pro aktualizaci seznamu
      router.refresh(); 
      
      // Volitelně: Pokud jsme na detailu videa, přesměrujeme na seznam
      if (typeof window !== 'undefined' && window.location.pathname.includes(`/video/${videoId}`)) {
          router.push('/admin/manage');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
            e.preventDefault(); // Prevence prokliknutí odkazu v rodiči (pokud je v kartě)
            setShowModal(true);
        }}
        className="text-red-500 hover:text-red-700 hover:underline font-medium px-2 py-1 transition-colors"
        disabled={isLoading}
      >
        Smazat
      </button>

      {/* --- Modální okno pro potvrzení --- */}
      {showModal && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()} // Izolace kliků
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-700 transform scale-100 transition-all">
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Potvrdit smazání</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
                Opravdu si přejete trvale smazat toto video a všechna jeho data?
                <br/><span className="text-xs text-red-500 mt-2 block font-semibold">Tato akce je nevratná.</span>
            </p>
            
            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded text-sm">
                    {error}
                </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="py-2 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                disabled={isLoading}
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                className="py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>}
                {isLoading ? 'Mazání...' : 'Smazat navždy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}