import Link from "next/link";
import ProjectGenerator from "@/components/ProjectGenerator";
import { getProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <span className="badge">Dashboard</span>
          <h1 className="title" style={{ fontSize: "3.4rem" }}>Création multi-contenu</h1>
          <p className="subtitle">Plan : {profile?.plan || "free"} • Crédits : {profile?.credits_remaining ?? 0}</p>
        </div>
        <Link className="btn secondary" href="/pricing">Améliorer le plan</Link>
      </div>

      <ProjectGenerator />

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Derniers projets</h2>
        {!projects?.length ? <p className="subtitle">Aucun projet pour le moment.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {projects?.map((project) => (
            <div className="notice" key={project.id}>
              <strong>{project.title}</strong>
              <br />
              <span>{new Date(project.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
