import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimUsername } from "./ClaimUsername";
import { Editor } from "./Editor";
import type { LinkRow, Profile } from "@/lib/types";

export const metadata = { title: "Dashboard · Linkdeck" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, name, headline, bio, theme, shape, fill")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile) return <ClaimUsername userId={auth.user.id} />;

  const { data: links } = await supabase
    .from("links")
    .select("id, kind, title, url, enabled")
    .eq("user_id", auth.user.id)
    .order("position");

  return <Editor userId={auth.user.id} initialProfile={profile as Profile} initialLinks={(links ?? []) as LinkRow[]} />;
}
