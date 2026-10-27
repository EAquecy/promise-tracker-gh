"use client";
import { useEffect, useState } from "react";
import { getFix, locationMessage } from "@/lib/geo";

// Asks for location when the app opens. Reading stays open to everyone; confirming, disputing and commenting need it.
export function LocationPrompt() {
  const [state, setState] = useState<"unknown" | "prompt" | "granted" | "denied" | "hidden">("unknown");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("ptgh-loc-dismissed")) return setState("hidden");
    } catch {
      /* storage unavailable */
    }
    if (!navigator.permissions?.query) return setState("prompt");
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        setState(p.state === "granted" ? "granted" : p.state === "denied" ? "denied" : "prompt");
        p.onchange = () => setState(p.state === "granted" ? "granted" : p.state === "denied" ? "denied" : "prompt");
      })
      .catch(() => setState("prompt"));
  }, []);

  if (state === "unknown" || state === "granted" || state === "hidden") return null;

  async function enable() {
    setMsg(null);
    try {
      await getFix();
      setState("granted");
    } catch (e) {
      setMsg(locationMessage(e));
      setState("denied");
    }
  }
  function dismiss() {
    try {
      sessionStorage.setItem("ptgh-loc-dismissed", "1");
    } catch {
      /* ignore */
    }
    setState("hidden");
  }

  return (
    <div role="region" aria-label="Location" className="border-b border-[#F0DC8A] bg-[#FFF8DA]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5 text-sm text-[#4A3A00]">
        <span className="min-w-0 flex-[1_1_320px]">
          {state === "denied"
            ? msg ?? "Location is blocked for this site. Allow it in your browser settings to confirm, dispute or comment."
            : "Turn on location to see your officials and to confirm, dispute or comment. We keep your district only, never your exact position."}
        </span>
        {state === "prompt" ? (
          <button type="button" onClick={enable} className="btn btn-primary min-h-9 px-3.5 text-sm">Turn on location</button>
        ) : null}
        <button type="button" onClick={dismiss} className="text-sm font-semibold underline underline-offset-2">Not now</button>
      </div>
    </div>
  );
}
