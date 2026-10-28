"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameError } from "@/lib/validate";

export function ClaimUsername({ userId }: { userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const live = name ? usernameError(name) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = usernameError(name);
    if (problem) return setErr(problem);
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").insert({ id: userId, username: name, name });
    if (error) {
      setBusy(false);
      setErr(error.code === "23505" ? "That name is taken. Try another." : "Could not save. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="card">
      <h1>Choose your address</h1>
      <p>This becomes your public link. You cannot change it later, so pick something you are happy to share.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label className="field">
          <span>Your address</span>
          <div className="user-field">
            <span>{typeof window === "undefined" ? "" : window.location.host}/</span>
            <input id="username" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={30}
              value={name} onChange={(e) => setName(e.target.value.toLowerCase())} />
          </div>
        </label>
        <p className="err" role="alert">{err || live || ""}</p>
        <button className="b primary big" type="submit" disabled={busy || !name || !!live}>
          {busy ? "Saving…" : "Claim this address"}
        </button>
      </form>
    </main>
  );
}
