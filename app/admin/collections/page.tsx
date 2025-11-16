"use client";
import { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';

// Typ pro Collection
interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  _count?: { videos: number };
}

export default function CollectionsPage() {
  const { data: session } = useSession();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Načtení sbírek
  const fetchCollections = async () => {
    const res = await fetch('/api/collections');
    if (res.ok) setCollections(await res.json());
  };

  useEffect(() => { fetchCollections(); }, []);

  // 2. Vytvoření sbírky
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc }),
    });
    setName(''); setDesc('');
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
      <form onSubmit={handleCreate} className="bg-gray-800 p-4 rounded mb-8 space-y-4">
        <h2 className="text-xl font-semibold">Nová Sbírka</h2>
        <div>
            <label className="block text-sm text-gray-400">Název</label>
            <input className="w-full p-2 rounded bg-gray-700" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
            <label className="block text-sm text-gray-400">Popis</label>
            <input className="w-full p-2 rounded bg-gray-700" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <button disabled={loading} className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 text-white">
            {loading ? 'Vytvářím...' : 'Vytvořit Sbírku'}
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