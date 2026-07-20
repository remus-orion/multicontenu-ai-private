import PricingCheckoutButton from "@/components/PricingCheckoutButton";

export default function PricingPage() {
  const features = [
    "Protection anti-spam incluse",
    "5 plateformes + IA",
    "Historique + templates",
    "Support prioritaire",
  ];

  return (
    <main className="page">
      <section style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 48px" }}>
        <span className="badge">Tarifs</span>
        <h1 className="title">Achetez vos jetons</h1>
        <p className="subtitle">Payez uniquement ce que vous utilisez. Chaque jeton = une génération de contenu.</p>
      </section>

      <section className="grid" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <article className="card" style={{ borderColor: "rgba(124, 58, 237, 0.3)", textAlign: "center" }}>
          <span className="badge">Starter</span>
          <h2 style={{ fontSize: "2.5rem", margin: "16px 0 4px", letterSpacing: "-0.04em" }}>
            19,99 € <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ pack</span>
          </h2>
          <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "1.1rem", margin: "0 0 16px" }}>20 jetons</p>
          <p className="subtitle">Pour démarrer et tester vos premières générations.</p>
          <ul style={{ textAlign: "left", paddingLeft: 20, color: "var(--muted)", lineHeight: 2 }}>
            {features.map((f) => <li key={f}>✦ {f}</li>)}
          </ul>
          <PricingCheckoutButton plan="starter" />
        </article>

        <article className="card" style={{ borderColor: "rgba(124, 58, 237, 0.7)", textAlign: "center", background: "rgba(124, 58, 237, 0.08)" }}>
          <span className="badge" style={{ background: "rgba(124, 58, 237, 0.3)", color: "#a78bfa" }}>⭐ Pro</span>
          <h2 style={{ fontSize: "2.5rem", margin: "16px 0 4px", letterSpacing: "-0.04em" }}>
            39,99 € <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ pack</span>
          </h2>
          <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "1.1rem", margin: "0 0 16px" }}>50 jetons</p>
          <p className="subtitle">Pour les créateurs qui publient régulièrement.</p>
          <ul style={{ textAlign: "left", paddingLeft: 20, color: "var(--muted)", lineHeight: 2 }}>
            {features.map((f) => <li key={f}>✦ {f}</li>)}
          </ul>
          <PricingCheckoutButton plan="pro" />
          <p className="footer-note">Le plus populaire</p>
        </article>

        <article className="card" style={{ borderColor: "rgba(124, 58, 237, 0.3)", textAlign: "center" }}>
          <span className="badge">Business</span>
          <h2 style={{ fontSize: "2.5rem", margin: "16px 0 4px", letterSpacing: "-0.04em" }}>
            79,99 € <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ pack</span>
          </h2>
          <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "1.1rem", margin: "0 0 16px" }}>100 jetons</p>
          <p className="subtitle">Pour les équipes et agences qui produisent à grande échelle.</p>
          <ul style={{ textAlign: "left", paddingLeft: 20, color: "var(--muted)", lineHeight: 2 }}>
            {features.map((f) => <li key={f}>✦ {f}</li>)}
          </ul>
          <PricingCheckoutButton plan="business" />
        </article>
      </section>

      <p className="footer-note" style={{ marginTop: 32 }}>
        Paiement sécurisé par Stripe • Les jetons n'expirent pas
      </p>
    </main>
  );
}