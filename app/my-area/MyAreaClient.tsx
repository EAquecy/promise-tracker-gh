"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { GeoJsonObject } from "geojson";
import { AreaMap } from "@/components/maps";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL, officialName } from "@/lib/format";
import type { Role } from "@/lib/types";

type D = { id: number; name: string; region_id: number; regions: { name: string } };
type Person = {
  role: Role;
  label: string | null;
  officials: { id: string; title: string | null; full_name: string; photo_path: string | null; is_demo: boolean; status: string };
};
const KEY = "ptgh-home-district";
const ORDER: Role[] = ["mp", "mmdce", "assembly_member", "regional_minister", "minister", "deputy_minister"];

export function MyAreaClient({ districts, userId, savedDistrict }: { districts: D[]; userId: string | null; savedDistrict: number | null }) {
  const supabase = createClient();
  const [districtId, setDistrictId] = useState<number | null>(savedDistrict);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "outside">("idle");
  const [geo, setGeo] = useState<GeoJsonObject | null>(null);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [manual, setManual] = useState(false);
  const [saved, setSaved] = useState(false);
  const d = districts.find((x) => x.id === districtId) ?? null;

  useEffect(() => {
    if (districtId) return;
    try {
      const v = localStorage.getItem(KEY);
      if (v) setDistrictId(Number(v));
    } catch {
      /* storage unavailable */
    }
  }, [districtId]);

  const load = useCallback(
    async (id: number, regionId: number) => {
      setPeople(null);
      setGeo(null);
      const [g, a, b] = await Promise.all([
        supabase.rpc("district_geojson", { did: id }),
        supabase.from("official_roles").select("role, label, officials!inner(id, title, full_name, photo_path, is_demo, status)").eq("district_id", id).eq("officials.status", "verified"),
        supabase.from("official_roles").select("role, label, officials!inner(id, title, full_name, photo_path, is_demo, status)").eq("region_id", regionId).eq("role", "regional_minister").eq("officials.status", "verified"),
      ]);
      setGeo((g.data as GeoJsonObject) ?? null);
      const rows = ([...(a.data ?? []), ...(b.data ?? [])] as unknown as Person[])
        .filter((r, i, arr) => arr.findIndex((x) => x.officials.id === r.officials.id) === i)
        .sort((x, y) => ORDER.indexOf(x.role) - ORDER.indexOf(y.role));
      setPeople(rows);
    },
    [supabase]
  );

  useEffect(() => {
    if (d) load(d.id, d.region_id);
  }, [d, load]);

  function choose(id: number) {
    setDistrictId(id);
    setSaved(false);
    try {
      localStorage.setItem(KEY, String(id));
    } catch {
      /* ignore */
    }
  }

  function locate() {
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setHere({ lat, lng });
        const { data } = await supabase.rpc("locate_area", { lat, lng });
        const row = (data as { district_id: number | null }[] | null)?.[0];
        if (row?.district_id) {
          choose(row.district_id);
          setStatus("idle");
        } else setStatus("outside");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  }

  async function saveHome() {
    if (!userId || !districtId) return;
    const { error } = await supabase.from("profiles").update({ home_district_id: districtId }).eq("id", userId);
    if (!error) setSaved(true);
  }

  const picker = (
    <div className="mt-4 text-left">
      <label htmlFor="pick" className="label">Choose your district, municipal or metropolitan assembly</label>
      <select id="pick" className="field" value={districtId ?? ""} onChange={(e) => e.target.value && choose(Number(e.target.value))}>
        <option value="">Select…</option>
        {districts.map((x) => (
          <option key={x.id} value={x.id}>{x.name} ({x.regions.name})</option>
        ))}
      </select>
    </div>
  );

  if (!d) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <section aria-label="Turn on location" className="card mx-auto my-6 max-w-[560px] p-8 text-center">
          <div aria-hidden="true" className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#EEF7F1]">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#006B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
          </div>
          <h1 className="mt-4 font-display text-[28px] font-extrabold">See who represents you</h1>
          <p className="mt-2.5 text-base leading-relaxed text-muted">
            Turn on location and we will find your district, then show your MP, MMDCE, Assembly Member and Regional Minister.
          </p>
          <button type="button" onClick={locate} disabled={status === "locating"} className="btn btn-primary mt-5 h-[52px] w-full text-base">
            {status === "locating" ? "Finding your area…" : "Turn on location"}
          </button>
          <button type="button" onClick={() => setManual(true)} className="btn btn-ghost mt-2.5 w-full">Choose my area instead</button>
          {status === "denied" ? <p className="mt-3 text-sm text-gh-red">Location is off or blocked. You can choose your area below.</p> : null}
          {status === "outside" ? <p className="mt-3 text-sm text-gh-red">That location is outside Ghana&apos;s districts. Choose your area below.</p> : null}
          {manual || status === "denied" || status === "outside" ? picker : null}
          <p className="mt-4 text-[13px] leading-normal text-muted">We only use your location to match your area. Your exact position is never stored or shown to anyone.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {here ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-done-bg px-2.5 py-1 text-[13px] font-semibold text-done">Location on</div>
          ) : null}
          <h1 className="mt-2.5 font-display text-[34px] font-extrabold">You are in {d.name}</h1>
          <div className="mt-1 text-[15px] text-muted">{d.regions.name} Region</div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {userId ? (
            <button type="button" onClick={saveHome} className="btn btn-ghost rounded-full" disabled={saved}>
              {saved ? "Saved as home area" : "Save as my home area"}
            </button>
          ) : null}
          <button type="button" onClick={() => { setDistrictId(null); setManual(true); try { localStorage.removeItem(KEY); } catch {} }} className="btn btn-ghost rounded-full">
            Change area
          </button>
          <Link href={`/explore?d=${d.id}`} className="btn btn-dark rounded-full">Explore other areas</Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-7">
        <section aria-label="Map of your area" className="card min-w-0 flex-[999_1_520px] overflow-hidden">
          <AreaMap geo={geo} markers={here ? [{ ...here, color: "#2B6CC4", label: "You are here" }] : []} height={440} />
          <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-4 text-[13px] text-[#3E4A44]">
            {here ? (
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#2B6CC4]" />You are here (not saved)</span>
            ) : null}
            <span className="flex items-center gap-2"><span className="h-2.5 w-[18px] border-2 border-gh-green bg-[#DCEBE2]" />{d.name}</span>
            <span className="text-muted">Constituency and electoral area boundaries will appear as the Electoral Commission data is added.</span>
          </div>
        </section>

        <aside aria-label="Your officials" className="flex min-w-0 flex-[1_1_340px] flex-col gap-3">
          <h2 className="font-display text-[22px] font-bold">Your officials</h2>
          {people === null ? <p className="text-muted">Loading…</p> : null}
          {people?.map((p) => (
            <Link key={p.officials.id} href={`/officials/${p.officials.id}`} className="card flex items-center gap-3.5 p-3.5 text-ink no-underline hover:text-ink">
              <Avatar name={p.officials.full_name} photo={p.officials.photo_path} size={52} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.05em] text-[#5B6660]">{p.label ?? ROLE_LABEL[p.role]}</span>
                <span className="mt-0.5 block text-base font-semibold">{officialName(p.officials)}</span>
                {p.officials.is_demo ? <span className="text-[13px] text-[#5A4300]">Demo profile</span> : null}
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {people && !people.length ? (
            <div className="card p-5 text-[15px] leading-relaxed text-muted">
              None of {d.name}&apos;s officials have joined yet. Share the <Link href="/official/login">officials&apos; sign up page</Link> with your MP, MMDCE or Assembly Member.
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
