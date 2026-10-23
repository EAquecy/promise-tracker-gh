import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OfficialCard } from "@/components/OfficialCard";
import { createClient } from "@/lib/supabase/server";
import { OFFICIAL_SELECT } from "@/lib/data";
import { officialName, timeAgo } from "@/lib/format";
import type { Official, Scorecard } from "@/lib/types";

export const revalidate = 60;

const ROLE_TABS = [
  { id: "mp", label: "MPs" },
  { id: "minister", label: "Ministers" },
  { id: "mmdce", label: "MMDCEs" },
  { id: "assembly_member", label: "Assembly Members" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role = "mp" } = await searchParams;
  const supabase = await createClient();

  const roleFilter = role === "minister" ? ["minister", "deputy_minister", "regional_minister"] : [role];
  const [promiseCount, doneCount, postCount, officialCount, officialsRes, recentRes] = await Promise.all([
    supabase.from("promises").select("id", { count: "exact", head: true }).eq("approved", true),
    supabase.from("promises").select("id", { count: "exact", head: true }).eq("approved", true).eq("status", "completed"),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("officials").select("id", { count: "exact", head: true }).eq("status", "verified"),
    supabase
      .from("officials")
      .select(OFFICIAL_SELECT.replace("official_roles(", "official_roles!inner("))
      .eq("status", "verified")
      .in("official_roles.role", roleFilter)
      .limit(8),
    supabase
      .from("posts")
      .select("id, title, created_at, official_id, kind, officials(id, title, full_name), promises(id, title, status)")
      .eq("kind", "update")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const officials = (officialsRes.data ?? []) as unknown as Official[];
  const scoreRes = officials.length
    ? await supabase.from("official_scorecard").select("*").in("official_id", officials.map((o) => o.id))
    : { data: [] };
  const scores: Record<string, Scorecard> = {};
  (scoreRes.data ?? []).forEach((s: Scorecard) => (scores[s.official_id] = s));

  type Recent = { id: string; title: string; created_at: string; officials: { id: string; title: string | null; full_name: string } | null; promises: { id: string; title: string; status: string } | null };
  const recent = (recentRes.data ?? []) as unknown as Recent[];
  const statIds = recent.map((r) => r.id);
  const { data: rstats } = statIds.length ? await supabase.from("post_stats").select("*").in("post_id", statIds) : { data: [] };
  const confirms: Record<string, number> = {};
  (rstats ?? []).forEach((s: { post_id: string; confirms: number }) => (confirms[s.post_id] = s.confirms));

  return (
    <>
      <Header variant="dark" />
      <section aria-label="Find your representative" className="bg-gh-green-dark text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-10 px-6 pb-16 pt-14">
          <div className="min-w-0 flex-[999_1_520px]">
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gh-gold">Ghana&apos;s public promise record</div>
            <h1 className="mt-3 font-display text-[44px] font-extrabold leading-[1.05] md:text-[56px]">
              They promised.
              <br />
              <span className="text-gh-gold">Did they deliver?</span>
            </h1>
            <p className="mt-4 max-w-[560px] text-lg leading-relaxed text-[#C9D6CF]">
              Track what your MP, DCE, Minister and Assembly Member promised, see the evidence, and confirm it yourself as a resident.
            </p>
            <form role="search" action="/explore" className="mt-6 flex max-w-[620px] flex-wrap gap-2.5">
              <label htmlFor="hq" className="sr-only">Enter your district or town</label>
              <input id="hq" name="q" type="search" placeholder="Enter your district or town" className="h-[52px] min-w-0 flex-[1_1_260px] rounded-full border-0 px-5 text-base text-ink" />
              <button className="btn btn-gold h-[52px] rounded-full px-6 text-base font-bold">Find my officials</button>
            </form>
            <Link href="/my-area" className="mt-3.5 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#D5E4DB] no-underline hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              Use my location instead
            </Link>
          </div>
          <div className="min-w-0 flex-[1_1_300px]">
            <Link href="/explore" className="mx-auto block max-w-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ghana-regions.svg" alt="Map of Ghana's 16 regions. Opens the explore map" className="block h-auto w-full" />
            </Link>
            <div className="mt-2 text-center text-[13px] text-[#D5E4DB]">16 regions · 276 constituencies · 261 districts</div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1200px] px-6">
        <section aria-label="National numbers" className="card relative -mt-8 flex flex-wrap gap-4 p-5">
          {[
            [promiseCount.count ?? 0, "Promises tracked", ""],
            [doneCount.count ?? 0, "Completed", "text-done"],
            [postCount.count ?? 0, "Evidence posts", ""],
            [officialCount.count ?? 0, "Verified officials", ""],
          ].map(([n, l, c]) => (
            <div key={l as string} className="flex-[1_1_180px]">
              <div className={`font-display text-[32px] font-extrabold ${c}`}>{(n as number).toLocaleString()}</div>
              <div className="text-sm text-muted">{l}</div>
            </div>
          ))}
        </section>

        <section aria-label="Browse officials" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[26px] font-bold">Browse officials</h2>
            <nav aria-label="Filter by role" className="flex flex-wrap gap-1.5">
              {ROLE_TABS.map((t) => (
                <Link
                  key={t.id}
                  href={`/?role=${t.id}#officials`}
                  scroll={false}
                  aria-current={role === t.id ? "page" : undefined}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold no-underline ${role === t.id ? "bg-ink text-white hover:text-white" : "border border-[#C9D2CD] bg-white text-[#3E4A44]"}`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
          <div id="officials" className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {officials.map((o) => (
              <OfficialCard key={o.id} o={o} score={scores[o.id]} />
            ))}
            {!officials.length ? <p className="text-muted">No verified officials in this group yet.</p> : null}
          </div>
          <div className="mt-4">
            <Link href="/officials" className="font-semibold">See all officials</Link>
          </div>
        </section>

        <section aria-label="Recent updates" className="mt-11">
          <h2 className="font-display text-[26px] font-bold">Latest evidence</h2>
          <div className="mt-5 flex flex-wrap gap-4">
            {recent.map((r) => (
              <article key={r.id} className="card min-w-0 flex-[1_1_300px] p-4">
                <div className="text-[13px] text-muted">{timeAgo(r.created_at)}</div>
                <h3 className="mt-1.5 text-[17px] font-semibold leading-snug">{r.title}</h3>
                <div className="mt-1.5 text-sm text-muted">
                  {r.officials ? <Link href={`/officials/${r.officials.id}`}>{officialName(r.officials)}</Link> : null}
                  {r.promises ? <> · {r.promises.title}</> : null}
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-1.5 text-sm">
                  <span className="font-medium text-done">{confirms[r.id] ?? 0} residents confirm</span>
                  {r.promises ? <Link href={`/promises/${r.promises.id}`} className="font-semibold">See evidence</Link> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="How it works" className="card mt-11 p-7">
          <h2 className="font-display text-[26px] font-bold">How it works</h2>
          <ol className="mt-5 flex flex-wrap gap-5">
            {[
              ["Promise logged", "From manifestos, rallies and interviews, always with the source attached."],
              ["Evidence posted", "Officials post GPS stamped photos from start to inauguration."],
              ["Residents verify", "People confirm or dispute what was shown, and comment."],
              ["You vote informed", "Every official has a scorecard ready for election day."],
            ].map(([t, d], i) => (
              <li key={t} className="flex-[1_1_220px]">
                <div className="font-display text-[28px] font-extrabold text-[#B58A00]">0{i + 1}</div>
                <div className="mt-1 font-semibold">{t}</div>
                <p className="mt-1.5 text-sm leading-normal text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
