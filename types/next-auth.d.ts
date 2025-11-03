import 'next-auth';
import 'next-auth/jwt';

/**
 * Rozšiřujeme standardní typy NextAuth, abychom TypeScriptu
 * řekli, že budeme do session a tokenu přidávat vlastní data.
 */

declare module 'next-auth' {
  /**
   * Toto je objekt, který vidí klient (např. přes useSession())
   */
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user']; // Zachováme i standardní vlastnosti (name, email, image)
  }

  /**
   * Toto je objekt 'user', který vracíme z providera (authorize)
   * a dostáváme v JWT callbacku.
   */
  interface User {
    // Výchozí User již má id, name, email, image.
    // My přidáváme pouze naši roli.
    role: string;
  }
}

/**
 * Rozšíření JWT tokenu.
 */
declare module 'next-auth/jwt' {
  /** Toto je obsah našeho JWT tokenu v cookie. */
  interface JWT {
    id: string;
    role: string;
  }
}
