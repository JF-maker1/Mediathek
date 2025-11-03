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