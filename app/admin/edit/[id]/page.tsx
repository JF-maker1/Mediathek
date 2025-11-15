"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Definujeme typ pro data videa, která budeme načítat a upravovat
interface VideoData {
  youtubeId: string;
  title: string;
  summary: string;
  structuredContent: string; // Budeme načítat text, ne parsovaná data
}

export default function EditVideoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string; // Získání ID z URL

  // Stavy pro formulář
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [structuredContent, setStructuredContent] = useState('');

  // Stavy pro načítání dat
  const [youtubeId, setYoutubeId] = useState(''); // ID je neměnné, jen ho zobrazíme
  const [isPageLoading, setIsPageLoading] = useState(true); // Načítání stránky

  // Stavy pro odesílání
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // FR5: Načtení dat pro předvyplnění formuláře
  useEffect(() => {
    if (!id) return;

    const fetchVideoData = async () => {
      setIsPageLoading(true);
      try {
        const res = await fetch(`/api/videos/${id}`);
        if (!res.ok) {
          throw new Error('Nepodařilo se načíst data videa.');
        }
        const data = await res.json();

        // Předvyplnění formuláře
        setTitle(data.title);
        setSummary(data.summary);
        setYoutubeId(data.youtubeId);

        // ZJEDNODUŠENÍ: Databáze nyní obsahuje kompletní text v ch.text
        let content = '';
        if (data.chapters && data.chapters.length > 0) {
          // Nyní jen vezmeme 'text' (Zdroj Pravdy) a spojíme řádky
          content = data.chapters
            .map((ch: any) => ch.text) // ch.text je nyní "1.1. Úvod (0:15 - 0:45)"
            .join('\n');
        }
        setStructuredContent(content);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchVideoData();
  }, [id]);

  // FR6: Funkce pro aktualizaci
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // ID a youtubeUrl neposíláme, ty se nemění
          title,
          summary,
          structuredContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Aktualizace se nezdařila');
      }

      setSuccess('Záznam byl úspěšně aktualizován!');

      // FR7: Přesměrování
      setTimeout(() => {
        router.push('/admin/manage');
      }, 1500); // Necháme uživatele přečíst zprávu o úspěchu

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPageLoading) {
    return <p className="text-center p-8">Načítání dat videa...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Upravit video</h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Zobrazení neměnného YouTube ID */}
        <div>
          <label className="block text-sm font-medium text-gray-300">
            YouTube ID (nelze měnit)
          </label>
          <input
            type="text"
            value={youtubeId}
            disabled
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-900 shadow-sm text-gray-400 p-2"
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300">
            Název videa
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-300">
            Shrnutí / Popis
          </label>
          <textarea
            id="summary"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
          />
        </div>

        <div>
          <label htmlFor="structuredContent" className="block text-sm font-medium text-gray-300">
            Strukturovaný Obsah (Kapitoly)
          </label>
          <textarea
            id="structuredContent"
            rows={15}
            value={structuredContent}
            onChange={(e) => setStructuredContent(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 font-mono"
          />
          <p className="mt-2 text-xs text-gray-400">
            Formát: "1.1. Text (MM:SS - MM:SS)". Hierarchie dle číslování.
          </p>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Aktualizuji...' : 'Aktualizovat záznam'}
          </button>
        </div>
      </form>

      {success && (
        <p className="mt-4 text-sm text-green-500">{success}</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}