import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createSupabaseServerClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,plan,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="page">
      <span className="badge">Compte utilisateur</span>
      <h1 className="title" style={{ fontSize: "3.4rem" }}>Ton compte</h1>

      <section className="grid two">
        <article className="card kpi">
          <span className="label">Email</span>
          <strong style={{ fontSize: "1.25rem" }}>{profile?.email || user.email}</strong>
        </article>
        <article className="card kpi">
          <span className="label">Plan</span>
          <strong>{profile?.plan || "free"}</strong>
        </article>
        <article className="card kpi">
          <span className="label">Crédits restants</span>
          <strong>{profile?.credits_remaining ?? 0}</strong>
        </article>
        <article className="card kpi">
          <span className="label">Abonnement Stripe</span>
          <strong style={{ fontSize: "1.4rem" }}>{subscription?.status || "inactive"}</strong>
          {subscription?.current_period_end ? (
            <span className="subtitle">Fin période : {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}</span>
          ) : null}
        </article>
      </section>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn" href="/settings">Modifier mes réglages</Link>
        <Link className="btn secondary" href="/pricing">Gérer mon plan</Link>
      </div>
    </main>
  );
}
