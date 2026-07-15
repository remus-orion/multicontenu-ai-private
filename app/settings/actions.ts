"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function updateProfileSettings(formData: FormData) {
  const user = await requireUser();
  const fullName = String(formData.get("full_name") || "").trim().slice(0, 120);
  const avatarUrl = String(formData.get("avatar_url") || "").trim().slice(0, 500);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      avatar_url: avatarUrl || null
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?message=saved");
}
