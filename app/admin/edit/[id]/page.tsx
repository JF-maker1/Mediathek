"use client";

import { useState, useEffect } from 'react';
import VideoForm, { VideoFormData } from '@/components/admin/VideoForm';
import { useRouter, useParams } from 'next/navigation';

export default function EditVideoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<VideoFormData | undefined>(undefined);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Načtení dat videa a sbírek
  useEffect(() => {
    const load = async () => {
      try {
        const [vidRes, colRes] = await Promise.all([
          fetch(`/api/videos/${id}`), // Tento endpoint vrací i coreVideo
          fetch('/api/collections')
        ]);
        
        if (!vidRes.ok) throw new Error('Chyba načítání videa');
        
        const v = await vidRes.json();
        const c = await colRes.json();

        setCollections(c);
        
        // Transformace dat z DB do formátu VideoFormData
        setInitialData({
          youtubeUrl: v.youtubeId,
          title: v.title,
          summary: v.summary,
          transcript: v.transcript || '',
          structuredContent: v.chapters?.map((ch: any) => ch.text).join('\n') || '',
          collectionIds: v.collections?.map((col: any) => col.id) || [],
          seoSummary: v.seoSummary || '',
          seoKeywords: v.seoKeywords || [],
          practicalTips: v.practicalTips || [],
          aiSuggestions: v.aiSuggestions || [],
          
          // --- OPRAVA: Správné mapování taxonomie ---
          // Bereme celý JSON objekt 'taxonomy' z CoreVideo a dáváme ho do pole 'coreTaxonomy'
          coreTaxonomy: v.coreVideo?.taxonomy || null
          // ------------------------------------------
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (data: VideoFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Chyba aktualizace');
      }

      router.push('/admin/manage');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-center p-8">Načítám...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Upravit video</h1>
      
      {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400">{error}</div>}
      
      {initialData && (
        <VideoForm 
          initialData={initialData}
          collections={collections} 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting} 
          submitButtonText="Uložit změny"
          youtubeIdReadOnly={true}
        />
      )}
    </div>
  );
}