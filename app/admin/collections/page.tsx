"use client";
import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

// Typ pro Collection
interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  _count?: { videos: number };
}

// Oddělená komponenta pro obsah, který používá useSearchParams (aby fungoval Suspense boundary)
function CollectionManagerContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams(); // Hook pro parametry URL

  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPrefilled, setIsPrefilled] = useState(false); // Indikátor pro UI

  // 1. Načtení sbírek
  const fetchCollections = async () => {
    const res = await fetch('/api/collections');
    if (res.ok) setCollections(await res.json());
  };

  useEffect(() => { 
      fetchCollections(); 

      // FÁZE 14: Kontrola URL parametrů pro předvyplnění
      const urlName = searchParams.get('name');
      const urlDesc = searchParams.get('description');

      if (urlName) {
          setName(urlName);
          setIsPrefilled(true);
      }
      if (urlDesc) {
          setDesc(urlDesc);
      }
  }, [searchParams]);

  // 2. Vytvoření sbírky
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc }),
    });
    setName(''); setDesc(''); setIsPrefilled(false);
    fetchCollections(); // Refresh tabulky
    setLoading(false);
  };

  // 3. Přepnutí veřejnosti (isPublic)
  const togglePublic = async (col: Collection) => {
    await fetch(`/api/collections/${col.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !col.isPublic }),
    });
    fetchCollections();
  };

  // 4. Smazání
  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat sbírku?')) return;
    await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    fetchCollections();
  };

  if (session?.user.role !== 'ADMIN') return <p>Access Denied</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Správa Sbírek</h1>
      
      {/* Formulář pro přidání */}
      <form onSubmit={handleCreate} className={`p-4 rounded mb-8 space-y-4 border transition-colors duration-500 ${isPrefilled ? 'bg-indigo-900/20 border-indigo-500' : 'bg-gray-800 border-gray-700'}`}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                {isPrefilled ? '✨ AI Návrh Nové Sbírky' : 'Nová Sbírka'}
            </h2>
            {isPrefilled && <span className="text-xs text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded">Předvyplněno z AI</span>}
        </div>
        
        <div>
            <label className="block text-sm text-gray-400">Název</label>
            <input 
                className={`w-full p-2 rounded bg-gray-700 focus:ring-2 ${isPrefilled ? 'focus:ring-indigo-500 border border-indigo-500/30' : ''}`} 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
            />
        </div>
        <div>
            <label className="block text-sm text-gray-400">Popis</label>
            <input className="w-full p-2 rounded bg-gray-700" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <button disabled={loading} className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 text-white font-bold shadow-lg">
            {loading ? 'Vytvářím...' : (isPrefilled ? 'Potvrdit a Vytvořit AI Sbírku' : 'Vytvořit Sbírku')}
        </button>
      </form>

      {/* Seznam sbírek */}
      <div className="space-y-4">
        {collections.map(col => (
            <div key={col.id} className="bg-gray-900 border border-gray-700 p-4 rounded flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">{col.name}</h3>
                    <p className="text-sm text-gray-400">{col.description}</p>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded mt-1 inline-block">
                        Počet videí: {col._count?.videos || 0}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => togglePublic(col)}
                        className={`px-3 py-1 rounded text-sm ${col.isPublic ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}
                    >
                        {col.isPublic ? 'VEŘEJNÁ' : 'SOUKROMÁ'}
                    </button>
                    <button onClick={() => handleDelete(col.id)} className="text-red-500 hover:underline">Smazat</button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

// Hlavní export s Suspense (nutné pro useSearchParams v Next.js 13+)
export default function CollectionsPage() {
    return (
        <Suspense fallback={<div className="p-6">Načítám správu sbírek...</div>}>
            <CollectionManagerContent />
        </Suspense>
    );
}