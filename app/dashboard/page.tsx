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