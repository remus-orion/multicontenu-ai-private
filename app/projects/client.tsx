"use client";

import { useState } from "react";
import { PLATFORM_LABELS } from "@/lib/plans";
import Link from "next/link";

type Generation = {
  id: string;
  platform: string;
  content: string;
  status: string;
};

type Project = {
  id: string;
  title: string;
  created_at: string;
  generations: Generation[];
};

function ProjectDetail({ project }: { project: Project }) {
  const [activeTab, setActiveTab] = useState(project.generations[0]?.platform || "");
  const [copied, setCopied] = useState(false);
  const activeGen = project.generations.find((g) => g.platform === activeTab);

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {project.generations.map((gen) => (
          <button
            key={gen.platform}
            onClick={() => { setActiveTab(gen.platform); setCopied(false); }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: activeTab === gen.platform ? "var(--accent)" : "transparent",
              color: activeTab === gen.platform ? "white" : "var(--muted)",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {PLATFORM_LABELS[gen.platform as keyof typeof PLATFORM_LABELS] || gen.platform}
          </button>
        ))}
      </div>

      {activeGen?.content ? (
        <div>
          <pre className="output" style={{ fontSize: 13 }}>{activeGen.content}</pre>
          <button
            onClick={() => handleCopy(activeGen.content)}
            style={{
              marginTop: 8, fontSize: 12, padding: "6px 14px",
              background: copied ? "#22c55e" : "var(--accent)",
              color: "white", border: "none", borderRadius: 8,
              cursor: "pointer", fontWeight: "bold", transition: "background 0.2s"
            }}
          >
            {copied ? "✅ Copié !" : "📋 Copier"}
          </button>
        </div>
      ) : (
        <p className="notice error">Génération échouée pour cette plateforme</p>
      )}
    </div>
  );
}

export default function ProjectsPageClient({ projects: initialProjects }: { projects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [openProject, setOpenProject] = useState<string | null>(null);

  async function handleDelete(projectId: string) {
    const formData = new FormData();
    formData.append("projectId", projectId);
    await fetch("/api/projects/delete", { method: "POST", body: formData });
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (openProject === projectId) setOpenProject(null);
  }

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <span className="badge">Historique</span>
          <h1 className="title" style={{ fontSize: "3rem" }}>Mes projets</h1>
          <p className="subtitle">{projects.length} projet{projects.length > 1 ? "s" : ""} au total</p>
        </div>
        <Link className="btn" href="/dashboard">Nouveau projet</Link>
      </div>

      {!projects.length && (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="subtitle">Aucun projet pour le moment.</p>
          <Link className="btn" href="/dashboard">Créer un contenu</Link>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {projects.map((project) => (
          <article className="card" key={project.id} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setOpenProject(openProject === project.id ? null : project.id)}
                style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, color: "var(--accent)" }}>
                    {openProject === project.id ? "▼" : "▶"}
                  </span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--ink)" }}>{project.title}</h2>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                      {new Date(project.created_at).toLocaleString("fr-FR")} •{" "}
                      {project.generations.length} plateforme{project.generations.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleDelete(project.id)}
                style={{
                  fontSize: 12, padding: "6px 12px",
                  background: "#dc2626", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0
                }}
              >
                🗑️ Supprimer
              </button>
            </div>

            {openProject === project.id && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                <ProjectDetail project={project} />
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}