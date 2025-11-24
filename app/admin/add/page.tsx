"use client";

import { useState, FormEvent } from 'react';

export default function AddVideoPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [transcript, setTranscript] = useState('');
  const [structuredContent, setStructuredContent] = useState('');

  const [isLoading, setIsLoading] = useState(false); 
  const [isFetching, setIsFetching] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false); // Stav pro AI

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  
  // Úložiště pro debug logy
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
     const timestamp = new Date().toLocaleTimeString();
     setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleFetchFromYoutube = async () => {
    if (!youtubeUrl) return;
    
    setIsFetching(true);
    setFetchWarning(null);
    setError(null);
    setDebugLogs([]); 
    addLog(`Start request for URL: ${youtubeUrl}`);

    try {
      const res = await fetch(`/api/youtube/fetch-data?url=${encodeURIComponent(youtubeUrl)}`);
      const data = await res.json();

      if (data.debugLogs) {
          setDebugLogs(prev => [...data.debugLogs, ...prev]);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Nepodařilo se stáhnout data z YouTube');
      }

      if (data.title) setTitle(data.title);
      if (data.description) setSummary(data.description);
      
      if (typeof data.transcript === 'string') {
        setTranscript(data.transcript);
        addLog(`Přepis stažen (${data.transcript.length} znaků)`);
      } else {
        setFetchWarning('Metadata stažena, ale titulky nebyly nalezeny.');
      }

      if (data.warning) {
         setFetchWarning(data.warning);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      addLog(`Chyba YT: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  // --- TOTO JE TA UPRAVENÁ FUNKCE PRO AI ---
  const handleAiGenerate = async () => {
    if (!transcript) return;

    setIsAiGenerating(true);
    setError(null);
    // Vyčistíme staré logy ať vidíme jen AI akci
    setDebugLogs([]); 
    addLog('⚡ Inicializace AI modelu...');
    addLog('📄 Odesílám přepis na server...');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      addLog(`📡 Server odpověděl: Status ${res.status} ${res.statusText}`);

      // 1. Přečteme odpověď jako text (raw), abychom viděli, co server poslal
      const rawText = await res.text();
      addLog(`📦 Přijato dat: ${rawText.length} znaků`);

      // 2. Zkusíme to parsovat jako JSON
      let data;
      try {
          data = JSON.parse(rawText);
      } catch (e) {
          console.error("JSON Parse Error:", e);
          console.log("Raw Text:", rawText);
          throw new Error(`Server nevrátil platný JSON. Přišlo: "${rawText.substring(0, 50)}..."`);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Chyba při generování obsahu');
      }

      // 3. Kontrola obsahu
      if (!data.content) {
          addLog('⚠️ Varování: Pole "content" v odpovědi je prázdné!');
      } else {
          addLog(`✅ Obsah v pořádku (${data.content.length} znaků). Vkládám...`);
          setStructuredContent(data.content);
      }
      
    } catch (err: any) {
      console.error(err);
      addLog(`❌ KRITICKÁ CHYBA: ${err.message}`);
      setError(`Chyba AI: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };
  // -----------------------------------------

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl,
          title,
          summary,
          transcript, 
          structuredContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Něco se pokazilo');
      }

      setSuccess('Video bylo úspěšně přidáno!');
      setYoutubeUrl('');
      setTitle('');
      setSummary('');
      setTranscript('');
      setStructuredContent('');
      setFetchWarning(null);
      setDebugLogs([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Přidat nové video</h1>
      
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
        
        <div>
          <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-300">
            YouTube URL
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              required
              className="block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <button
              type="button"
              onClick={handleFetchFromYoutube}
              disabled={isFetching || !youtubeUrl}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isFetching ? 'Načítám...' : 'Načíst data z YouTube'}
            </button>
          </div>
          {fetchWarning && (
            <p className="mt-2 text-sm text-yellow-400">{fetchWarning}</p>
          )}
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
          <label htmlFor="transcript" className="block text-sm font-medium text-gray-300">
            Přepis videa (Transcript)
          </label>
          <textarea
            id="transcript"
            rows={8}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 text-sm font-mono bg-gray-900"
          />
        </div>

        {/* TLAČÍTKO PRO AI GENERATOR */}
        <div>
            <div className="flex justify-between items-end mb-2">
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
                rows={10}
                value={structuredContent}
                onChange={(e) => setStructuredContent(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 font-mono"
                placeholder="Zde se objeví vygenerovaný obsah..."
            />
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Ukládání...' : 'Uložit video'}
          </button>
        </div>
      </form>

      {success && <p className="mt-4 text-sm text-green-500 text-center font-bold">{success}</p>}
      {error && <p className="mt-4 text-sm text-red-500 text-center font-bold">{error}</p>}
    </div>
  );
}