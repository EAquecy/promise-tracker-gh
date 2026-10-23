"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, cta = "Email me a sign in link", askName = false }: { next: string; cta?: string; askName?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: name.trim() ? { display_name: name.trim() } : undefined,
      },
    });
    if (error) {
      setState("error");
      setMsg(error.message.includes("rate") ? "Too many emails sent. Please wait a few minutes and try again." : error.message);
    } else setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-[#B9DCC8] bg-done-bg p-5 text-done" role="status">
        <div className="font-semibold">Check your email</div>
        <p className="mt-1.5 text-[15px] leading-normal text-ink">
          We sent a sign in link to <strong>{email}</strong>. Open it on this device to continue. It may take a minute and can land in spam.
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {askName ? (
        <div>
          <label htmlFor="nm" className="label">Your name (shown on comments)</label>
          <input id="nm" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Akosua O." autoComplete="name" />
        </div>
      ) : null}
      <div>
        <label htmlFor="em" className="label">Email address</label>
        <input id="em" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </div>
      <button className="btn btn-primary h-[50px] text-base" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : cta}
      </button>
      {state === "error" ? <p className="text-sm text-gh-red" role="alert">{msg}</p> : null}
      <p className="text-[13px] text-muted">Phone number sign in with SMS codes is coming next.</p>
    </form>
  );
}
