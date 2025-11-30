"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CollectionForm, { CollectionFormData } from '@/components/admin/CollectionForm';

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<CollectionFormData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) throw new Error('Sbírka nenalezena');
        const data = await res.json();

        // OPRAVA: Mapování všech polí (Záměr + Zrcadlo)
        setInitialData({
          // 1. Záměr Uživatele
          name: data.name,
          description: data.description || '', // <--- PŘIDÁNO
          keywords: data.keywords || [],       // <--- PŘIDÁNO
          isPublic: data.isPublic,
          
          // 2. AI Zrcadlo
          seoTitle: data.seoTitle || '',       // <--- PŘIDÁNO
          seoDescription: data.seoDescription || '',
          seoKeywords: data.seoKeywords || [],

          // 3. Kontext
          videos: data.videos?.map((v: any) => ({
             id: v.id,
             title: v.title,
             thumbnailId: v.youtubeId
          })) || []
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (data: CollectionFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Chyba při ukládání');

      router.push('/admin/collections');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Načítám editor sbírky...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Chyba: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editace Sbírky</h1>
        <p className="text-gray-500 text-sm">Spravujte metadata a generujte AI popis z obsahu.</p>
      </div>
      
      <CollectionForm 
        initialData={initialData}
        collectionId={id} 
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Uložit změny"
      />
    </div>
  );
}