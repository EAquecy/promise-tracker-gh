import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OfficialCard } from "@/components/OfficialCard";
import { Empty } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { OFFICIAL_SELECT } from "@/lib/data";
import type { Official, Region, Scorecard } from "@/lib/types";

export const metadata = { title: "Officials" };

export default async function OfficialsPage({ searchParams }: { searchParams: Promise<{ q?: string; region?: string; role?: string }> }) {
  const { q = "", region = "", role = "" } = await searchParams;
  const supabase = await createClient();
  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  let query = supabase
    .from("officials")
    .select(role || region ? OFFICIAL_SELECT.replace("official_roles(", "official_roles!inner(") : OFFICIAL_SELECT)
    .eq("status", "verified")
    .order("is_demo")
    .order("full_name")
    .limit(60);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_,()]/g, " ")}%`);
  if (role) query = query.in("official_roles.role", role === "minister" ? ["minister", "deputy_minister", "regional_minister"] : [role]);
  if (region) query = query.eq("official_roles.region_id", Number(region));
  const { data } = await query;
  const officials = (data ?? []) as unknown as Official[];
  const { data: sc } = officials.length ? await supabase.from("official_scorecard").select("*").in("official_id", officials.map((o) => o.id)) : { data: [] };
  const scores: Record<string, Scorecard> = {};
  (sc ?? []).forEach((s: Scorecard) => (scores[s.official_id] = s));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-8">
        <h1 className="font-display text-[34px] font-extrabold">Officials</h1>
        <form className="mt-5 flex flex-wrap gap-3" action="/officials">
          <label htmlFor="oq" className="sr-only">Search by name</label>
          <input id="oq" name="q" defaultValue={q} placeholder="Search by name" className="field flex-[1_1_240px]" />
          <label htmlFor="orole" className="sr-only">Role</label>
          <select id="orole" name="role" defaultValue={role} className="field w-auto flex-[0_1_220px]">
            <option value="">All roles</option>
            <option value="mp">MPs</option>
            <option value="minister">Ministers</option>
            <option value="mmdce">MMDCEs</option>
            <option value="assembly_member">Assembly Members</option>
          </select>
          <label htmlFor="oreg" className="sr-only">Region</label>
          <select id="oreg" name="region" defaultValue={region} className="field w-auto flex-[0_1_220px]">
            <option value="">All 16 regions</option>
            {(regions as Region[] | null)?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button className="btn btn-primary">Search</button>
        </form>
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {officials.map((o) => (
            <OfficialCard key={o.id} o={o} score={scores[o.id]} />
          ))}
        </div>
        {!officials.length ? (
          <div className="mt-6">
            <Empty>
              No verified officials match yet. Are you an official? <Link href="/official/login">Create your profile</Link>.
            </Empty>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
