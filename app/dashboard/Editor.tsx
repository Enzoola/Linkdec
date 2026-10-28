"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BioView } from "@/components/BioView";
import { Stats } from "./Stats";
import { FILLS, SHAPES, THEMES, isHttpUrl, normUrl } from "@/lib/validate";
import type { Kind, LinkRow, Profile } from "@/lib/types";

type Tab = "links" | "look" | "stats";

function Seg({ label, opts, value, onPick }: { label: string; opts: [string, string][]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {opts.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onPick(v)}>{text}</button>
      ))}
    </div>
  );
}

function linkProblem(l: LinkRow): string {
  if (!l.enabled) return "";
  if (l.kind === "header") return l.title.trim() ? "" : "Add a heading.";
  if (!l.title.trim()) return "Add a title.";
  if (!isHttpUrl(l.url)) return "Enter a full web address, like https://example.com.";
  return "";
}

export function Editor({ userId, initialProfile, initialLinks }: { userId: string; initialProfile: Profile; initialLinks: LinkRow[] }) {
  void userId;
  const [profile, setProfile] = useState(initialProfile);
  const [links, setLinks] = useState(initialLinks);
  const [tab, setTab] = useState<Tab>("links");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [origin, setOrigin] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (focusId) { document.getElementById(`title-${focusId}`)?.focus(); setFocusId(null); }
  }, [focusId, links]);

  const say = (m: string) => {
    setToast(m);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(""), 3200);
  };
  const problems = useMemo(() => links.filter((l) => linkProblem(l)).length, [links]);
  const publicUrl = `${origin || ""}/${profile.username}`;

  const editProfile = (patch: Partial<Profile>) => { setProfile((p) => ({ ...p, ...patch })); setDirty(true); };
  const editLink = (id: string, patch: Partial<LinkRow>) => { setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); setDirty(true); };
  const move = (i: number, d: number) => {
    setLinks((ls) => { const c = [...ls]; [c[i], c[i + d]] = [c[i + d], c[i]]; return c; });
    setDirty(true);
  };
  const add = (kind: Kind) => {
    const id = crypto.randomUUID();
    setLinks((ls) => [...ls, { id, kind, title: "", url: "", enabled: true }]);
    setDirty(true);
    setFocusId(id);
  };
  const remove = (id: string) => { setLinks((ls) => ls.filter((l) => l.id !== id)); setDirty(true); };

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("save_page", {
      p_profile: { name: profile.name.trim(), headline: profile.headline.trim(), bio: profile.bio.trim(), theme: profile.theme, shape: profile.shape, fill: profile.fill },
      p_links: links.map((l) => ({ id: l.id, kind: l.kind, title: l.title.trim(), url: l.kind === "header" ? "" : l.url, enabled: l.enabled })),
    });
    setSaving(false);
    if (error) {
      say(error.message.includes("at most 60") ? "You can have at most 60 links." : "Could not save. Check your connection and try again.");
      return;
    }
    setDirty(false);
    say("Saved. Your page is live.");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(publicUrl); say("Address copied"); } catch { say("Copy this address by hand: " + publicUrl); }
  }

  return (
    <>
      <header className="bar">
        <div className="wrap bar-in">
          <span className="brand">Linkdeck</span>
          {problems > 0 && <span className="hint" role="status">Fix {problems} link{problems === 1 ? "" : "s"} before saving</span>}
          <span className="status" data-s={dirty ? "dirty" : "ok"}>{dirty ? "Unsaved changes" : "All changes saved"}</span>
          <a className="b" href={`/${profile.username}`} target="_blank" rel="noopener noreferrer">View page</a>
          <button type="button" className="b primary" disabled={!dirty || problems > 0 || saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          <form action="/auth/signout" method="post"><button className="b" type="submit">Sign out</button></form>
        </div>
      </header>
      <main className="wrap studio">
        <section className="panel">
          <div className="tabs" role="tablist">
            {([["links", "Links"], ["look", "Appearance"], ["stats", "Analytics"]] as [Tab, string][]).map(([t, label]) => (
              <button key={t} type="button" role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{label}</button>
            ))}
          </div>

          {tab === "links" && (
            <div className="pane">
              <div className="urlbox">
                <code>{publicUrl}</code>
                <button type="button" className="b small" onClick={copy}>Copy</button>
              </div>
              <div className="add">
                <button type="button" className="b" onClick={() => add("link")}>+ Link</button>
                <button type="button" className="b" onClick={() => add("header")}>+ Section heading</button>
                <button type="button" className="b" onClick={() => add("social")}>+ Social chip</button>
              </div>
              {links.length === 0 && <p className="note">No links yet. Add your first link above.</p>}
              <ol className="rows">
                {links.map((l, i) => {
                  const err = linkProblem(l);
                  return (
                    <li key={l.id} className="row" data-off={!l.enabled}>
                      <div className="row-top">
                        <span className="kind">{l.kind === "header" ? "Section heading" : l.kind === "social" ? "Social chip" : "Link"}</span>
                        <span className="sp" />
                        <button type="button" className="b small" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                        <button type="button" className="b small" aria-label="Move down" disabled={i === links.length - 1} onClick={() => move(i, 1)}>↓</button>
                        <label className="vis"><input type="checkbox" checked={l.enabled} onChange={(e) => editLink(l.id, { enabled: e.target.checked })} />Visible</label>
                        <button type="button" className="b small" onClick={() => remove(l.id)}>Remove</button>
                      </div>
                      <label className="field">
                        <span>{l.kind === "header" ? "Heading" : "Title"}</span>
                        <input id={`title-${l.id}`} type="text" maxLength={60} value={l.title}
                          placeholder={l.kind === "header" ? "Section name" : l.kind === "social" ? "LinkedIn" : "What visitors will read"}
                          onChange={(e) => editLink(l.id, { title: e.target.value })} />
                      </label>
                      {l.kind !== "header" && (
                        <label className="field">
                          <span>Web address</span>
                          <input id={`url-${l.id}`} type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://" value={l.url}
                            onChange={(e) => editLink(l.id, { url: e.target.value })}
                            onBlur={(e) => { const n = normUrl(e.target.value); if (n !== l.url) editLink(l.id, { url: n }); }} />
                        </label>
                      )}
                      <p className="err" role="status">{err}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {tab === "look" && (
            <div className="pane">
              <label className="field"><span>Name</span><input id="f-name" type="text" maxLength={40} value={profile.name} onChange={(e) => editProfile({ name: e.target.value })} /></label>
              <label className="field"><span>Headline</span><input id="f-head" type="text" maxLength={70} value={profile.headline} onChange={(e) => editProfile({ headline: e.target.value })} /></label>
              <label className="field"><span>Short bio</span><textarea id="f-bio" maxLength={200} value={profile.bio} onChange={(e) => editProfile({ bio: e.target.value })} /></label>
              <div className="field">
                <span className="lab">Theme</span>
                <div className="swatches" role="group" aria-label="Page theme">
                  {THEMES.map(([v, label]) => (
                    <button key={v} type="button" className="sw" data-bio={v} aria-pressed={profile.theme === v} onClick={() => editProfile({ theme: v as Profile["theme"] })}>
                      Aa<small>{label}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field"><span className="lab">Button shape</span><Seg label="Button shape" opts={SHAPES} value={profile.shape} onPick={(v) => editProfile({ shape: v as Profile["shape"] })} /></div>
              <div className="field"><span className="lab">Button style</span><Seg label="Button style" opts={FILLS} value={profile.fill} onPick={(v) => editProfile({ fill: v as Profile["fill"] })} /></div>
            </div>
          )}

          {tab === "stats" && <Stats links={links} publicUrl={publicUrl} />}
        </section>

        <aside className="stage">
          <div className="phone" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) { e.preventDefault(); say("Links open in a new tab on your live page."); } }}>
            <BioView profile={profile} links={links} preview />
          </div>
          <p className="stage-cap">Live preview</p>
        </aside>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
