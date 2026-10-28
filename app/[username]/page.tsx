import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { BioView } from "@/components/BioView";
import { createPublicClient } from "@/lib/supabase/public";
import { BOT_RE, USERNAME_RE, hostOf } from "@/lib/validate";
import type { LinkRow, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(username: string) {
  if (!USERNAME_RE.test(username)) return null;
  const supabase = createPublicClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, name, headline, bio, theme, shape, fill")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;
  const { data: links } = await supabase
    .from("links")
    .select("id, kind, title, url, enabled")
    .eq("user_id", profile.id)
    .eq("enabled", true)
    .order("position");
  return { supabase, profile: profile as Profile, links: (links ?? []) as LinkRow[] };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const data = await load(username.toLowerCase());
  if (!data) return { title: "Not found · Linkdeck" };
  const { profile } = data;
  return {
    title: `${profile.name || profile.username} (@${profile.username})`,
    description: profile.headline || profile.bio || `Links from ${profile.name || profile.username}`,
  };
}

export default async function BioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const username = raw.toLowerCase();
  const data = await load(username);
  if (!data) notFound();

  const h = await headers();
  if (!BOT_RE.test(h.get("user-agent") ?? "")) {
    const ref = h.get("referer");
    const refHost = ref ? hostOf(ref) : "";
    await data.supabase.rpc("track_view", { p_username: username, p_referrer: refHost || null });
  }

  return (
    <div className="pub" data-bio={data.profile.theme}>
      <BioView profile={data.profile} links={data.links} />
    </div>
  );
}
