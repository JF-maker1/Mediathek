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