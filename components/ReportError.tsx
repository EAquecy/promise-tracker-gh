"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ReportError({ promiseId, officialId, userId }: { promiseId?: string; officialId?: string; userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setState("sending");
    const { error } = await createClient()
      .from("corrections")
      .insert({ promise_id: promiseId ?? null, official_id: officialId ?? null, reporter_id: userId, body: body.trim(), link: link.trim() || null });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") return <p className="text-sm font-medium text-done" role="status">Thanks. Our team will check this and correct the record if needed.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-muted underline underline-offset-2 hover:text-ink">
        Report an error
      </button>
    );
  if (!userId)
    return (
      <p className="text-sm text-muted">
        <Link href="/login">Sign in</Link> to report an error, so we can follow up with you.
      </p>
    );
  return (
    <form onSubmit={send} className="flex flex-col gap-2.5">
      <label htmlFor="rep" className="label">What is wrong?</label>
      <textarea id="rep" className="field" rows={3} required minLength={5} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. This promise was made by a different candidate, or the project was completed in March." />
      <label htmlFor="replink" className="label">Link to evidence (optional)</label>
      <input id="replink" type="url" className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send report"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {state === "error" ? <p className="text-sm text-gh-red">Could not send. Please try again.</p> : null}
    </form>
  );
}
