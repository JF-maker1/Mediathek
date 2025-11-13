"use client";

import { useState, FormEvent } from 'react';

export default function AddVideoPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  // 1. PŘIDÁNÍ NOVÉHO STAVU
  const [structuredContent, setStructuredContent] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 2. PŘIDÁNÍ structuredContent DO BODY
        body: JSON.stringify({
          youtubeUrl,
          title,
          summary,
          structuredContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Něco se pokazilo');
      }

      setSuccess('Video bylo úspěšně přidáno!');
      // 3. RESET I NOVÉHO POLE
      setYoutubeUrl('');
      setTitle('');
      setSummary('');
      setStructuredContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Přidat nové video</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-300">
            YouTube URL
          </label>
          <input
            type="text"
            id="youtubeUrl"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300">
            Název videa
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
            placeholder="Vlastní název videa"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-300">
            Shrnutí / Popis
          </label>
          <textarea
            id="summary"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2"
            placeholder="Sem vložte manuálně vytvořené shrnutí..."
          />
        </div>

        {/* 4. PŘIDÁNÍ NOVÉ TEXTAREA PRO KAPITOLY */}
        <div>
          <label htmlFor="structuredContent" className="block text-sm font-medium text-gray-300">
            Strukturovaný Obsah (Kapitoly)
          </label>
          <textarea
            id="structuredContent"
            rows={15}
            value={structuredContent}
            onChange={(e) => setStructuredContent(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white p-2 font-mono"
            placeholder={`1. Kapitola 1 (0:00 - 1:30)
1.1. Podkapitola (0:15 - 0:45)
2. Kapitola 2 (1:30 - 3:00)`}
          />
          <p className="mt-2 text-xs text-gray-400">
            Formát: "1.1. Text (MM:SS - MM:SS)". Hierarchie dle číslování.
          </p>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Ukládání...' : 'Uložit video'}
          </button>
        </div>
      </form>

      {success && (
        <p className="mt-4 text-sm text-green-500">{success}</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}