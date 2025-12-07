import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import UserRoleSelect from '@/components/UserRoleSelect';

const prisma = new PrismaClient();

// Vynutit dynamické renderování
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/admin/dashboard');
  }

  // 2. Načtení uživatelů
  // OPRAVA: Odstraněno 'name' i 'image', protože v DB schématu chybí
  // Prisma by jinak vyhodila chybu "Unknown field"
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      email: true, 
      role: true, 
      // image: true, // <-- ODSTRANĚNO (způsobovalo chybu)
      createdAt: true
    }
  });

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Správa Uživatelů</h1>
        <p className="mt-2 text-sm text-gray-600">
          Zde můžete spravovat role uživatelů. Role <strong>KURATOR</strong> má přístup do administrace, ale vidí jen svůj obsah.
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uživatel (Email)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum registrace
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const isMe = user.id === session.user.id;
                // Iniciála z emailu (použijeme jako avatar, když nemáme image)
                const initial = user.email ? user.email[0].toUpperCase() : '?';
                
                return (
                  <tr key={user.id} className={isMe ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {/* Avatar nahrazen zástupným symbolem (iniciálou) */}
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                            {initial}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          {isMe && <span className="text-xs text-indigo-600 font-semibold">(To jste vy)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <UserRoleSelect 
                        userId={user.id} 
                        currentRole={user.role || 'USER'} 
                        currentUserIsMe={isMe}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('cs-CZ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}