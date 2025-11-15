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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Smazání se nezdařilo');
      }

      setShowModal(false);
      // FR7: Přesměrování zpět (nebo refresh)
      // `push` je lepší pro zajištění čerstvých dat ze serveru (RSC)
      router.push('/admin/manage');
      router.refresh(); // Zajistí re-fetch dat na /admin/manage
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-red-500 hover:text-red-700 hover:underline"
        disabled={isLoading}
      >
        Smazat
      </button>

      {/* --- Modální okno pro potvrzení --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Potvrdit smazání</h3>
            <p className="mb-6">Opravdu si přejete trvale smazat toto video a všechny jeho kapitoly?</p>
            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="py-2 px-4 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                disabled={isLoading}
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                className="py-2 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Mazání...' : 'Potvrdit smazání'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
