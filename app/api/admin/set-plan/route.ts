import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // Vérifier le cookie admin
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get("admin_auth");
  if (!adminAuth || adminAuth.value !== "true") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const userId = formData.get("userId") as string;
  const plan = formData.get("plan") as string;

  if (!userId || !plan) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const credits = plan === "vip" ? 999999 : 10;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan, credits_remaining: credits })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}