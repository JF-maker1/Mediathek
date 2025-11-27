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
  // Fáze 12 pole
  seoSummary?: string | null;
  seoKeywords?: string[];
  practicalTips?: string[];
  aiSuggestions?: string[];
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
  
  // --- FÁZE 12: SEO Stavy ---
  const [seoSummary, setSeoSummary] = useState('');
  const [seoKeywords, setSeoKeywords] = useState(''); // Editujeme jako string oddělený čárkami
  const [practicalTips, setPracticalTips] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  // ---------------------------

  // --- Stavy pro sbírky ---
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // --- Stavy UI ---
  const [youtubeId, setYoutubeId] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Stavy pro AI
  const [isAiGenerating, setIsAiGenerating] = useState(false); // Kapitoly
  const [isSeoGenerating, setIsSeoGenerating] = useState(false); // SEO (Fáze 12)
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);

  // LOGOVÁNÍ
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

        // Základní data
        setTitle(videoData.title);
        setSummary(videoData.summary);
        setYoutubeId(videoData.youtubeId);
        if (videoData.transcript) setTranscript(videoData.transcript);

        // Kapitoly
        let content = '';
        if (videoData.chapters && videoData.chapters.length > 0) {
          content = videoData.chapters.map((ch: any) => ch.text).join('\n');
        }
        setStructuredContent(content);

        // FÁZE 12: SEO Data
        if (videoData.seoSummary) setSeoSummary(videoData.seoSummary);
        if (videoData.seoKeywords) setSeoKeywords(videoData.seoKeywords.join(', '));
        if (videoData.practicalTips) setPracticalTips(videoData.practicalTips);
        if (videoData.aiSuggestions) setAiSuggestions(videoData.aiSuggestions);

        // Sbírky
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

  // --- Pomocné funkce pro SEO UI ---
  const handleAddTip = () => {
    setPracticalTips([...practicalTips, '']);
  };

  const handleRemoveTip = (index: number) => {
    const newTips = practicalTips.filter((_, i) => i !== index);
    setPracticalTips(newTips);
  };

  const handleTipChange = (index: number, value: string) => {
    const newTips = [...practicalTips];
    newTips[index] = value;
    setPracticalTips(newTips);
  };

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
      if (data.debugLogs) setDebugLogs(prev => [...data.debugLogs, ...prev]);

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

  // 3. AI GENERATOR (Kapitoly)
  const handleAiGenerateChapters = async () => {
    if (!transcript) return;
    setIsAiGenerating(true);
    setDebugLogs([]); 
    addLog('⚡ Inicializace AI modelu (Kapitoly)...');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch (e) { throw new Error('Server nevrátil platný JSON.'); }

      if (!res.ok) throw new Error(data.message || 'Chyba při generování');

      if (data.content) {
        setStructuredContent(data.content);
        addLog(`✅ Kapitoly vygenerovány.`);
        setSuccess('AI obsah byl vygenerován.');
      }
    } catch (err: any) {
      addLog(`❌ Chyba: ${err.message}`);
      setError(`Chyba AI: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // 4. AI GENERATOR (SEO - Fáze 12)
  const handleAiGenerateSeo = async () => {
    if (!transcript) return;
    setIsSeoGenerating(true);
    setDebugLogs([]); // Vyčistíme log pro novou akci
    addLog('🔍 Inicializace AI modelu (SEO & Sémantika)...');
    addLog('Odesílám přepis k analýze...');

    try {
      const res = await fetch('/api/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      const jsonRes = await res.json();

      if (!res.ok) {
        throw new Error(jsonRes.message || 'Chyba při generování SEO');
      }

      const { data } = jsonRes;
      addLog('✅ AI data přijata. Aktualizuji formulář...');

      // Naplnění formuláře
      if (data.summary) setSeoSummary(data.summary);
      if (data.keywords && Array.isArray(data.keywords)) {
        setSeoKeywords(data.keywords.join(', '));
      }
      if (data.practical_tips && Array.isArray(data.practical_tips)) {
        setPracticalTips(data.practical_tips);
      }
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      }

      setSuccess('SEO metadata byla úspěšně vygenerována.');

    } catch (err: any) {
      console.error(err);
      addLog(`❌ Chyba SEO AI: ${err.message}`);
      setError(`Chyba SEO AI: ${err.message}`);
    } finally {
      setIsSeoGenerating(false);
    }
  };

  // 5. Odeslání formuláře
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Příprava keywords (split string to array)
    const keywordsArray = seoKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

    // Filtrace prázdných tipů
    const tipsArray = practicalTips.filter(t => t.trim().length > 0);

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
          // Nová data
          seoSummary,
          seoKeywords: keywordsArray,
          practicalTips: tipsArray,
          aiSuggestions, // Posíláme pro uložení, i když je readonly
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
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

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* --- ČÁST 1: ZÁKLADNÍ INFO --- */}
        <section className="space-y-4 border-b border-gray-700 pb-6">
            <h2 className="text-xl font-semibold text-gray-200">Základní informace</h2>
            <div>
            <label className="block text-sm font-medium text-gray-300">YouTube ID</label>
            <input type="text" value={youtubeId} disabled className="mt-1 block w-full rounded-md border-gray-600 bg-gray-900 text-gray-400 p-2 cursor-not-allowed" />
            </div>

            <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">Název videa</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2" />
            </div>

            <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-300">Původní Popis (YouTube)</label>
            <textarea id="summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2" />
            </div>
        </section>

        {/* --- ČÁST 2: SBÍRKY --- */}
        <section className="bg-gray-900 p-4 rounded-md border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Zařadit do sbírek</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {allCollections.map((collection) => (
              <label key={collection.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                <input type="checkbox" checked={selectedCollectionIds.includes(collection.id)} onChange={() => toggleCollection(collection.id)} className="h-4 w-4 rounded border-gray-600 text-indigo-600 bg-gray-700" />
                <span className="text-sm text-gray-200">{collection.name}</span>
              </label>
            ))}
          </div>
        </section>

        {/* --- ČÁST 3: PŘEPIS --- */}
        <section className="space-y-4 border-b border-gray-700 pb-6">
            <h2 className="text-xl font-semibold text-gray-200">Přepis (Zdroj pro AI)</h2>
            <textarea
                rows={6}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2 text-sm font-mono bg-gray-900"
                placeholder="Zde se objeví stažený přepis titulků..."
            />
        </section>

        {/* --- ČÁST 4: KAPITOLY --- */}
        <section className="space-y-4 border-b border-gray-700 pb-6">
             <div className="flex justify-between items-end">
                <h2 className="text-xl font-semibold text-gray-200">Strukturovaný obsah (Kapitoly)</h2>
                <button
                    type="button"
                    onClick={handleAiGenerateChapters}
                    disabled={!transcript || isAiGenerating}
                    className={`text-xs font-bold py-1 px-3 rounded flex items-center gap-2 ${!transcript ? 'bg-gray-700 text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                    {isAiGenerating ? <span className="animate-spin">⚙️</span> : '✨ Generovat kapitoly'}
                </button>
            </div>
            <textarea
                rows={10}
                value={structuredContent}
                onChange={(e) => setStructuredContent(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2 font-mono"
            />
        </section>

        {/* --- ČÁST 5: SEO A SÉMANTIKA (FÁZE 12) --- */}
        <section className="space-y-6 bg-gradient-to-r from-gray-900 to-indigo-900/20 p-6 rounded-lg border border-indigo-500/30">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-indigo-100">SEO a Sémantika</h2>
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">Fáze 12</span>
                </div>
                
                <button
                    type="button"
                    onClick={handleAiGenerateSeo}
                    disabled={!transcript || isSeoGenerating}
                    className={`text-sm font-bold py-2 px-4 rounded shadow-lg transition-all flex items-center gap-2 ${
                        !transcript 
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50 hover:scale-105'
                    }`}
                >
                    {isSeoGenerating ? (
                        <>
                            <span className="animate-spin">⚙️</span> Analyzuji video...
                        </>
                    ) : (
                        <>
                            ✨ Vygenerovat SEO metadata
                        </>
                    )}
                </button>
            </div>

            {/* Abstrakt */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">AI Abstrakt (Kontext + Řešení)</label>
                <textarea
                    rows={4}
                    value={seoSummary}
                    onChange={(e) => setSeoSummary(e.target.value)}
                    className="w-full rounded-md border-gray-600 bg-gray-800 text-white p-3 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500"
                    placeholder="Zde se vygeneruje bohatý popis obsahu..."
                />
            </div>

            {/* Klíčová slova */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Klíčová slova (oddělená čárkou)</label>
                <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full rounded-md border-gray-600 bg-gray-800 text-white p-2 text-sm"
                    placeholder="např. Stárnutí, Kortisol, Adaptogeny"
                />
            </div>

            {/* Praktické tipy (Dynamický seznam) */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Praktické tipy a Rady</label>
                <div className="space-y-2">
                    {practicalTips.map((tip, index) => (
                        <div key={index} className="flex gap-2">
                            <span className="text-gray-500 py-2 select-none">{index + 1}.</span>
                            <input
                                type="text"
                                value={tip}
                                onChange={(e) => handleTipChange(index, e.target.value)}
                                className="flex-1 rounded-md border-gray-600 bg-gray-800 text-white p-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveTip(index)}
                                className="px-3 text-red-400 hover:bg-red-900/30 rounded"
                                title="Odstranit tip"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddTip}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1"
                    >
                        + Přidat další tip
                    </button>
                </div>
            </div>

            {/* Návrhy sbírek (Read-only) */}
            {aiSuggestions.length > 0 && (
                <div className="bg-indigo-900/30 p-3 rounded border border-indigo-500/20">
                    <p className="text-xs text-indigo-300 font-bold mb-2">AI Návrhy pro sbírky:</p>
                    <div className="flex flex-wrap gap-2">
                        {aiSuggestions.map((sug, i) => (
                            <span key={i} className="text-xs bg-indigo-800/50 text-indigo-200 px-2 py-1 rounded-full border border-indigo-600/30">
                                {sug}
                            </span>
                        ))}
                    </div>
                </div>
            )}

        </section>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-700">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-8 text-base font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 w-full sm:w-auto"
          >
            {isSubmitting ? 'Ukládání...' : 'Uložit všechny změny'}
          </button>
        </div>
      </form>

      {success && (
        <div className="fixed bottom-8 right-8 p-4 bg-green-900 border border-green-500 rounded shadow-2xl text-green-100 flex items-center gap-3 animate-fade-in-up">
          <span className="text-xl">✅</span> {success}
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