import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { emailIsAdmin, getProfile, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminGenerationsPage() {
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

  const { data: generations } = await supabaseAdmin
    .from("generations")
    .select("id,platform,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="page">
      <Link href="/admin" style={{ textDecoration: "underline", fontSize: 14 }}>← Retour admin</Link>
      <h1 className="title" style={{ fontSize: "2.5rem", marginTop: 12 }}>Toutes les générations</h1>
      <p className="subtitle">{generations?.length ?? 0} générations au total</p>

      <section className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {!generations?.length && <p className="subtitle">Aucune génération pour le moment.</p>}
          {generations?.map((item) => (
            <div key={item.id} style={{ 
              padding: "12px 16px",
              border: "1px solid var(--line)",
              borderRadius: 12,
            }}>
              <strong>{item.platform || "Plateforme inconnue"}</strong>
              <br />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {new Date(item.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}