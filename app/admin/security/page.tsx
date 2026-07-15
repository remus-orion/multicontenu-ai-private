import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { emailIsAdmin, getProfile, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminSecurityPage() {
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get("admin_auth");
  if (!adminAuth || adminAuth.value !== "true") {
    redirect("/admin/auth");
  }

  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (profile?.role !== "admin" && !emailIsAdmin(user.email)) {
    notFound();
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: events } = await supabaseAdmin
    .from("security_events")
    .select("id,event_type,reason,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="page">
      <Link href="/admin" style={{ textDecoration: "underline", fontSize: 14 }}>← Retour admin</Link>
      <h1 className="title" style={{ fontSize: "2.5rem", marginTop: 12 }}>Événements sécurité</h1>
      <p className="subtitle">{events?.length ?? 0} événements au total</p>

      <section className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {!events?.length && <p className="subtitle">Aucun événement pour le moment. 🎉</p>}
          {events?.map((item) => (
            <div key={item.id} style={{ 
              padding: "12px 16px",
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "rgba(220,38,38,0.05)"
            }}>
              <strong>{item.reason || "Raison inconnue"}</strong>
              <br />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {item.event_type} • {new Date(item.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}