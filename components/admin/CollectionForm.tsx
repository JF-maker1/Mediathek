"use client";

import { useState, FormEvent, useEffect } from 'react';
import { Sparkles, Save, Eye, EyeOff, LayoutGrid, ArrowUp, Copy, BookOpen, Tag, Terminal } from 'lucide-react';

export interface CollectionFormData {
  name: string;
  description: string;
  keywords: string[];
  isPublic: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  videos?: { id: string; title: string; thumbnailId: string }[];
}

interface CollectionFormProps {
  initialData?: CollectionFormData;
  collectionId?: string;
  onSubmit: (data: CollectionFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
}

export default function CollectionForm({
  initialData,
  collectionId,
  onSubmit,
  isSubmitting,
  submitButtonText
}: CollectionFormProps) {
  
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [keywords, setKeywords] = useState(initialData?.keywords?.join(', ') || '');
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);

  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seoKeywords?.join(', ') || '');
  
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString();
      setDebugLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setKeywords(initialData.keywords?.join(', ') || '');
      setIsPublic(initialData.isPublic);
      setSeoTitle(initialData.seoTitle || '');
      setSeoDescription(initialData.seoDescription || '');
      setSeoKeywords(initialData.seoKeywords?.join(', ') || '');
    }
  }, [initialData]);

  const handleAiGenerate = async () => {
    if (!collectionId) {
        addLog('Chyba: Chybí ID sbírky. Uložte ji prosím.');
        return;
    }
    
    setIsAiGenerating(true);
    setAiError(null);
    setDebugLogs([]); 
    addLog('🚀 Spouštím AI analýzu (Zrcadlo)...');

    try {
      addLog(`Cíl: API /api/ai/generate-collection-seo`);
      
      const res = await fetch('/api/ai/generate-collection-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      });

      const json = await res.json();
      
      if (!res.ok) throw new Error(json.message || 'Chyba generování');
      
      addLog('✅ Data z AI úspěšně přijata.');
      
      const { data } = json;
      
      // DIAGNOSTIKA: Vypíšeme, co přesně přišlo
      const receivedKeys = Object.keys(data || {}).join(', ');
      addLog(`🔍 Přijaté klíče: [${receivedKeys}]`);

      let updatedCount = 0;

      if (data.title) {
          setSeoTitle(data.title);
          addLog(`> Title: "${data.title.substring(0, 20)}..."`);
          updatedCount++;
      } else {
          addLog('⚠️ Chybí "title" v odpovědi.');
      }

      if (data.description) {
          setSeoDescription(data.description);
          addLog('> Description: OK');
          updatedCount++;
      } else {
          addLog('⚠️ Chybí "description" v odpovědi.');
      }

      if (data.keywords && Array.isArray(data.keywords)) {
          setSeoKeywords(data.keywords.join(', '));
          addLog(`> Keywords: ${data.keywords.length} ks`);
          updatedCount++;
      } else {
          addLog('⚠️ Chybí "keywords" nebo není pole.');
      }

      if (updatedCount === 0) {
          addLog('❌ VAROVÁNÍ: Žádná pole nebyla aktualizována! Zkontrolujte formát AI.');
      } else {
          addLog('✨ Proces úspěšně dokončen.');
      }

    } catch (e: any) {
      setAiError(e.message);
      addLog(`❌ CHYBA: ${e.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const adoptTitle = () => { setName(seoTitle); addLog('Použit AI název.'); };
  const adoptDescription = () => { setDescription(seoDescription); addLog('Použit AI popis.'); };
  const adoptKeywords = () => { setKeywords(seoKeywords); addLog('Použita AI klíčová slova.'); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
      isPublic,
      seoTitle,
      seoDescription,
      seoKeywords: seoKeywords.split(',').map(k => k.trim()).filter(k => k)
    });
  };

  return (
    <div className="space-y-8">
      
      {/* LOG PANEL */}
      {debugLogs.length > 0 && (
          <div className="bg-black border border-gray-700 rounded-lg p-4 font-mono text-xs shadow-xl">
              <div className="flex items-center gap-2 text-gray-400 border-b border-gray-800 pb-2 mb-2">
                  <Terminal className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-bold">System Log</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                  {debugLogs.map((log, i) => (
                      <div key={i} className={log.includes('❌') ? 'text-red-400' : (log.includes('⚠️') ? 'text-yellow-400' : (log.includes('✅') || log.includes('✨') ? 'text-green-400' : 'text-gray-300'))}>
                          {log}
                      </div>
                  ))}
              </div>
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-700 pb-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-indigo-400" /> Nastavení Sbírky
                </h2>
                <p className="text-sm text-gray-400 mt-1">Definujte svůj záměr a porovnejte jej s realitou.</p>
            </div>
            
            {collectionId && (
                <button 
                    type="button" 
                    onClick={handleAiGenerate} 
                    disabled={isAiGenerating || !initialData?.videos?.length}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isAiGenerating ? <>⚙️ Analyzuji...</> : <><Sparkles className="w-4 h-4" /> Aktualizovat AI Zrcadlo</>}
                </button>
            )}
        </div>

        {aiError && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-500/30">{aiError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ZÁMĚR UŽIVATELE */}
            <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Váš Záměr (Definice)
                </h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Název sbírky</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors" />
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Popis sbírky</label>
                    <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Jaký je cíl této sbírky?" className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm" />
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Klíčová slova</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="věda, zdraví, historie..." className="w-full bg-gray-900 text-white p-3 pl-10 rounded border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors" />
                    </div>
                </div>
                <div className="pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer bg-gray-800/50 px-4 py-3 rounded border border-gray-700 w-full hover:bg-gray-800 transition-colors">
                        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-green-500 focus:ring-green-500" />
                        <div className="flex items-center gap-2">
                            {isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                            <span className={`font-medium ${isPublic ? 'text-green-400' : 'text-gray-400'}`}>
                                {isPublic ? 'Veřejná sbírka' : 'Soukromá sbírka'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* AI ZRCADLO */}
            <div className="space-y-6">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> AI Zrcadlo (Realita)
                </h3>
                
                {!seoTitle && !seoDescription ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg text-center min-h-[300px]">
                        <p className="text-gray-500 mb-2">Zatím nebylo provedeno srovnání.</p>
                        <p className="text-xs text-gray-600">Klikněte na "Aktualizovat AI Zrcadlo" pro analýzu videí.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors relative group">
                            <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase">AI Návrh Názvu</label>
                            <p className="text-white font-medium p-2">{seoTitle}</p>
                            {name !== seoTitle && (
                                <button onClick={adoptTitle} title="Použít tento název" type="button" className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105">
                                    <ArrowUp className="w-4 h-4 rotate-[-45deg] lg:rotate-[-90deg]" /> 
                                </button>
                            )}
                        </div>
                        <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors relative group">
                            <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase">AI Syntéza Popisu</label>
                            <p className="text-gray-300 text-sm p-2 leading-relaxed">{seoDescription}</p>
                            {description !== seoDescription && (
                                <button onClick={adoptDescription} title="Použít tento popis" type="button" className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105">
                                    <Copy className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors relative group">
                            <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase">AI Tagy</label>
                            <div className="flex flex-wrap gap-2 p-2">
                                {seoKeywords.split(',').map((k, i) => k.trim() && (
                                    <span key={i} className="text-xs bg-indigo-900/40 text-indigo-200 px-2 py-1 rounded border border-indigo-500/30">{k}</span>
                                ))}
                            </div>
                            {keywords !== seoKeywords && (
                                <button onClick={adoptKeywords} title="Použít tato klíčová slova" type="button" className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105">
                                    <Copy className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* KONTEXT */}
        {initialData?.videos && initialData.videos.length > 0 && (
            <section className="border-t border-gray-700 pt-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Obsah Sbírky ({initialData.videos.length})
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {initialData.videos.map(v => (
                        <div key={v.id} className="shrink-0 w-40 group cursor-default">
                            <div className="aspect-video bg-gray-800 rounded-md overflow-hidden relative shadow-md">
                                <img src={`https://img.youtube.com/vi/${v.thumbnailId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-tight group-hover:text-gray-200 transition-colors">{v.title}</p>
                        </div>
                    ))}
                </div>
            </section>
        )}

        <div className="pt-6 border-t border-gray-700 flex justify-end sticky bottom-0 bg-gray-900/90 p-4 -mx-4 backdrop-blur-sm">
            <button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all">
                <Save className="w-5 h-5" />
                {isSubmitting ? 'Ukládám změny...' : submitButtonText}
            </button>
        </div>
      </form>
    </div>
  );
}