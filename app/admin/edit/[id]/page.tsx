"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Definice typů pro TypeScript
interface Collection {
  id: string;
  name: string;
}

interface VideoData {
  youtubeId: string;
  title: string;
  summary: string;
  chapters?: { text: string }[];
  collections?: Collection[]; // Video nám vrátí seznam objektů sbírek, ve kterých je
}

export default function EditVideoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // --- Stavy formuláře ---
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [structuredContent, setStructuredContent] = useState('');
  
  // --- NOVÉ: Stavy pro sbírky ---
  const [allCollections, setAllCollections] = useState<Collection[]>([]); // Všechny dostupné sbírky
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]); // ID vybraných sbírek

  // --- Stavy UI ---
  const [youtubeId, setYoutubeId] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Načtení dat při startu
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setIsPageLoading(true);
      try {
        // Spustíme oba dotazy paralelně pro rychlejší načtení
        const [videoRes, collectionsRes] = await Promise.all([
          fetch(`/api/videos/${id}`),     // Načtení videa
          fetch('/api/collections')       // Načtení všech dostupných sbírek
        ]);

        if (!videoRes.ok) throw new Error('Nepodařilo se načíst data videa.');
        if (!collectionsRes.ok) throw new Error('Nepodařilo se načíst seznam sbírek.');

        const videoData: VideoData = await videoRes.json();
        const collectionsData: Collection[] = await collectionsRes.json();

        // A. Nastavení dat videa
        setTitle(videoData.title);
        setSummary(videoData.summary);
        setYoutubeId(videoData.youtubeId);

        // Složení textu kapitol
        let content = '';
        if (videoData.chapters && videoData.chapters.length > 0) {
          content = videoData.chapters.map((ch: any) => ch.text).join('\n');
        }
        setStructuredContent(content);

        // B. Nastavení sbírek
        setAllCollections(collectionsData);

        // Zde převedeme pole objektů [{id: "1", name: "A"}, ...] na pole ID ["1", ...]
        if (videoData.collections) {
          const initialIds = videoData.collections.map(col => col.id);
          setSelectedCollectionIds(initialIds);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsPageLoading(false);
      }
    };

    loadData();
  }, [id]);

  // 2. Logika pro zaškrtávání checkboxů
  const toggleCollection = (collectionId: string) => {
    setSelectedCollectionIds(prev => {
      if (prev.includes(collectionId)) {
        // Pokud už je v seznamu, odstraníme ho
        return prev.filter(id => id !== collectionId);
      } else {
        // Pokud není, přidáme ho
        return [...prev, collectionId];
      }
    });
  };

  // 3. Odeslání formuláře
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
          title,
          summary,
          structuredContent,
          collectionIds: selectedCollectionIds, // NOVÉ: Posíláme pole ID sbírek
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Aktualizace se nezdařila');
      }

      setSuccess('Záznam byl úspěšně aktualizován!');
      
      setTimeout(() => {
        router.push('/admin/manage');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPageLoading) {
    return <p className="text-center p-8 text-gray-400">Načítání dat videa a sbírek...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Upravit video</h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* YouTube ID (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-300">
            YouTube ID (nelze měnit)
          </label>
          <input
            type="text"
            value={youtubeId}
            disabled
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-900 shadow-sm text-gray-400 p-2 cursor-not-allowed"
          />
        </div>

        {/* Název */}
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

        {/* Shrnutí */}
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

        {/* --- NOVÁ SEKCE: SBÍRKY --- */}
        <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Zařadit do sbírek</h3>
          
          {allCollections.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Zatím nemáte vytvořeny žádné sbírky.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {allCollections.map((collection) => (
                <label key={collection.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedCollectionIds.includes(collection.id)}
                    onChange={() => toggleCollection(collection.id)}
                    className="h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-200">{collection.name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
             Vyberte sbírky, ve kterých se má toto video zobrazovat.
          </p>
        </div>
        {/* --------------------------- */}

        {/* Strukturovaný obsah */}
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

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 w-full sm:w-auto"
          >
            {isSubmitting ? 'Ukládání...' : 'Uložit změny'}
          </button>
        </div>
      </form>

      {success && (
        <div className="mt-4 p-3 bg-green-900/30 border border-green-500 rounded text-green-400 text-sm text-center">
          {success}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}