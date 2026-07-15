import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <span className="badge">MultiContenu AI</span>
          <h1>Un contenu. Cinq formats. Une fusée éditoriale.</h1>
          <p className="subtitle">
            Colle ton idée, ton article, ton script ou ton résumé. L'application le transforme en contenus adaptés pour LinkedIn, X/Twitter, Instagram, TikTok et newsletter.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" href="/dashboard">Créer un contenu</Link>
            <Link className="btn secondary" href="/pricing">Voir les tarifs</Link>
          </div>
        </div>
        <div className="card">
          <h2>Pipeline intégré</h2>
          <p className="subtitle">
            Auth Supabase, génération Anthropic, paiement Stripe, compte utilisateur, réglages et admin panel. Le petit atelier devient une machine propre.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
            <span className="badge">Login sécurisé</span>
            <span className="badge">Crédits gratuits</span>
            <span className="badge">Abonnement Pro</span>
            <span className="badge">Historique projets</span>
          </div>
        </div>
      </section>
    </main>
  );
}
