"use client";

import { useState } from "react";
import { signInWithEmail } from "@/app/login/actions";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <span className="badge">Connexion</span>
        <h1 className="title" style={{ fontSize: "3rem" }}>Entre dans l'atelier.</h1>
        <p className="subtitle">Connexion sécurisée à ton espace MultiContenu AI.</p>

        <form action={signInWithEmail}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required placeholder="toi@example.com" />
          </div>

          <div className="field" style={{ position: "relative" }}>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input
              className="input"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              style={{ paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 12, top: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button className="btn" type="submit" style={{ marginTop: 16, width: "100%" }}>
            Se connecter
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: "center" }}>
          Pas encore de compte ?{" "}
          <Link href="/register" style={{ textDecoration: "underline" }}>
            S'inscrire
          </Link>
        </p>
      </div>
    </main>
  );
}