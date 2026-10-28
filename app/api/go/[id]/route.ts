import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { BOT_RE } from "@/lib/validate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Counts the click, then sends the visitor on to the link's real address.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const home = new URL("/", req.url);
  if (!UUID.test(id)) return NextResponse.redirect(home);

  const supabase = createPublicClient();
  const isBot = BOT_RE.test(req.headers.get("user-agent") ?? "");
  let target: string | null = null;

  if (isBot) {
    const { data } = await supabase.from("links").select("url").eq("id", id).neq("kind", "header").maybeSingle();
    target = data?.url ?? null;
  } else {
    const { data } = await supabase.rpc("track_click", { p_link_id: id });
    target = typeof data === "string" ? data : null;
  }

  if (!target || !/^https?:\/\//i.test(target)) return NextResponse.redirect(home);
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  return res;
}
