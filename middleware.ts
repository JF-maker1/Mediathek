import { withAuth } from 'next-auth/middleware';

// Exportujeme přímo funkci 'withAuth' s naší konfigurací.
// Next.js tak jasně uvidí, že soubor exportuje funkci.
export default withAuth({
  // Musíme middleware říct, kam má přesměrovat uživatele,
  // pokud není přihlášený. Toto musí odpovídat nastavení
  // v 'authOptions'.
  pages: {
    signIn: '/login',
  },
});

// Konfigurace matcheru (které stránky chránit) zůstává stejná.
export const config = {
  matcher: ['/dashboard'],
};