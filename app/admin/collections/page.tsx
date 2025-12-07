import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { Plus, Edit, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getAuthFilter } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions);

  // Povolené role: ADMIN a KURATOR
  const allowedRoles = ['ADMIN', 'KURATOR'];
  
  // Pokud uživatel není přihlášen nebo nemá povolenou roli, přesměrovat
  if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
    redirect('/');
  }

  // Získání autentizačního filtru
  const whereFilter = await getAuthFilter();

  // Načtení sbírek včetně počtu videí a SEO statusu s aplikací filtru
  const collections = await prisma.collection.findMany({
    where: whereFilter, // Filtr aplikován zde
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { videos: true }
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Správa Sbírek</h1>
            <p className="text-gray-500 mt-1">Ekosystém vašich tématických knihoven</p>
        </div>
        <Link
          href="/admin/collections/add"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" /> Nová Sbírka
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Název Sbírky
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Obsah
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Viditelnost
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                SEO Status
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Akce
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {collections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <p className="mb-2">Zatím zde nejsou žádné sbírky.</p>
                  <p className="text-sm">Vytvořte první pomocí tlačítka "Nová Sbírka".</p>
                </td>
              </tr>
            ) : (
              collections.map((col) => (
                <tr key={col.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{col.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{col.description || 'Bez popisu'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {col._count.videos} videí
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {col.isPublic ? (
                        <div className="flex items-center text-green-500 text-sm gap-1.5">
                            <Eye className="w-4 h-4" /> <span className="font-medium">Veřejná</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-gray-400 text-sm gap-1.5">
                            <EyeOff className="w-4 h-4" /> <span>Soukromá</span>
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {col.seoDescription ? (
                        <span className="text-xs text-green-500 flex items-center gap-1">● Vyplněno</span>
                    ) : (
                        <span className="text-xs text-yellow-500 flex items-center gap-1">○ Chybí</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/collections/edit/${col.id}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 inline-flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" /> Upravit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}