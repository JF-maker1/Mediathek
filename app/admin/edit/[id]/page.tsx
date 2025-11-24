"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Collection {
  id: string;
  name: string;
}

interface VideoData {
  youtubeId: string;
  title: string;
  summary: string;
  transcript?: string | null;
  chapters?: { text: string }[];
  collections?: Collection[];
}

export default function EditVideoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // --- Stavy formuláře ---
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [transcript, setTranscript] = useState('');
  const [structuredContent, setStructuredContent] = useState('');
  
  // --- Stavy pro sbírky ---
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // --- Stavy UI ---
  const [youtubeId, setYoutubeId] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // NOVÉ: Stav pro AI
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);

  // LOGOVÁNÍ (Stejné jako v Add page)
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  // 1. Načtení dat při startu
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setIsPageLoading(true);
      try {
        const [videoRes, collectionsRes] = await Promise.all([
          fetch(`/api/videos/${id}`),
          fetch('/api/collections')
        ]);

        if (!videoRes.ok) throw new Error('Nepodařilo se načíst data videa.');
        if (!collectionsRes.ok) throw new Error('Nepodařilo se načíst seznam sbírek.');

        const videoData: VideoData = await videoRes.json();
        const collectionsData: Collection[] = await collectionsRes.json();

        setTitle(videoData.title);
        setSummary(videoData.summary);
        setYoutubeId(videoData.youtubeId);
        if (videoData.transcript) setTranscript(videoData.transcript);

        let content = '';
        if (videoData.chapters && videoData.chapters.length > 0) {
          content = videoData.chapters.map((ch: any) => ch.text).join('\n');
        }
        setStructuredContent(content);

        setAllCollections(collectionsData);
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

  const toggleCollection = (collectionId: string) => {
    setSelectedCollectionIds(prev => {
      if (prev.includes(collectionId)) {
        return prev.filter(id => id !== collectionId);
      } else {
        return [...prev, collectionId];
      }
    });
  };

  // 2. Načtení z YouTube (Refresh)
  const handleFetchFromYoutube = async () => {
    if (!youtubeId) return;

    const reconstructedUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    
    setIsFetching(true);
    setFetchWarning(null);
    setDebugLogs([]);
    addLog(`Aktualizuji data pro ID: ${youtubeId}`);
    
    try {
      const res = await fetch(`/api/youtube/fetch-data?url=${encodeURIComponent(reconstructedUrl)}`);
      const data = await res.json();

      if (data.debugLogs) {
          setDebugLogs(prev => [...data.debugLogs, ...prev]);
      }

      if (!res.ok) throw new Error(data.message || 'Chyba při stahování');

      if (!title || confirm('Chcete přepsat stávající NÁZEV novým z YouTube?')) {
         if (data.title) setTitle(data.title);
      }
      if (!summary || confirm('Chcete přepsat stávající SHRNUTÍ novým z YouTube?')) {
         if (data.description) setSummary(data.description);
      }
      
      if (data.transcript) {
        if (!transcript || confirm('Chcete nahradit stávající PŘEPIS nově staženým?')) {
           setTranscript(data.transcript);
           addLog('Přepis aktualizován.');
        }
      } else {
        setFetchWarning('Metadata stažena, ale titulky nebyly nalezeny.');
      }

    } catch (err: any) {
      addLog(`Chyba: ${err.message}`);
      alert('Chyba: ' + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  // 3. AI GENERATOR (Robustní verze)
  const handleAiGenerate = async () => {
    if (!transcript) return;

    setIsAiGenerating(true);
    setFetchWarning(null);
    setDebugLogs([]); // Reset logu pro čistý přehled AI akce
    addLog('⚡ Inicializace AI modelu...');
    addLog('📄 Odesílám přepis na server...');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      addLog(`📡 Server odpověděl: Status ${res.status}`);
      const rawText = await res.text();
      
      let data;
      try {
          data = JSON.parse(rawText);
      } catch (e) {
          throw new Error('Server nevrátil platný JSON. Viz konzole.');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Chyba při generování obsahu');
      }

      if (structuredContent && !confirm('Pole již obsahuje data. Chcete je přepsat výstupem z AI?')) {
          addLog('⚠️ Operace zrušena uživatelem.');
          return;
      }

      if (data.content) {
        setStructuredContent(data.content);
        addLog(`✅ Obsah v pořádku (${data.content.length} znaků). Vloženo.`);
        setSuccess('AI obsah byl vygenerován.');
      }

    } catch (err: any) {
      console.error(err);
      addLog(`❌ Chyba: ${err.message}`);
      setError(`Chyba AI: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // 4. Odeslání formuláře
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
          transcript,
          structuredContent,
          collectionIds: selectedCollectionIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Aktualizace se nezdařila');
      }

      setSuccess('Záznam byl úspěšně aktualizován!');
      setDebugLogs([]);
      
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upravit video</h1>
        
        <button
           type="button"
           onClick={handleFetchFromYoutube}
           disabled={isFetching}
           className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center gap-2 transition-colors"
        >
           {isFetching ? 'Stahuji...' : '↻ Aktualizovat data z YouTube'}
        </button>
      </div>

      {/* DIAGNOSTICKÝ LOG PANEL */}
      {debugLogs.length > 0 && (
        <div className="mb-6 p-3 bg-black border border-gray-700 rounded font-mono text-xs text-green-400 max-h-48 overflow-y-auto shadow-inner">
            <strong className="block mb-1 text-gray-500 border-b border-gray-800 pb-1">SYSTEM LOG:</strong>
            {debugLogs.map((log, i) => (
                <div key={i} className="py-0.5 border-b border-gray-900 last:border-0">{log}</div>
            ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* YouTube ID (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-300">
            YouTube ID
          </label>
          <input
            type="text"
            value={youtubeId}
            disabled
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-900 shadow-sm text-gray-400 p-2 cursor-not-allowed"
          />
          {fetchWarning && <p className="text-xs text-yellow-400 mt-1">{fetchWarning}</p>}
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

        {/* --- SBÍRKY --- */}
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
        </div>

        {/* Přepis videa */}
        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-gray-300">
            Přepis videa (Transcript)
          </label>
          <textarea
            id="transcript"
            rows={8}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 text-sm font-mono bg-gray-900"
            placeholder="Zde se objeví stažený přepis titulků..."
          />
          <p className="mt-1 text-xs text-gray-500">
             Tento text bude použit pro AI generování kapitol.
          </p>
        </div>

        {/* Strukturovaný obsah */}
        <div>
            <div className="flex justify-between items-end mb-1">
                <label htmlFor="structuredContent" className="block text-sm font-medium text-gray-300">
                    Strukturovaný Obsah (Kapitoly)
                </label>
                
                <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={!transcript || isAiGenerating}
                    className={`text-xs font-bold py-1 px-3 rounded transition-colors flex items-center gap-2 ${
                        !transcript 
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20'
                    }`}
                >
                    {isAiGenerating ? (
                    <>
                        <span className="animate-spin">⚙️</span> Generuji...
                    </>
                    ) : (
                    <>
                        ✨ Vytvořit obsah pomocí AI
                    </>
                    )}
                </button>
            </div>

          <textarea
            id="structuredContent"
            rows={15}
            value={structuredContent}
            onChange={(e) => setStructuredContent(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 font-mono"
          />
          <p className="mt-2 text-xs text-gray-400">
            Formát: "1.1. Text (MM:SS - MM:SS)".
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