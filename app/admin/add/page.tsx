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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  
  // NOVÉ: Úložiště pro debug logy
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const handleFetchFromYoutube = async () => {
    if (!youtubeUrl) return;
    
    setIsFetching(true);
    setFetchWarning(null);
    setError(null);
    setDebugLogs([]); // Reset logů

    try {
      const res = await fetch(`/api/youtube/fetch-data?url=${encodeURIComponent(youtubeUrl)}`);
      const data = await res.json();

      // Uložíme logy, pokud přišly
      if (data.debugLogs) {
          setDebugLogs(data.debugLogs);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Nepodařilo se stáhnout data z YouTube');
      }

      if (data.title) setTitle(data.title);
      if (data.description) setSummary(data.description);
      
      if (typeof data.transcript === 'string') {
        setTranscript(data.transcript);
      } else {
        setFetchWarning('Metadata stažena, ale titulky nebyly nalezeny.');
      }

      if (data.warning) {
         setFetchWarning(data.warning);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

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
          
          {/* --- DEBUG LOG VÝPIS --- */}
          {debugLogs.length > 0 && (
             <div className="mt-4 p-3 bg-gray-900 border border-gray-700 rounded text-xs font-mono text-gray-400 max-h-48 overflow-y-auto">
                <strong className="block mb-1 text-gray-200">Diagnostický Log:</strong>
                {debugLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
             </div>
          )}
          {/* ----------------------- */}
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
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="structuredContent" className="block text-sm font-medium text-gray-300">
            Strukturovaný Obsah (Kapitoly)
          </label>
          <textarea
            id="structuredContent"
            rows={10}
            value={structuredContent}
            onChange={(e) => setStructuredContent(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 font-mono"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Ukládání...' : 'Uložit video'}
          </button>
        </div>
      </form>

      {success && <p className="mt-4 text-sm text-green-500">{success}</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}