"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExploreMap } from "@/components/maps";
import { createClient } from "@/lib/supabase/client";
import { keptTier, officialName } from "@/lib/format";

export interface DistrictStat {
  district_id: number;
  name: string;
  kind: string;
  region_id: number;
  officials: number;
  promises: number;
  completed: number;
  kept_pct: number | null;
}

type RoleRow = { role: string; label: string | null; officials: { id: string; title: string | null; full_name: string; status: string; is_demo: boolean } };

export function ExploreClient({
  stats,
  regions,
  initialQuery,
  initialDistrict,
}: {
  stats: DistrictStat[];
  regions: { id: number; name: string }[];
  initialQuery: string;
  initialDistrict: number | null;
}) {
  const byName = useMemo(() => Object.fromEntries(stats.map((s) => [s.name, s])), [stats]);
  const pctByName = useMemo(() => Object.fromEntries(stats.map((s) => [s.name, s.kept_pct])), [stats]);
  const regionName = useMemo(() => Object.fromEntries(regions.map((r) => [r.id, r.name])), [regions]);

  const firstMatch = (q: string) => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    return stats.find((s) => s.name.toLowerCase().startsWith(t)) ?? stats.find((s) => s.name.toLowerCase().includes(t)) ?? null;
  };
  const initial =
    (initialDistrict && stats.find((s) => s.district_id === initialDistrict)) ||
    firstMatch(initialQuery) ||
    stats.filter((s) => s.officials > 0).sort((a, b) => b.promises - a.promises)[0] ||
    null;

  const [query, setQuery] = useState(initialQuery);
  const [region, setRegion] = useState<number | "">("");
  const [selected, setSelected] = useState<string | null>(initial?.name ?? null);
  const [people, setPeople] = useState<RoleRow[] | null>(null);
  const sel = selected ? byName[selected] : null;

  useEffect(() => {
    if (!sel) return;
    setPeople(null);
    const supabase = createClient();
    supabase
      .from("official_roles")
      .select("role, label, officials!inner(id, title, full_name, status, is_demo)")
      .eq("district_id", sel.district_id)
      .eq("officials.status", "verified")
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as RoleRow[];
        setPeople(rows.filter((r, i) => rows.findIndex((x) => x.officials.id === r.officials.id) === i));
      });
    const url = new URL(window.location.href);
    url.searchParams.set("d", String(sel.district_id));
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [sel]);

  const PAGE = 15;
  const [limit, setLimit] = useState(PAGE);
  const [onlyActive, setOnlyActive] = useState(false);
  const list = useMemo(() => {
    const t = query.trim().toLowerCase();
    return stats
      .filter((s) => (region === "" || s.region_id === region) && (!t || s.name.toLowerCase().includes(t)) && (!onlyActive || s.officials > 0))
      .sort((a, b) => b.officials - a.officials || b.promises - a.promises || a.name.localeCompare(b.name));
  }, [stats, query, region, onlyActive]);
  useEffect(() => setLimit(PAGE), [query, region, onlyActive]);
  const shown = list.slice(0, limit);

  return (
    <main className="mx-auto max-w-[1280px] px-6 pb-16 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] font-extrabold">Explore Ghana</h1>
          <p className="mt-1.5 text-[15px] text-muted">See what is happening in any of Ghana&apos;s 261 districts. Tap an area on the map or search.</p>
        </div>
        <Link href="/my-area" className="btn btn-ghost rounded-full">Back to my area</Link>
      </div>

      <form
        className="mt-5 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const m = firstMatch(query);
          if (m) setSelected(m.name);
        }}
      >
        <label htmlFor="sq" className="sr-only">Search a district or town</label>
        <input id="sq" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a district, municipal or metropolitan assembly" className="field flex-[1_1_260px]" />
        <label htmlFor="rf" className="sr-only">Region</label>
        <select id="rf" className="field w-auto flex-[0_1_220px]" value={region} onChange={(e) => setRegion(e.target.value ? Number(e.target.value) : "")}>
          <option value="">All 16 regions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button className="btn btn-primary">Find</button>
      </form>

      <div className="mt-5 flex flex-wrap items-start gap-6">
        <section aria-label="Map" className="card min-w-0 flex-[999_1_520px] overflow-hidden">
          <ExploreMap stats={pctByName} selected={selected} onSelect={setSelected} height={620} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-5 py-3.5 text-[13px] text-[#3E4A44]">
            <strong className="font-semibold">Promises kept</strong>
            {[
              ["#E3E8E5", "No data yet"],
              ["#F2B8BF", "Under 25%"],
              ["#FBE29A", "25 to 50%"],
              ["#9DD6B3", "Over 50%"],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-sm" style={{ background: c }} />
                {l}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-sm border-2 border-ink bg-gh-gold" />
              Selected
            </span>
          </div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
          {sel ? (
            <section aria-label="Selected area" className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5B6660]">
                {sel.kind === "metropolitan" ? "Metropolitan assembly" : sel.kind === "municipal" ? "Municipal assembly" : "District assembly"} · {regionName[sel.region_id]}
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold">{sel.name}</h2>
              <div className="mt-3.5 flex flex-wrap gap-3">
                {[
                  [sel.kept_pct != null ? `${sel.kept_pct}%` : "–", "Kept"],
                  [sel.promises, "Promises"],
                  [sel.officials, "Officials"],
                ].map(([v, l]) => (
                  <div key={l as string} className="flex-[1_1_90px] rounded-[10px] bg-ground p-3">
                    <div className="font-display text-2xl font-extrabold">{v}</div>
                    <div className="text-[13px] text-muted">{l}</div>
                  </div>
                ))}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-muted">Officials on the platform</h3>
              <div className="mt-2 flex flex-col gap-2">
                {people === null ? <p className="text-sm text-muted">Loading…</p> : null}
                {people?.map((p) => (
                  <Link key={p.officials.id} href={`/officials/${p.officials.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-ground px-3 py-2.5 text-ink no-underline hover:text-ink">
                    <span>
                      <span className="block font-semibold">{officialName(p.officials)}</span>
                      <span className="text-[13px] text-muted">{p.label}{p.officials.is_demo ? " · demo" : ""}</span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                ))}
                {people && !people.length ? (
                  <p className="text-sm leading-normal text-muted">
                    No officials from {sel.name} have joined yet. Know your MP or DCE? Point them to <Link href="/official/login">the officials&apos; sign up</Link>.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section aria-label="Districts" className="card flex max-h-[460px] flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <span className="text-sm font-semibold">
                {list.length} {list.length === 1 ? "area" : "areas"}
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="h-4 w-4 accent-gh-green" />
                Only areas with officials
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {shown.map((s) => {
              const on = s.name === selected;
              return (
                <button
                  key={s.district_id}
                  type="button"
                  onClick={() => setSelected(s.name)}
                  aria-pressed={on}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left ${on ? "bg-[#EEF7F1]" : "hover:bg-ground"}`}
                >
                  <span className="h-3 w-3 flex-none rounded-sm" style={{ background: keptTier(s.kept_pct) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{s.name}</span>
                    <span className="text-[13px] text-muted">{regionName[s.region_id]} · {s.officials} officials</span>
                  </span>
                  <span className="text-[15px] font-bold">{s.kept_pct != null ? `${s.kept_pct}%` : ""}</span>
                </button>
              );
            })}
            {!list.length ? <p className="p-3 text-sm text-muted">No districts match.</p> : null}
            {list.length > limit ? (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn btn-ghost mt-1 w-full">
                Show {Math.min(PAGE, list.length - limit)} more
              </button>
            ) : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
