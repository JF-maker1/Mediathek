'use client';

import { useState } from 'react';

interface UserRoleSelectProps {
  userId: string;
  currentRole: string;
  currentUserIsMe: boolean; // Zda je tento řádek já sám (abych si nemohl změnit roli)
}

export default function UserRoleSelect({ userId, currentRole, currentUserIsMe }: UserRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newRole: string) => {
    if (currentUserIsMe) return; // Pojistka na klientovi

    const confirmChange = window.confirm(`Opravdu chcete změnit roli uživatele na ${newRole}?`);
    if (!confirmChange) return;

    setLoading(true);
    setRole(newRole); // Optimistický update UI

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update role');
      }

      // Pro jistotu použijeme tvrdý reload místo router.refresh(), aby se změny projevily okamžitě
      window.location.reload(); 
    } catch (error) {
      alert('Chyba při změně role: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setRole(currentRole); // Vrátit zpět při chybě
    } finally {
      setLoading(false);
    }
  };

  if (currentUserIsMe) {
    return <span className="text-gray-500 italic text-sm">Nelze změnit (to jste vy)</span>;
  }

  return (
    <div className="relative inline-block w-32">
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        className={`block w-full px-2 py-1 text-sm border rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
          ${loading ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900 border-gray-300'}
        `}
      >
        <option value="USER">USER</option>
        <option value="KURATOR">KURATOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      {loading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}