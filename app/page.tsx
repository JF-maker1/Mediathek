import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient, Prisma } from '@prisma/client';
// 1. Importujeme naši sdílenou komponentu
import VideoGrid from '@/components/VideoGrid';

const prisma = new PrismaClient();

// Vynutíme dynamické renderování, aby se session vždy četla čerstvá
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 2. Sestavení dynamického 'where' dotazu dle specifikace Fáze 8
  
  // Výchozí pravidlo: VISITOR a USER vidí jen videa,
  // která jsou v ALESPOŇ JEDNÉ veřejné sbírce.
  let whereClause: Prisma.VideoWhereInput = {
    collections: {
      some: {
        isPublic: true,
      },
    },
  };

  // Výjimka: ADMIN vidí VŠECHNO (drafty, soukromé, veřejné)
  if (session && session.user.role === 'ADMIN') {
    whereClause = {}; // Prázdný 'where' znamená "vše"
  }
  
  // TODO: Logika pro KURATORA (Fáze 9)
  // if (session && session.user.role === 'KURATOR') {
  //   whereClause = {
  //     OR: [
  //       { collections: { some: { isPublic: true } } },
  // { authorId: session.user.id }
  //     ]
  //   };
  // }

  // 3. Finální dotaz do DB
  // AKTUALIZACE: Přidáme 'include' autora, aby VideoGrid
  // mohl zobrazit stejné detaily jako admin dashboard.
  const videos = await prisma.video.findMany({
    where: whereClause,
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

  // 4. Zobrazení pomocí sdílené komponenty
  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8">Vítejte v Mediathek - zde je Vaše knihovna mediálního obsahu - prohlížejte sbírky shlednutých videí vytvořených jinými nejen pro sebe, ale také i pro Vás - vytvářejte témata - uspořádávejte i svou sbírku - vybírejte to nejlepší - dělejte si poznámky ke shlednutému - sdílejte svou sbírku s ostatními - dejte mediálnímu obsahu svůj jedinečný pohled</h1>
      
      {/* AKTUALIZACE: Použijeme stejnou komponentu, ale změníme
        baseHref, aby odkazy směřovaly na budoucí
        veřejnou stránku detailu (např. /video/[id]).
        Prozatím můžeme nechat /admin/video, 
        návštěvník bude přesměrován na /login (Test 5).
      */}
      <VideoGrid videos={videos} baseHref="/admin/video" />
    </main>
  );
}