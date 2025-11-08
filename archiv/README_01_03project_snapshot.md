# Snímek Projektu: Mediathek

*Vygenerováno: 2025-11-03 23:00:48*

## 1. Souhrn Projektu

Jedná se o projekt **web_app_mediathek**, postavený na následujícím technologickém stacku: **Next.js, React, TypeScript, Tailwind CSS, Prisma, NextAuth.js**.

## 2. Analýza Projektu (package.json)

### Dostupné Skripty

| Příkaz (`npm run ...`) | Popis |
| ---------------------- | ----- |
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `prisma:migrate` | `dotenv -e .env.local -- prisma migrate dev` |
| `prisma:studio` | `dotenv -e .env.local -- prisma studio` |

### Klíčové Závislosti

| Knihovna | Verze | Účel |
| -------- | ----- | ---- |
| `@prisma/client` | `^6.18.0` | ORM a nástroj pro databázi |
| `bcrypt` | `^6.0.0` | Knihovna pro hashování hesel |
| `dotenv` | `^17.2.3` | Nástroj pro správu env. proměnných |
| `next` | `16.0.1` | Full-stack React framework |
| `next-auth` | `^4.24.13` | Knihovna pro autentizaci |
| `prisma` | `^6.18.0` | ORM a nástroj pro databázi |
| `react` | `19.2.0` | Knihovna pro tvorbu UI |
| `react-dom` | `19.2.0` | Knihovna pro tvorbu UI |
| `@tailwindcss/postcss` | `^4` | Utility-first CSS framework |
| `@types/bcrypt` | `^6.0.0` | Knihovna pro hashování hesel |
| `@types/node` | `^20` | N/A |
| `@types/react` | `^19` | Knihovna pro tvorbu UI |
| `@types/react-dom` | `^19` | Knihovna pro tvorbu UI |
| `dotenv-cli` | `^11.0.0` | Nástroj pro správu env. proměnných |
| `eslint` | `^9` | Linter pro kvalitu kódu |
| `eslint-config-next` | `16.0.1` | Linter pro kvalitu kódu |
| `tailwindcss` | `^4` | Utility-first CSS framework |
| `typescript` | `^5` | Typový systém pro JavaScript |

## 3. Environmentální Proměnné

Byl nalezen soubor `.env.local`. Aplikace očekává následující proměnné (hodnoty jsou skryty):
```
DATABASE_URL
DATABASE_URL_UNPOOLED
NEON_PROJECT_ID
PGDATABASE
PGHOST
PGHOST_UNPOOLED
PGPASSWORD
PGUSER
POSTGRES_DATABASE
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_PRISMA_URL
POSTGRES_URL
POSTGRES_URL_NON_POOLING
POSTGRES_URL_NO_SSL
POSTGRES_USER
VERCEL_OIDC_TOKEN
NEXTAUTH_SECRET
```

## 4. Systémové Prostředí

```
Node.js verze: v24.11.0
NPM verze:     11.6.1
Git verze:     git version 2.47.3
Systém:        Linux rpi5 6.12.47+rpt-rpi-2712 #1 SMP PREEMPT Debian 1:6.12.47-1+rpt1 (2025-09-16) aarch64 GNU/Linux
```

## 5. Stav Git Repozitáře

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   archiv/README_01_02REALIZACE

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	project_snapshot_new.py

no changes added to commit (use "git add" and/or "git commit -a")
```

## 6. Struktura Projektového Adresáře

```
web_app_Mediathek/
    postcss.config.mjs
    middleware.ts
    project_snapshot_new.py
    package-lock.json
    README.md
    next-env.d.ts
    test-env.js
    next.config.ts
    prisma.config.ts
    package.json
    tsconfig.json
    eslint.config.mjs
    components/
        Navbar.tsx
        Providers.tsx
    prisma/
        schema.prisma
        migrations/
            migration_lock.toml
            20251102210418_init_user_model/
                migration.sql
    app/
        favicon.ico
        layout.tsx
        page.tsx
        globals.css
        dashboard/
            page.tsx
        api/
            auth/
                [...nextauth]/
                    route.ts
            register/
                route.ts
        register/
            page.tsx
        login/
            page.tsx
    public/
        file.svg
        window.svg
        next.svg
        vercel.svg
        globe.svg
    archiv/
        README_00_02REALIZACE_Kick-off
        README_00_03project_snapshot.md
        README_01_01ZADANI
        README_PROJECT
        README_01_02REALIZACE
        README_00_01ZADANI
