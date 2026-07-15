import { notFound } from "next/navigation";
import { emailIsAdmin, getProfile, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (profile?.role !== "admin" && !emailIsAdmin(user.email)) {
    notFound();
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const [profiles, projects, generations, subscriptions, blockedGenerations] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("generations").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("security_events").select("id", { count: "exact", head: true }).eq("event_type", "generation_blocked")
  ]);

  const { data: latestUsers } = await supabaseAdmin
    .from("profiles")
    .select("email,plan,credits_remaining,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: latestSecurityEvents } = await supabaseAdmin
    .from("security_events")
    .select("event_type,reason,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="page">
      <span className="badge">Admin panel</span>
      <h1 className="title" style={{ fontSize: "3.4rem" }}>Pilotage</h1>
      <p className="subtitle">Vue serveur uniquement. Les données sensibles passent par la service role côté serveur, jamais côté navigateur.</p>

      <section className="grid">
        <article className="card kpi"><span className="label">Utilisateurs</span><strong>{profiles.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Projets</span><strong>{projects.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Générations</span><strong>{generations.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Abonnements actifs</span><strong>{subscriptions.count ?? 0}</strong></article>
        <article className="card kpi"><span className="label">Blocages anti-spam</span><strong>{blockedGenerations.count ?? 0}</strong></article>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Derniers utilisateurs</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {latestUsers?.map((item) => (
            <div className="notice" key={item.email || item.created_at}>
              <strong>{item.email || "Email inconnu"}</strong>
              <br />
              <span>Plan {item.plan} • crédits {item.credits_remaining} • {new Date(item.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Derniers événements sécurité</h2>
        {!latestSecurityEvents?.length ? <p className="subtitle">Aucun blocage anti-spam pour le moment.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {latestSecurityEvents?.map((item) => (
            <div className="notice" key={`${item.created_at}-${item.reason}`}>
              <strong>{item.reason}</strong>
              <br />
              <span>{item.event_type} • {new Date(item.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
