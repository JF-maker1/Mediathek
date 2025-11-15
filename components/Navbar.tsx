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
          
          {/* --- ADMIN NAVIGACE --- */}
          {session.user?.role === 'ADMIN' && (
            <>
              <Link href="/admin/dashboard" className="hover:underline">Přehled obsahu</Link>
              <Link href="/admin/manage" className="hover:underline">Správa obsahu</Link>
              <Link href="/admin/add" className="font-bold hover:underline">Přidat video</Link>
            </>
          )}
          {/* --- KONEC ADMIN NAVIGACE --- */}

          <span style={{ marginLeft: "auto" }}>
            Přihlášen: {session.user?.email}
          </span>
        </>
      )}
    </nav>
  );
}