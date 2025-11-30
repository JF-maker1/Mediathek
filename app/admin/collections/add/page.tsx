"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CollectionForm, { CollectionFormData } from '@/components/admin/CollectionForm';

export default function AddCollectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Předvyplnění z URL (pokud přicházíme z AI Matchmakeru)
  const prefilledName = searchParams.get('name') || '';
  const prefilledDesc = searchParams.get('description') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialData: CollectionFormData = {
      name: prefilledName,
      description: prefilledDesc, // Pokud AI navrhla popis, dáme ho do user description jako start
      keywords: [],
      isPublic: false,
      
      // AI pole necháme prázdná, dokud neproběhne "Zrcadlo"
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
      
      videos: []
  };

  const handleSubmit = async (data: CollectionFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Zde posíláme celá data tak, jak vylezla z formuláře
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Chyba při vytváření');

      router.push('/admin/collections');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Nová Sbírka</h1>
        <p className="text-gray-500 text-sm">Vytvořte novou tématickou sbírku.</p>
        
        {prefilledName && (
            <div className="mt-4 bg-indigo-900/20 border border-indigo-500/30 p-3 rounded text-sm text-indigo-300">
                ✨ Tato sbírka byla navržena umělou inteligencí. Údaje byly předvyplněny.
            </div>
        )}
      </div>
      
      <CollectionForm 
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Vytvořit sbírku"
      />
    </div>
  );
}