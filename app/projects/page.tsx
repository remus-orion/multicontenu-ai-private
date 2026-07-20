import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLATFORM_LABELS } from "@/lib/plans";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,created_at,generations(id,platform,content,status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <span className="badge">Historique</span>
          <h1 className="title" style={{ fontSize: "3rem" }}>Mes projets</h1>
          <p className="subtitle">{projects?.length ?? 0} projet{(projects?.length ?? 0) > 1 ? "s" : ""} au total</p>
        </div>
        <Link className="btn" href="/dashboard">Nouveau projet</Link>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {!projects?.length && (
          <div className="card" style={{ textAlign: "center" }}>
            <p className="subtitle">Aucun projet pour le moment. Crée ton premier contenu !</p>
            <Link className="btn" href="/dashboard">Créer un contenu</Link>
          </div>
        )}
        {projects?.map((project) => (
          <article className="card" key={project.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: "1.3rem" }}>{project.title}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  {new Date(project.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <form action="/api/projects/delete" method="POST">
                <input type="hidden" name="projectId" value={project.id} />
                <button type="submit" style={{
                  fontSize: 12, padding: "6px 12px",
                  background: "#dc2626", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer"
                }}>
                  🗑️ Supprimer
                </button>
              </form>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {project.generations?.map((gen) => (
                <div key={gen.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <span className="badge" style={{ marginBottom: 8, display: "inline-block" }}>
                    {PLATFORM_LABELS[gen.platform as keyof typeof PLATFORM_LABELS] || gen.platform}
                  </span>
                  {gen.content ? (
                    <pre className="output" style={{ fontSize: 13 }}>{gen.content}</pre>
                  ) : (
                    <p className="notice error">Génération échouée</p>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}