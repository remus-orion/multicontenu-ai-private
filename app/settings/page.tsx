import { updateProfileSettings } from "@/app/settings/actions";
import { getProfile, requireUser } from "@/lib/auth";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const params = await searchParams;
  const message = params.message === "saved" ? "Réglages enregistrés." : params.message;

  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
        <span className="badge">Settings</span>
        <h1 className="title" style={{ fontSize: "3.2rem" }}>Réglages</h1>
        <p className="subtitle">Ici on garde les champs sensibles verrouillés. Le plan, les crédits et le rôle sont gérés côté serveur.</p>

        <form action={updateProfileSettings}>
          <div className="field">
            <label className="label" htmlFor="full_name">Nom affiché</label>
            <input className="input" id="full_name" name="full_name" defaultValue={profile?.full_name || ""} />
          </div>
          <div className="field">
            <label className="label" htmlFor="avatar_url">Avatar URL</label>
            <input className="input" id="avatar_url" name="avatar_url" defaultValue={profile?.avatar_url || ""} />
          </div>
          <button className="btn" type="submit">Enregistrer</button>
        </form>

        {message ? <p className="notice success" style={{ marginTop: 16 }}>{decodeURIComponent(message)}</p> : null}
      </section>
    </main>
  );
}
