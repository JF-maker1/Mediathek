"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LayoutGrid, LogIn, UserPlus } from 'lucide-react'; // Přidáme ikony pro hezčí vzhled (volitelné)

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="flex items-center gap-6 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
      
      {/* 1. Logo / Domů */}
      <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity">
        Mediathek
      </Link>

      {/* 2. HLAVNÍ NAVIGACE (Viditelná pro všechny) */}
      <div className="hidden md:flex gap-4">
         <Link 
            href="/collections" 
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
         >
            <LayoutGrid size={18} />
            Katalog
         </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {status === "loading" && <p className="text-sm text-gray-400">...</p>}

      {/* 3. Nepřihlášený uživatel */}
      {status === "unauthenticated" && (
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/login" className="flex items-center gap-1 text-gray-600 hover:text-indigo-600">
            <LogIn size={16} /> Přihlásit
          </Link>
          <Link href="/register" className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded transition-colors">
            <UserPlus size={16} /> Registrovat
          </Link>
        </div>
      )}

      {/* 4. Přihlášený uživatel */}
      {status === "authenticated" && (
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:underline">Můj Dashboard</Link>
          
          {/* --- ADMIN NAVIGACE --- */}
          {session.user?.role === 'ADMIN' && (
            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-gray-300 dark:border-gray-600">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Admin:</span>
              <Link href="/admin/dashboard" className="hover:text-indigo-500">Přehled</Link>
              <Link href="/admin/manage" className="hover:text-indigo-500">Správa</Link>
              <Link href="/admin/collections" className="hover:text-indigo-500">Sbírky</Link>
              <Link href="/admin/add" className="font-bold text-indigo-600 hover:text-indigo-700">+ Video</Link>
            </div>
          )}
          
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200" title={session.user?.email || ''}>
             {session.user?.email?.[0].toUpperCase()}
          </div>
        </div>
      )}
    </nav>
  );
}