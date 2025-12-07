import { DefaultSession } from 'next-auth';
import 'next-auth/jwt';

/**
 * Rozšiřujeme standardní typy NextAuth o naši striktní roli.
 * Tím zajistíme, že všude v aplikaci (session.user.role) bude TypeScript
 * očekávat jen 'USER', 'ADMIN' nebo 'KURATOR'.
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'USER' | 'ADMIN' | 'KURATOR'; // <-- Striktní typ
    } & DefaultSession['user'];
  }

  interface User {
    role: 'USER' | 'ADMIN' | 'KURATOR'; // <-- Striktní typ
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'USER' | 'ADMIN' | 'KURATOR'; // <-- Striktní typ
  }
}