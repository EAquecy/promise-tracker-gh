"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({ officialId, userId, initial }: { officialId: string; userId: string | null; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (!userId) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const res = on
      ? await supabase.from("follows").delete().eq("official_id", officialId).eq("user_id", userId)
      : await supabase.from("follows").insert({ official_id: officialId, user_id: userId });
    setBusy(false);
    if (!res.error) setOn(!on);
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on} className={on ? "btn btn-ghost rounded-full" : "btn btn-primary rounded-full"}>
      {on ? "Following" : "Follow"}
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* fall back to copying */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={share} className="btn btn-ghost rounded-full">
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
