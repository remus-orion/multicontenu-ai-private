import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email,credits_remaining")
    .eq("id", user.id)
    .single();

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
          <span className="label">Jetons restants</span>
          <strong style={{ fontSize: "2.5rem", color: "#a78bfa" }}>{profile?.credits_remaining ?? 0}</strong>
        </article>
      </section>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn" href="/settings">Modifier mes réglages</Link>
        <Link className="btn secondary" href="/pricing">Acheter des jetons</Link>
      </div>
    </main>
  );
}