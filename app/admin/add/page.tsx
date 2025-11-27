"use client";

import { useState, useEffect } from 'react';
import VideoForm, { VideoFormData } from '@/components/admin/VideoForm';
import { useRouter } from 'next/navigation';

export default function AddVideoPage() {
  const router = useRouter();
  const [collections, setCollections] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Načtení seznamu sbírek pro výběr
  useEffect(() => {
    fetch('/api/collections').then(res => res.json()).then(data => setCollections(data));
  }, []);

  const handleSubmit = async (data: VideoFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Chyba při ukládání');
      }

      router.push('/admin/manage');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Přidat nové video</h1>
      
      {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400">{error}</div>}
      
      <VideoForm 
        collections={collections} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        submitButtonText="Uložit video" 
      />
    </div>
  );
}