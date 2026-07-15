"use client";

import { useState } from "react";

export default function PricingCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible de créer la session Stripe.");
      }

      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn accent" onClick={handleCheckout} disabled={loading} type="button">
        {loading ? "Redirection..." : "S'abonner maintenant"}
      </button>
      {error ? <p className="notice error" style={{ marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}
