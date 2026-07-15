"use client";

import { useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORM_OPTIONS, type Platform } from "@/lib/plans";

type GenerationResult = {
  platform: Platform;
  content: string;
};

type QuotaResult = {
  remaining_today: number | null;
  daily_limit: number | null;
};

export default function ProjectGenerator() {
  const [title, setTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["linkedin", "twitter", "instagram"]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [quota, setQuota] = useState<QuotaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && sourceContent.trim().length > 0 && platforms.length > 0 && !loading;
  }, [title, sourceContent, platforms, loading]);

  function togglePlatform(platform: Platform) {
    setPlatforms((current) => {
      if (current.includes(platform)) {
        return current.filter((item) => item !== platform);
      }
      return [...current, platform];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setQuota(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          source_content: sourceContent,
          platforms
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "La génération a échoué.");
      }

      setResults(payload.generations || []);
      setQuota(payload.quota || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid two">
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="title">Titre du projet</label>
          <input
            id="title"
            className="input"
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Exemple : lancement de mon offre IA"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="source_content">Contenu source</label>
          <textarea
            id="source_content"
            className="textarea"
            maxLength={20000}
            value={sourceContent}
            onChange={(event) => setSourceContent(event.target.value)}
            placeholder="Colle ici ton idée, ton article, ton script ou ton résumé..."
          />
        </div>

        <div className="field">
          <span className="label">Plateformes</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PLATFORM_OPTIONS.map((platform) => (
              <label className="badge" key={platform} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={platforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                  style={{ marginRight: 8 }}
                />
                {PLATFORM_LABELS[platform]}
              </label>
            ))}
          </div>
        </div>

        <button className="btn" disabled={!canSubmit} type="submit">
          {loading ? "Génération..." : "Générer les contenus"}
        </button>

        {error ? <p className="notice error" style={{ marginTop: 16 }}>{error}</p> : null}
        {quota ? (
          <p className="notice success" style={{ marginTop: 16 }}>
            Quota restant aujourd'hui : {quota.remaining_today ?? "?"} / {quota.daily_limit ?? "?"}
          </p>
        ) : null}
      </form>

      <section className="card">
        <h2>Résultat</h2>
        {!results.length && !loading ? (
          <p className="subtitle">Les contenus générés apparaîtront ici. Le chaudron éditorial est prêt.</p>
        ) : null}
        {loading ? <p className="notice">Génération en cours...</p> : null}
        <div style={{ display: "grid", gap: 14 }}>
          {results.map((item) => (
            <article key={item.platform}>
              <span className="badge">{PLATFORM_LABELS[item.platform]}</span>
              {item.content ? (
                <pre className="output">{item.content}</pre>
              ) : (
                <p className="notice error" style={{ marginTop: 10 }}>
                  Échec de la génération pour cette plateforme. Réessaie.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
