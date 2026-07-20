"use client";

import { useState } from "react";

interface Props {
  plan: "starter" | "pro" | "business";
}

export default function PricingCheckoutButton({ plan }: Props) {
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
        },
        body: JSON.stringify({ plan })
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
    <div style={{ marginTop: 20 }}>
      <button className="btn accent" onClick={handleCheckout} disabled={loading} type="button" style={{ width: "100%" }}>
        {loading ? "Redirection..." : "Acheter ce pack"}
      </button>
      {error ? <p className="notice error" style={{ marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}