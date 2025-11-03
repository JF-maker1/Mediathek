import NextAuth, { AuthOptions } from "next-auth"; // <-- Importujeme AuthOptions
import { PrismaClient } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Explicitně typujeme naše volby, aby TypeScript mohl odvodit
// typy pro všechny callbacky (tím se zbavíme chyby 'any').
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Vracíme objekt, který odpovídá naší rozšířené definici 'User'
        // (viz types/next-auth.d.ts)
        return {
          id: user.id,
          email: user.email,
          role: user.role, // Prisma enum (USER/ADMIN) je kompatibilní se stringem
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Díky AuthOptions a typovému souboru již TypeScript ví,
    // že 'token' je JWT a 'user' je náš rozšířený User.
    async jwt({ token, user }) {
      // Při prvním přihlášení (kdy 'user' existuje) přeneseme data do tokenu
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Zde přeneseme data z tokenu (který je v cookie) do session
    // (kterou vidí klient)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
