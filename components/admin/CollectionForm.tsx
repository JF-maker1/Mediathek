"use client";

import { useState, FormEvent, useEffect } from 'react';
import { Sparkles, Save, Eye, EyeOff, LayoutGrid, ArrowUp, Copy, BookOpen, Tag } from 'lucide-react';

export interface CollectionFormData {
  // Uživatelská data (Záměr)
  name: string;
  description: string;
  keywords: string[];
  isPublic: boolean;
  
  // AI data (Zrcadlo)
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  
  // Kontext
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
  
  // --- STAVY: Záměr Uživatele ---
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [keywords, setKeywords] = useState(initialData?.keywords?.join(', ') || '');
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);

  // --- STAVY: AI Zrcadlo ---
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seoKeywords?.join(', ') || '');
  
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  // Generování AI dat
  const handleAiGenerate = async () => {
    if (!collectionId) return;
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/generate-collection-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Chyba generování');

      const { data } = json;
      if (data.title) setSeoTitle(data.title);
      if (data.description) setSeoDescription(data.description);
      if (data.keywords && Array.isArray(data.keywords)) {
          setSeoKeywords(data.keywords.join(', '));
      }

    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // --- ADOPČNÍ FUNKCE (Převzetí AI návrhů) ---
  const adoptTitle = () => setName(seoTitle);
  const adoptDescription = () => setDescription(seoDescription);
  const adoptKeywords = () => setKeywords(seoKeywords);

  // Uložení
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
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* HLAVIČKA A AI SPOUŠTĚČ */}
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

      {/* HLAVNÍ EDITOR (GRID: ZÁMĚR vs ZRCADLO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEVÝ SLOUPEC: ZÁMĚR UŽIVATELE */}
          <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Váš Záměr (Definice)
              </h3>

              {/* Název */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Název sbírky</label>
                  <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                      className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
              </div>

              {/* Popis */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Popis sbírky</label>
                  <textarea 
                      rows={5} 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      placeholder="Jaký je cíl této sbírky?"
                      className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm"
                  />
              </div>

              {/* Klíčová slova */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Klíčová slova</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        value={keywords} 
                        onChange={e => setKeywords(e.target.value)} 
                        placeholder="věda, zdraví, historie..."
                        className="w-full bg-gray-900 text-white p-3 pl-10 rounded border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                    />
                  </div>
              </div>

              {/* Viditelnost */}
              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer bg-gray-800/50 px-4 py-3 rounded border border-gray-700 w-full hover:bg-gray-800 transition-colors">
                    <input 
                        type="checkbox" 
                        checked={isPublic} 
                        onChange={e => setIsPublic(e.target.checked)} 
                        className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-2">
                        {isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                        <span className={`font-medium ${isPublic ? 'text-green-400' : 'text-gray-400'}`}>
                            {isPublic ? 'Veřejná sbírka' : 'Soukromá sbírka'}
                        </span>
                    </div>
                </label>
              </div>
          </div>

          {/* PRAVÝ SLOUPEC: AI ZRCADLO (READ-ONLY s možností kopírování) */}
          <div className="space-y-6">
              <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> AI Zrcadlo (Realita)
              </h3>
              
              {!seoTitle && !seoDescription ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg text-center">
                      <p className="text-gray-500 mb-2">Zatím nebylo provedeno srovnání.</p>
                      <p className="text-xs text-gray-600">Klikněte na "Aktualizovat AI Zrcadlo" pro analýzu videí.</p>
                  </div>
              ) : (
                  <>
                      {/* AI Název */}
                      <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors relative group">
                          <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase">AI Návrh Názvu</label>
                          <p className="text-white font-medium p-2">{seoTitle}</p>
                          
                          {name !== seoTitle && (
                              <button 
                                onClick={adoptTitle}
                                title="Použít tento název"
                                type="button"
                                className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105"
                              >
                                  <ArrowUp className="w-4 h-4 rotate-[-45deg] lg:rotate-[-90deg]" /> 
                              </button>
                          )}
                      </div>

                      {/* AI Popis */}
                      <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors relative group">
                          <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase">AI Syntéza Popisu</label>
                          <p className="text-gray-300 text-sm p-2 leading-relaxed">{seoDescription}</p>
                          
                          {description !== seoDescription && (
                              <button 
                                onClick={adoptDescription}
                                title="Použít tento popis"
                                type="button"
                                className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105"
                              >
                                  <Copy className="w-4 h-4" />
                              </button>
                          )}
                      </div>

                      {/* AI Klíčová slova */}
                      <div className="bg-indigo-900/10 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors relative group">
                          <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase">AI Tagy</label>
                          <div className="flex flex-wrap gap-2 p-2">
                             {seoKeywords.split(',').map((k, i) => k.trim() && (
                                 <span key={i} className="text-xs bg-indigo-900/40 text-indigo-200 px-2 py-1 rounded border border-indigo-500/30">
                                     {k}
                                 </span>
                             ))}
                          </div>
                          
                          {keywords !== seoKeywords && (
                              <button 
                                onClick={adoptKeywords}
                                title="Použít tato klíčová slova"
                                type="button"
                                className="absolute top-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105"
                              >
                                  <Copy className="w-4 h-4" />
                              </button>
                          )}
                      </div>
                  </>
              )}
          </div>
      </div>

      {/* KONTEXT (Videí) */}
      {initialData?.videos && initialData.videos.length > 0 && (
          <section className="border-t border-gray-700 pt-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Obsah Sbírky ({initialData.videos.length})
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                {initialData.videos.map(v => (
                    <div key={v.id} className="shrink-0 w-40 group cursor-default">
                        <div className="aspect-video bg-gray-800 rounded-md overflow-hidden relative shadow-md">
                             <img 
                                src={`https://img.youtube.com/vi/${v.thumbnailId}/mqdefault.jpg`} 
                                alt="" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                             />
                        </div>
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-tight group-hover:text-gray-200 transition-colors">{v.title}</p>
                    </div>
                ))}
            </div>
          </section>
      )}

      <div className="pt-6 border-t border-gray-700 flex justify-end sticky bottom-0 bg-gray-900/90 p-4 -mx-4 backdrop-blur-sm">
        <button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all"
        >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Ukládám změny...' : submitButtonText}
        </button>
      </div>

    </form>
  );
}