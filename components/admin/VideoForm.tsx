"use client";

import { useState, FormEvent, useEffect } from 'react';
import { Sparkles, ExternalLink, RefreshCw, BrainCircuit, CheckCircle } from 'lucide-react';

// Definice datové struktury, se kterou formulář pracuje
export interface VideoFormData {
  youtubeUrl: string;
  title: string;
  summary: string;
  transcript: string;
  structuredContent: string;
  collectionIds: string[];
  // Fáze 12 - SEO pole
  seoSummary: string;
  seoKeywords: string[];
  practicalTips: string[];
  aiSuggestions: string[];
  // AI Architekt (DCVA) pole
  coreTaxonomy?: any;
}

// Definice pro sbírky (pro výběr)
interface Collection {
  id: string;
  name: string;
  description?: string;
}

// Props komponenty
interface VideoFormProps {
  initialData?: VideoFormData;
  collections: Collection[];
  onSubmit: (data: VideoFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  youtubeIdReadOnly?: boolean;
}

export default function VideoForm({
  initialData,
  collections,
  onSubmit,
  isSubmitting,
  submitButtonText,
  youtubeIdReadOnly = false
}: VideoFormProps) {
  
  // --- 1. INICIALIZACE STAVŮ ---
  const [youtubeInput, setYoutubeInput] = useState(initialData?.youtubeUrl || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [transcript, setTranscript] = useState(initialData?.transcript || '');
  const [structuredContent, setStructuredContent] = useState(initialData?.structuredContent || '');
  
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(initialData?.collectionIds || []);
  
  // SEO Stavy
  const [seoSummary, setSeoSummary] = useState(initialData?.seoSummary || '');
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seoKeywords?.join(', ') || '');
  const [practicalTips, setPracticalTips] = useState<string[]>(initialData?.practicalTips || []);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(initialData?.aiSuggestions || []);

  // AI Architekt stav
  const [coreTaxonomy, setCoreTaxonomy] = useState<any>(initialData?.coreTaxonomy || null);
  const [isIngesting, setIsIngesting] = useState(false);

  // Pomocné stavy pro UI
  const [isFetching, setIsFetching] = useState(false);
  const [isAiGeneratingChapters, setIsAiGeneratingChapters] = useState(false);
  const [isAiGeneratingSeo, setIsAiGeneratingSeo] = useState(false);
  
  // FÁZE 14: Nové stavy pro Matchmaker
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [aiProposals, setAiProposals] = useState<{name: string, description: string}[]>([]);

  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  
  // Logování
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    if (initialData) {
      setYoutubeInput(initialData.youtubeUrl);
      setTitle(initialData.title);
      setSummary(initialData.summary);
      setTranscript(initialData.transcript);
      setStructuredContent(initialData.structuredContent);
      setSelectedCollectionIds(initialData.collectionIds);
      setSeoSummary(initialData.seoSummary);
      setSeoKeywords(initialData.seoKeywords?.join(', ') || '');
      setPracticalTips(initialData.practicalTips);
      setAiSuggestions(initialData.aiSuggestions);
      setCoreTaxonomy(initialData.coreTaxonomy);
    }
  }, [initialData]);

  // --- 2. LOGIKA: YouTube Fetch ---
  const handleFetchFromYoutube = async () => {
    if (!youtubeInput) return;
    
    let urlToFetch = youtubeInput;
    if (youtubeIdReadOnly && !youtubeInput.includes('http')) {
        urlToFetch = `https://www.youtube.com/watch?v=${youtubeInput}`;
    }

    setIsFetching(true);
    setFetchWarning(null);
    setDebugLogs([]); 
    addLog(`Stahuji data pro: ${urlToFetch}`);

    try {
      const res = await fetch(`/api/youtube/fetch-data?url=${encodeURIComponent(urlToFetch)}`);
      const data = await res.json();

      if (data.debugLogs) setDebugLogs(prev => [...data.debugLogs, ...prev]);
      if (!res.ok) throw new Error(data.message || 'Chyba při stahování');

      const shouldUpdate = (field: string) => !initialData || confirm(`Chcete přepsat ${field} novými daty z YouTube?`);

      if (data.title && shouldUpdate('NÁZEV')) setTitle(data.title);
      if (data.description && shouldUpdate('SHRNUTÍ')) setSummary(data.description);
      
      if (data.transcript) {
        if (shouldUpdate('PŘEPIS')) {
             setTranscript(data.transcript);
             addLog('Přepis aktualizován.');
        }
      } else {
        setFetchWarning('Metadata stažena, ale titulky nebyly nalezeny.');
      }
    } catch (err: any) {
      addLog(`Chyba: ${err.message}`);
      alert(`Chyba: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  // --- 3. LOGIKA: AI Generátory ---
  
  // A) Kapitoly
  const handleAiGenerateChapters = async () => {
    if (!transcript) return;
    setIsAiGeneratingChapters(true);
    setDebugLogs([]); addLog('Generuji kapitoly...');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.content) {
          setStructuredContent(data.content);
          addLog('Kapitoly vygenerovány.');
      }
    } catch (e: any) {
        addLog(`Chyba: ${e.message}`);
    } finally {
        setIsAiGeneratingChapters(false);
    }
  };

  // B) SEO Metadata
  const handleAiGenerateSeo = async () => {
    if (!transcript) return;
    setIsAiGeneratingSeo(true);
    setDebugLogs([]); addLog('Generuji SEO metadata...');
    try {
      const res = await fetch('/api/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const jsonRes = await res.json();
      if (!res.ok) throw new Error(jsonRes.message);
      
      const { data } = jsonRes;
      addLog('SEO data přijata.');
      
      if (data.summary) setSeoSummary(data.summary);
      if (data.keywords) setSeoKeywords(data.keywords.join(', '));
      if (data.practical_tips) setPracticalTips(data.practical_tips);
      if (data.suggestions) setAiSuggestions(data.suggestions);
      
    } catch (e: any) {
        addLog(`Chyba SEO: ${e.message}`);
    } finally {
        setIsAiGeneratingSeo(false);
    }
  };

  // C) FÁZE 14 + 19: AI MATCHMAKER LOGIC (SMART HYBRID)
  const handleAiMatchCollections = async () => {
    setIsAiMatching(true);
    setAiProposals([]);
    
    // 1. Zkusíme použít lokální taxomonii (ZDARMA)
    if (coreTaxonomy && coreTaxonomy.branch) {
        addLog('⚡ Používám existující AI taxonomii (Cached)...');
        
        // Hledáme sbírku, která se jmenuje stejně jako Branch nebo Root
        const targetName = coreTaxonomy.branch;
        const rootName = coreTaxonomy.root;
        
        const match = collections.find(c => 
            c.name.toLowerCase() === targetName.toLowerCase() || 
            c.name.toLowerCase() === rootName.toLowerCase()
        );

        if (match) {
            if (!selectedCollectionIds.includes(match.id)) {
                setSelectedCollectionIds(prev => [...prev, match.id]);
                addLog(`✅ Automaticky vybrána sbírka: "${match.name}"`);
            } else {
                addLog(`ℹ️ Sbírka "${match.name}" je již vybrána.`);
            }
            setIsAiMatching(false);
            return; // Hotovo, ušetřili jsme API call
        } else {
            // Pokud sbírka neexistuje, navrhneme ji vytvořit
            setAiProposals([{
                name: targetName,
                description: `Automaticky navrženo pro sekci ${rootName}`
            }]);
            addLog(`💡 Navrhuji novou sbírku: "${targetName}"`);
            setIsAiMatching(false);
            return;
        }
    }

    // 2. Fallback: Pokud nemáme taxonomii, voláme API (DRAHÉ)
    if (!title && !summary && !seoSummary) {
        alert('Pro návrh zařazení je potřeba mít vyplněný alespoň název a shrnutí.');
        setIsAiMatching(false);
        return;
    }

    addLog('Spouštím Cloud AI Matchmaker...');

    try {
        const payload = {
            videoContext: {
                title,
                summary: seoSummary || summary, // Preferujeme SEO summary
                keywords: seoKeywords,
                aiSuggestions: aiSuggestions.join(', ')
            },
            existingCollections: collections
        };

        const res = await fetch('/api/ai/match-collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Chyba při párování');

        // Aplikace shod
        if (data.matches && Array.isArray(data.matches)) {
            const newMatches = data.matches.filter((id: string) => !selectedCollectionIds.includes(id));
            if (newMatches.length > 0) {
                setSelectedCollectionIds(prev => [...prev, ...newMatches]);
                addLog(`Automaticky zaškrtnuto: ${newMatches.length} sbírek.`);
            } else {
                addLog('Žádné nové shody v existujících sbírkách.');
            }
        }

        // Návrhy
        if (data.new_proposals && Array.isArray(data.new_proposals) && data.new_proposals.length > 0) {
            setAiProposals(data.new_proposals);
            addLog(`AI navrhuje ${data.new_proposals.length} nové sbírky.`);
        } else {
            addLog('AI nenavrhlo žádné nové sbírky.');
        }

    } catch (e: any) {
        addLog(`Chyba Matchmaker: ${e.message}`);
        console.error(e);
    } finally {
        setIsAiMatching(false);
    }
  };

  // D) NOVÁ FUNKCE: Manuální Ingesce AI Architektem
  const handleManualIngest = async () => {
    if (!youtubeIdReadOnly) return; // Pouze pro editaci
    
    // Varování při přepisování
    if (coreTaxonomy && !confirm('Toto video již má AI analýzu. Chcete ji opravdu přegenerovat? Spotřebuje to API kredity.')) {
        return;
    }
    
    setIsIngesting(true);
    addLog('🚀 Spouštím hloubkovou DCVA analýzu...');
    
    try {
        const pathParts = window.location.pathname.split('/');
        const videoId = pathParts[pathParts.length - 1];

        const res = await fetch('/api/admin/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId })
        });
        
        if (!res.ok) throw new Error('Chyba ingesce');
        
        addLog('✅ Analýza dokončena. Obnovuji stránku...');
        
        setTimeout(() => window.location.reload(), 1000);

    } catch (e: any) {
        addLog(`❌ Chyba: ${e.message}`);
        setIsIngesting(false);
    }
  };

  // --- 4. HANDLERS UI ---
  const handleAddTip = () => setPracticalTips([...practicalTips, '']);
  const handleRemoveTip = (index: number) => setPracticalTips(practicalTips.filter((_, i) => i !== index));
  const handleTipChange = (index: number, val: string) => {
      const newTips = [...practicalTips];
      newTips[index] = val;
      setPracticalTips(newTips);
  };
  const toggleCollection = (id: string) => {
      setSelectedCollectionIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // --- 5. ODESLÁNÍ ---
  const handleSubmitInternal = (e: FormEvent) => {
      e.preventDefault();
      const keywordsArray = seoKeywords.split(',').map(k => k.trim()).filter(k => k);
      const tipsArray = practicalTips.filter(t => t.trim());

      onSubmit({
          youtubeUrl: youtubeInput,
          title,
          summary,
          transcript,
          structuredContent,
          collectionIds: selectedCollectionIds,
          seoSummary,
          seoKeywords: keywordsArray,
          practicalTips: tipsArray,
          aiSuggestions,
          coreTaxonomy
      });
  };

  return (
    <div className="space-y-8">
        {/* LOG PANEL */}
        {debugLogs.length > 0 && (
            <div className="p-3 bg-black border border-gray-700 rounded font-mono text-xs text-green-400 max-h-48 overflow-y-auto">
                <strong className="block mb-1 text-gray-500">SYSTEM LOG:</strong>
                {debugLogs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        )}

        <form onSubmit={handleSubmitInternal} className="space-y-8">
            
            {/* SEKVENCE 1: ZÁKLADNÍ INFO */}
            <section className="space-y-4 border-b border-gray-700 pb-6">
                <h2 className="text-xl font-semibold text-gray-200">Základní informace</h2>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300">
                        {youtubeIdReadOnly ? 'YouTube ID' : 'YouTube URL'}
                    </label>
                    <div className="flex gap-2 mt-1">
                        <input 
                            type="text" 
                            value={youtubeInput} 
                            onChange={e => setYoutubeInput(e.target.value)} 
                            disabled={youtubeIdReadOnly}
                            className={`block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2 ${youtubeIdReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <button 
                            type="button" 
                            onClick={handleFetchFromYoutube} 
                            disabled={isFetching || !youtubeInput}
                            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50 text-sm"
                        >
                            {isFetching ? 'Stahuji...' : (youtubeIdReadOnly ? '↻ Aktualizovat data' : 'Načíst z YouTube')}
                        </button>
                    </div>
                    {fetchWarning && <p className="text-xs text-yellow-400 mt-1">{fetchWarning}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300">Název videa</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300">Shrnutí / Popis</label>
                    <textarea rows={3} value={summary} onChange={e => setSummary(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white p-2" />
                </div>
            </section>

            {/* SEKVENCE 2: PŘEPIS */}
            <section className="space-y-4 border-b border-gray-700 pb-6">
                <h2 className="text-xl font-semibold text-gray-200">Přepis (Zdroj pro AI)</h2>
                <textarea rows={6} value={transcript} onChange={e => setTranscript(e.target.value)} className="mt-1 block w-full bg-gray-900 text-white p-2 text-sm font-mono border-gray-600 rounded-md" placeholder="Zde bude text titulků..." />
            </section>

            {/* SEKVENCE 3: KAPITOLY */}
            <section className="space-y-4 border-b border-gray-700 pb-6">
                 <div className="flex justify-between items-end">
                    <h2 className="text-xl font-semibold text-gray-200">Kapitoly</h2>
                    <button type="button" onClick={handleAiGenerateChapters} disabled={!transcript || isAiGeneratingChapters} className="text-xs bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded flex items-center gap-2 disabled:opacity-50">
                        {isAiGeneratingChapters ? '⚙️ Generuji...' : '✨ Generovat kapitoly'}
                    </button>
                </div>
                <textarea rows={8} value={structuredContent} onChange={e => setStructuredContent(e.target.value)} className="mt-1 block w-full bg-gray-800 text-white p-2 font-mono border-gray-600 rounded-md" />
            </section>

            {/* NOVÁ SEKCE: AI ARCHITEKT (DCVA) */}
            <section className="space-y-4 bg-purple-900/10 border border-purple-500/30 p-6 rounded-lg">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-purple-100">AI Architekt (DCVA)</h2>
                    </div>
                    
                    {youtubeIdReadOnly && (
                        <button 
                            type="button" 
                            onClick={handleManualIngest} 
                            disabled={isIngesting} 
                            className={`text-sm text-white py-2 px-4 rounded shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all ${
                                coreTaxonomy ? 'bg-gray-700 hover:bg-gray-600' : 'bg-purple-600 hover:bg-purple-500'
                            }`}
                        >
                            {isIngesting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                coreTaxonomy ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />
                            )}
                            {isIngesting ? 'Analyzuji...' : (coreTaxonomy ? 'Přegenerovat analýzu' : 'Spustit Hloubkovou Analýzu')}
                        </button>
                    )}
                </div>
                
                <p className="text-sm text-gray-400">
                    Automatická klasifikace obsahu do taxonomického stromu.
                </p>

                {coreTaxonomy ? (
                    <div className="bg-gray-900/50 p-4 rounded border border-purple-500/20 mt-4 relative">
                        {/* Vizualizace úspěšné analýzy */}
                        <div className="absolute top-2 right-2">
                            <CheckCircle className="text-green-500 w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-2 text-sm text-purple-300 mb-2 font-mono">
                            <span>ROOT:</span> <span className="text-white font-bold">{coreTaxonomy.root}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-indigo-300 mb-2 font-mono pl-4 border-l-2 border-purple-500/20">
                            <span>BRANCH:</span> <span className="text-white font-bold">{coreTaxonomy.branch}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-300 font-mono pl-8 border-l-2 border-purple-500/20">
                            <span>LEAF:</span> <span className="text-white">{coreTaxonomy.leaf}</span>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 flex gap-2">
                            <span>Analýza je uložena v databázi.</span>
                            {/* Zde by šlo přidat odkaz na admin detail sbírky */}
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-6 border-2 border-dashed border-gray-700 rounded text-gray-500 text-sm">
                        Zatím neproběhla hloubková analýza. Spusťte ji tlačítkem výše.
                    </div>
                )}
            </section>

            {/* SEKVENCE 4: SEO A SÉMANTIKA */}
            <section className="space-y-6 bg-gradient-to-r from-gray-900 to-indigo-900/20 p-6 rounded-lg border border-indigo-500/30">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-indigo-100">SEO a Sémantika</h2>
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">Fáze 12</span>
                    </div>
                    <button type="button" onClick={handleAiGenerateSeo} disabled={!transcript || isAiGeneratingSeo} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded shadow-lg flex items-center gap-2 disabled:opacity-50">
                        {isAiGeneratingSeo ? '⚙️ Analyzuji...' : '✨ Generovat SEO'}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">AI Abstrakt</label>
                    <textarea rows={3} value={seoSummary} onChange={e => setSeoSummary(e.target.value)} className="w-full bg-gray-800 text-white p-3 text-sm border-gray-600 rounded-md" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Klíčová slova</label>
                    <input type="text" value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} className="w-full bg-gray-800 text-white p-2 text-sm border-gray-600 rounded-md" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Praktické tipy</label>
                    <div className="space-y-2">
                        {practicalTips.map((tip, index) => (
                            <div key={index} className="flex gap-2">
                                <span className="text-gray-500 py-2 select-none">{index + 1}.</span>
                                <input type="text" value={tip} onChange={e => handleTipChange(index, e.target.value)} className="flex-1 bg-gray-800 text-white p-2 text-sm border-gray-600 rounded-md" />
                                <button type="button" onClick={() => handleRemoveTip(index)} className="px-3 text-red-400 hover:bg-red-900/30 rounded">✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddTip} className="text-xs text-indigo-400 font-medium py-1">+ Přidat tip</button>
                    </div>
                </div>

                {aiSuggestions.length > 0 && (
                    <div className="bg-indigo-900/30 p-3 rounded border border-indigo-500/20">
                        <p className="text-xs text-indigo-300 font-bold mb-2">AI Návrhy sbírek:</p>
                        <div className="flex flex-wrap gap-2">
                            {aiSuggestions.map((sug, i) => <span key={i} className="text-xs bg-indigo-800/50 text-indigo-200 px-2 py-1 rounded-full">{sug}</span>)}
                        </div>
                    </div>
                )}
            </section>

            {/* SEKVENCE 5: SBÍRKY */}
            <section className="bg-gray-900 p-4 rounded-md border border-gray-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-300">Zařadit do sbírek</h3>
                    
                    {/* FÁZE 14: Tlačítko Matchmaker */}
                    <button 
                        type="button" 
                        onClick={handleAiMatchCollections}
                        disabled={isAiMatching}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAiMatching ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                            <Sparkles className="w-3 h-3" />
                        )}
                        {isAiMatching ? 'Analyzuji...' : 'Navrhnout zařazení (AI)'}
                    </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border-b border-gray-800 pb-4 mb-4">
                    {collections.length === 0 ? <p className="text-gray-500 text-sm italic">Žádné sbírky.</p> : 
                        collections.map((col) => (
                        <label key={col.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
                            <input 
                                type="checkbox" 
                                checked={selectedCollectionIds.includes(col.id)} 
                                onChange={() => toggleCollection(col.id)} 
                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" 
                            />
                            <span className="text-sm text-gray-200">{col.name}</span>
                        </label>
                    ))}
                </div>

                {/* FÁZE 14: Zobrazení Návrhů (Evoluce) */}
                {aiProposals.length > 0 && (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded p-3 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-sm font-bold text-indigo-300">💡 AI navrhuje nové téma:</h4>
                        </div>
                        
                        {aiProposals.map((prop, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-800/50 p-2 rounded">
                                <div>
                                    <strong className="block text-white text-sm">{prop.name}</strong>
                                    <p className="text-xs text-gray-400">{prop.description}</p>
                                </div>
                                <a 
                                    href={`/admin/collections?name=${encodeURIComponent(prop.name)}&description=${encodeURIComponent(prop.description)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded transition-colors"
                                >
                                    Vytvořit sbírku <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ))}
                        <p className="text-[10px] text-gray-500 mt-2 text-center">
                            Po vytvoření sbírky v novém okně klikněte znovu na "Navrhnout zařazení" pro aktualizaci seznamu.
                        </p>
                    </div>
                )}
            </section>

            <div className="pt-4 border-t border-gray-700">
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded font-bold disabled:opacity-50">
                    {isSubmitting ? 'Ukládání...' : submitButtonText}
                </button>
            </div>
        </form>
    </div>
  );
}