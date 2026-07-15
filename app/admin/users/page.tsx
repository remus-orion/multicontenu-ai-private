import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { emailIsAdmin, getProfile, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminUsersPage() {
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

  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id,email,plan,credits_remaining,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="page">
      <Link href="/admin" style={{ textDecoration: "underline", fontSize: 14 }}>← Retour admin</Link>
      <h1 className="title" style={{ fontSize: "2.5rem", marginTop: 12 }}>Tous les utilisateurs</h1>
      <p className="subtitle">{users?.length ?? 0} utilisateurs au total</p>

      <section className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {users?.map((item) => (
            <div key={item.id} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: item.plan === "vip" ? "rgba(255,215,0,0.1)" : "transparent"
            }}>
              <div>
                <strong>{item.email || "Email inconnu"}</strong>
                <br />
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Plan <strong style={{ color: item.plan === "vip" ? "gold" : "inherit" }}>{item.plan?.toUpperCase()}</strong>
                  {" "}• crédits {item.credits_remaining}
                  {" "}• {new Date(item.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <form action="/api/admin/set-plan" method="POST">
                  <input type="hidden" name="userId" value={item.id} />
                  <input type="hidden" name="plan" value="vip" />
                  <button type="submit" style={{ fontSize: 12, padding: "6px 12px", background: "gold", color: "black", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
                    👑 VIP
                  </button>
                </form>
                <form action="/api/admin/set-plan" method="POST">
                  <input type="hidden" name="userId" value={item.id} />
                  <input type="hidden" name="plan" value="free" />
                  <button type="submit" style={{ fontSize: 12, padding: "6px 12px", background: "#666", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    Free
                  </button>
                </form>
                <form action="/api/admin/set-plan" method="POST">
                  <input type="hidden" name="userId" value={item.id} />
                  <input type="hidden" name="plan" value="pro" />
                  <button type="submit" style={{ fontSize: 12, padding: "6px 12px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    Pro
                  </button>
                </form>
                <form action="/api/admin/delete-user" method="POST">
                  <input type="hidden" name="userId" value={item.id} />
                  <button type="submit" style={{ fontSize: 12, padding: "6px 12px", background: "#dc2626", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    🗑️ Supprimer
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}