import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
// 1. Importujeme naši novou sdílenou komponentu
import VideoGrid from '@/components/VideoGrid';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // 1. Bezpečnostní kontrola na serveru (zůstává)
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/');
  }

  // 2. Načtení dat z databáze
  // AKTUALIZACE: Ponecháváme načítání autora, jak je ve vašem souboru.
  // To je důležité pro VideoGrid.
  const videos = await prisma.video.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      author: {
        select: {
            email: true
        }
      },
      // PŘIDÁNO: Načtení názvů a ID přiřazených sbírek
      collections: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // 3. Vykreslení UI
  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Přehled Obsahu (Admin Dashboard)</h1>
        <Link
          href="/admin/add"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          + Přidat nové video
        </Link>
      </div>

      {/* AKTUALIZACE: Celý původní blok (<div className="grid...">...</div>) 
        je nyní nahrazen touto jedinou komponentou.
      */}
      <VideoGrid videos={videos} baseHref="/video" showEditButton={true} />
      
    </main>
  );
}