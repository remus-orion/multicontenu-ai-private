"use client";

import { useState, useEffect } from "react";
import { signUpWithEmail } from "@/app/login/actions";
import Link from "next/link";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("message");
    if (msg === "check-email") setMessage("✅ Vérifie ta boîte mail et clique sur le lien de confirmation !");
    if (msg === "email-required") setMessage("⚠️ Email et mot de passe requis.");
    if (msg) setMessage(decodeURIComponent(msg));
  }, []);

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <span className="badge">Inscription</span>
        <h1 className="title" style={{ fontSize: "3rem" }}>Crée ton compte.</h1>
        <p className="subtitle">Rejoins l'atelier et commence à générer du contenu.</p>

        {message && (
          <p style={{ marginBottom: 16, padding: 12, background: "#f0fdf4", borderRadius: 8, color: "#166534" }}>
            {message}
          </p>
        )}

        <form action={signUpWithEmail}>
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

          <div className="field" style={{ position: "relative" }}>
            <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
            <input
              className="input"
              id="confirm"
              name="confirm"
              type={showConfirm ? "text" : "password"}
              required
              placeholder="••••••••"
              style={{ paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              style={{ position: "absolute", right: 12, top: 36, background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>

          <button className="btn" type="submit" style={{ marginTop: 16, width: "100%" }}>
            Créer mon compte
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: "center" }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ textDecoration: "underline" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}