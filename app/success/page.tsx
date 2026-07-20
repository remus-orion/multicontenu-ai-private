import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <span className="badge">✅ Paiement validé</span>
        <h1 className="title" style={{ fontSize: "3rem" }}>Jetons ajoutés !</h1>
        <p className="subtitle">Ton achat a été validé. Tes jetons ont été ajoutés à ton compte et sont disponibles immédiatement.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/dashboard">Utiliser mes jetons</Link>
          <Link className="btn secondary" href="/account">Voir mon compte</Link>
        </div>
      </section>
    </main>
  );
}