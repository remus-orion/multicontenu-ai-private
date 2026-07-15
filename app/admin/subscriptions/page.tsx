import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { emailIsAdmin, getProfile, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminSubscriptionsPage() {
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

  const { data: subscriptions } = await supabaseAdmin
    .from("subscriptions")
    .select("id,status,plan,created_at,user_id")
    .order("created_at", { ascending: false });

  return (
    <main className="page">
      <Link href="/admin" style={{ textDecoration: "underline", fontSize: 14 }}>← Retour admin</Link>
      <h1 className="title" style={{ fontSize: "2.5rem", marginTop: 12 }}>Abonnements</h1>
      <p className="subtitle">{subscriptions?.length ?? 0} abonnements au total</p>

      <section className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {!subscriptions?.length && <p className="subtitle">Aucun abonnement pour le moment.</p>}
          {subscriptions?.map((item) => (
            <div key={item.id} style={{ 
              padding: "12px 16px",
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: item.status === "active" ? "rgba(0,200,0,0.05)" : "transparent"
            }}>
              <strong>{item.plan?.toUpperCase() || "Plan inconnu"}</strong>
              <br />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Statut : <strong>{item.status}</strong> • {new Date(item.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}