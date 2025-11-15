import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import DeleteButton from '@/components/DeleteButton'; // Importujeme novou komponentu

const prisma = new PrismaClient();

// Zajistí, že se stránka při každém načtení přegeneruje (dynamické)
export const dynamic = 'force-dynamic'; 

export default async function AdminManagePage() {
  const session = await getServerSession(authOptions);

  // Ochrana stránky
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/');
  }

  // Načítání dat na základě role (příprava na budoucí roli KURATOR)
  // OPRAVA CHYBY: Musíme sestavit argumenty a zavolat findMany jen jednou.
     
  // 1. Definujeme 'where' podmínku na základě role
  const whereCondition = 
    session.user.role === 'ADMIN' 
    ? {} // Admin vidí vše (prázdná podmínka)
    : { authorId: session.user.id }; // Ostatní jen své

  // 2. Zavoláme findMany POUZE JEDNOU s finálními argumenty
  const videos = await prisma.video.findMany({
    where: whereCondition, // Aplikujeme podmínku
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Správa Obsahu</h1>
        <Link
          href="/admin/add"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          + Přidat nové video
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Název
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Datum přidání
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Posl. úprava
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Akce
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {videos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  Nebyla nalezena žádná videa.
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{video.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(video.createdAt).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(video.updatedAt).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <Link
                      href={`/admin/edit/${video.id}`}
                      className="text-indigo-500 hover:text-indigo-700 hover:underline"
                    >
                      Editovat
                    </Link>
                    <DeleteButton videoId={video.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}