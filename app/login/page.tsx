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