"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
  emailRedirectTo: "https://linkdec-sooty.vercel.app/auth/callback",
},
    });
    if (error) {
      setState("error");
      setMsg(
        error.status === 429
          ? "Too many emails sent. Wait a few minutes and try again."
          : "We could not send the link. Check the address and try again.",
      );
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <p className="note" role="status">
        Check <strong>{email}</strong> for your sign-in link. Open it in this same browser.
      </p>
    );
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <label className="field">
        <span>Email</span>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="b primary big" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a link"}
      </button>
      <p className="err" role="alert">{state === "error" ? msg : ""}</p>
    </form>
  );
}
