"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAuthPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Mot de passe incorrect !");
    }
  }

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <span className="badge">🔐 Accès Admin</span>
        <h1 className="title" style={{ fontSize: "2.5rem" }}>Zone sécurisée.</h1>
        <p className="subtitle">Accès réservé aux administrateurs.</p>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ position: "relative" }}>
            <label className="label" htmlFor="password">Mot de passe admin</label>
            <input
              className="input"
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 12, top: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

          <button className="btn" type="submit" style={{ marginTop: 16, width: "100%" }}>
            Accéder au panel
          </button>
        </form>
      </div>
    </main>
  );
}