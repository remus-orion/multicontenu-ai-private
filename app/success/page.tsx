import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <span className="badge">Paiement validé</span>
        <h1 className="title" style={{ fontSize: "3rem" }}>Abonnement activé</h1>
        <p className="subtitle">Stripe a validé le paiement. Le webhook synchronise ton plan côté Supabase.</p>
        <Link className="btn" href="/dashboard">Retour au dashboard</Link>
      </section>
    </main>
  );
}
