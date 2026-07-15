import PricingCheckoutButton from "@/components/PricingCheckoutButton";

export default function PricingPage() {
  return (
    <main className="page">
      <section style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 28px" }}>
        <span className="badge">Tarifs</span>
        <h1 className="title">Tarifs simples et transparents</h1>
        <p className="subtitle">Un plan gratuit pour tester. Un plan Pro pour produire régulièrement avec des limites anti-abus claires.</p>
      </section>

      <section className="grid two" style={{ maxWidth: 940, margin: "0 auto" }}>
        <article className="card">
          <span className="badge">Free</span>
          <h2>0 € / mois</h2>
          <p className="subtitle">Pour tester le moteur.</p>
          <ul>
            <li>10 crédits offerts</li>
            <li>5 plateformes</li>
            <li>Historique projets</li>
            <li>Connexion sécurisée</li>
          </ul>
        </article>

        <article className="card" style={{ borderColor: "rgba(184, 115, 51, 0.45)" }}>
          <span className="badge">Pro</span>
          <h2 style={{ fontSize: "3rem", margin: "12px 0" }}>19 € <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ mois</span></h2>
          <p className="subtitle">Pour publier régulièrement et industrialiser ton contenu.</p>
          <ul>
            <li>Quota Pro généreux</li>
            <li>Protection anti-spam incluse</li>
            <li>Toutes les plateformes + IA</li>
            <li>Historique + templates</li>
            <li>Support prioritaire</li>
          </ul>
          <PricingCheckoutButton />
          <p className="footer-note">Paiement sécurisé par Stripe • Annule à tout moment</p>
        </article>
      </section>
    </main>
  );
}
