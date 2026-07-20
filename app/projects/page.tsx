import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProjectsPageClient from "./client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,created_at,generations(id,platform,content,status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <ProjectsPageClient projects={projects || []} />;
}