```

## 7. Obsah Klíčových Souborů

### `package.json`

```json
{
  "name": "web_app_mediathek",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "prisma:migrate": "dotenv -e .env.local -- prisma migrate dev",
    "prisma:studio": "dotenv -e .env.local -- prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.18.0",
    "bcrypt": "^6.0.0",
    "dotenv": "^17.2.3",
    "next": "16.0.1",
    "next-auth": "^4.24.13",
    "prisma": "^6.18.0",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcrypt": "^6.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "dotenv-cli": "^11.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.0.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

```

### `postcss.config.mjs`

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

### `middleware.ts`

```typescript
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
```

### `prisma/schema.prisma`

```text
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Definice rolí pro uživatele
enum Role {
  USER
  ADMIN
}

// Datový model pro uživatele
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `types/next-auth.d.ts`

```typescript
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

```

### `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar"; // <-- 1. Importujte Navbar

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Navbar /> {/* <-- 2. Vložte Navbar sem (dovnitř Providers) */}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

### `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

```

### `components/Navbar.tsx`

```tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", background: "#eee" }}>
      <Link href="/">Domů</Link>

      {status === "loading" && <p>...</p>}

      {status === "unauthenticated" && (
        <>
          <Link href="/login">Přihlásit se</Link>
          <Link href="/register">Registrovat</Link>
        </>
      )}

      {status === "authenticated" && (
        <>
          <Link href="/dashboard">Můj Dashboard</Link>
          <span style={{ marginLeft: "auto" }}>
            Přihlášen: {session.user?.email}
          </span>
          {/* Tlačítko pro odhlášení je na dashboardu, ale může být i zde */}
          {/* <button onClick={() => signOut()}>Odhlásit se</button> */}
        </>
      )}
    </nav>
  );
}
```

### `components/Providers.tsx`

```tsx
"use client";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### `app/page.tsx`

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">
        Mediathek: Tvá sbírka Tvých videí
      </h1>
    </main>
  );
}
```

### `app/dashboard/page.tsx`

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";

export default function DashboardPage() {
  // session obsahuje data o přihlášeném uživateli
  // status je "loading", "authenticated", nebo "unauthenticated"
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Načítání...</p>;
  }

  if (status === "unauthenticated") {
    // Toto by se díky middleware nemělo stát, ale je to pojistka
    return <p>Nejste přihlášeni.</p>;
  }

  return (
    <div>
      <h1>Vítejte na Dashboardu!</h1>
      <p>Toto je chráněný obsah.</p>
      {session?.user && (
        <div>
          <p>Jste přihlášen jako: {session.user.email}</p>
          <p>Vaše role: {session.user.role || "USER"}</p>
        </div>
      )}
      <button onClick={() => signOut({ callbackUrl: "/" })}>Odhlásit se</button>
    </div>
  );
}
```

### `app/login/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false, // Nechceme automatické přesměrování, ošetříme si to sami
        email,
        password,
      });

      if (result?.error) {
        setError("Neplatný e-mail nebo heslo.");
      } else if (result?.ok) {
        // Úspěšné přihlášení, přesměrujeme na dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Došlo k chybě při přihlašování.");
    }
  };

  return (
    <div>
      <h1>Přihlásit se</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Heslo:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Přihlásit se</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

### `app/register/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Po úspěšné registraci přesměrujeme na přihlášení
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.message || "Registrace se nezdařila.");
      }
    } catch (err) {
      setError("Došlo k chybě při registraci.");
    }
  };

  return (
    <div>
      <h1>Registrovat se</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Heslo:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Registrovat</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

### `app/api/auth/[...nextauth]/route.ts`

```typescript
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

```

### `app/api/register/route.ts`

```typescript
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new NextResponse("Missing email or password", { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      // Posíláme JSON objekt se zprávou, kterou frontend očekává
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
    });
  } catch (error) {
    console.error("REGISTRATION_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
```

