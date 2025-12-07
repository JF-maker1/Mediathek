import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Vrací Prisma "where" podmínku na základě role uživatele.
 * Použití: const where = await getAuthFilter();
 * prisma.video.findMany({ where, ... });
 */
export async function getAuthFilter() {
  const session = await getServerSession(authOptions);
  
  const role = session?.user?.role;
  const userId = session?.user?.id;

  // 1. Pokud je uživatel ADMIN, nefiltrujeme nic (vracíme prázdný objekt)
  // Admin vidí obsah všech uživatelů.
  if (role === 'ADMIN') {
    return {};
  }

  // 2. Pokud je to KURATOR (nebo běžný USER, pokud by se sem dostal),
  // vrátíme filtr, který omezí výsledky jen na záznamy, kde authorId odpovídá jeho ID.
  if (userId) {
    return { authorId: userId };
  }

  // Fallback: Pokud není session nebo userId, vrátíme podmínku, která nic nenajde
  // (pro bezpečnost, aby se neukázalo vše při chybě session)
  return { authorId: 'unauthorized_ghost_user' };
}