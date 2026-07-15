import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,credits_remaining,plan,role,created_at")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export function emailIsAdmin(email: string | null | undefined) {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) || [];
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}
