import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LayoutGrid, LogIn, UserPlus, Shield, User } from 'lucide-react';

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = user?.role;

  // Logika oprávnění: Admin NEBO Kurátor
  const isAdmin = role === 'ADMIN';
  const isKurator = role === 'KURATOR';
  // "Power Users" = Admin nebo Kurátor (mají přístup k obsahu)
  const canManageContent = isAdmin || isKurator;

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

      {/* 3. Nepřihlášený uživatel */}
      {!user && (
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/login" className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            <LogIn size={16} /> Přihlásit
          </Link>
          <Link href="/register" className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded transition-colors">
            <UserPlus size={16} /> Registrovat
          </Link>
        </div>
      )}

      {/* 4. Přihlášený uživatel */}
      {user && (
        <div className="flex items-center gap-4 text-sm">
          {/* Odkaz na Dashboard pro všechny přihlášené */}
          <Link href="/dashboard" className="hidden sm:block text-gray-700 dark:text-gray-200 hover:underline">
            Můj Dashboard
          </Link>
          
          {/* --- ADMIN & KURÁTOR NAVIGACE --- */}
          {canManageContent && (
            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-gray-300 dark:border-gray-600">
              <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider" title={`Role: ${role}`}>
                <Shield size={12} />
                {isAdmin ? 'Admin' : 'Kurátor'}
              </span>
              
              <Link href="/admin/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-indigo-500">Přehled</Link>
              <Link href="/admin/manage" className="text-gray-600 dark:text-gray-300 hover:text-indigo-500">Správa</Link>
              <Link href="/admin/collections" className="text-gray-600 dark:text-gray-300 hover:text-indigo-500">Sbírky</Link>
              <Link href="/admin/add" className="font-bold text-indigo-600 hover:text-indigo-700">+ Video</Link>

              {/* Pouze Admin vidí správu uživatelů */}
              {isAdmin && (
                <Link href="/admin/users" className="text-purple-600 hover:text-purple-700 font-medium">
                  Uživatelé
                </Link>
              )}
            </div>
          )}
          
          {/* Avatar / User Info */}
          <div 
            className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200" 
            title={user.email || ''}
          >
             {user.email?.[0]?.toUpperCase() || <User size={16} />}
          </div>
        </div>
      )}
    </nav>
  );
}