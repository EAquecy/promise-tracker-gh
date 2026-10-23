import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Avatar, DemoBadge, Empty, ProgressBar, StatusChip } from "@/components/ui";
import { PostCard } from "@/components/PostCard";
import { FollowButton, ShareButton } from "@/components/FollowButton";
import { AreaMap } from "@/components/maps";
import { roleLine } from "@/components/OfficialCard";
import { getUser } from "@/lib/supabase/server";
import { OFFICIAL_SELECT, POST_SELECT, getViewer, loadPostExtras } from "@/lib/data";
import { PETITION_STATUS, STATUS, fmtDate, officialName, timeAgo } from "@/lib/format";
import type { Official, Post, PromiseRow, PromiseStatus, Scorecard } from "@/lib/types";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data } = await supabase.from("officials").select("title, full_name").eq("id", id).maybeSingle();
  return { title: data ? officialName(data) : "Official" };
}

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "in_progress", label: "In progress" },
  { id: "stalled", label: "Stalled" },
  { id: "not_started", label: "Not started" },
];

export default async function OfficialPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { status = "all" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getUser();

  const { data: o } = await supabase.from("officials").select(OFFICIAL_SELECT).eq("id", id).maybeSingle();
  if (!o) notFound();
  const official = o as Official;
  const roles = official.official_roles ?? [];
  const area = roles.find((r) => r.constituency_id) ?? roles.find((r) => r.district_id) ?? roles[0];

  const [promisesRes, postsRes, scoreRes, followRes, viewer, geoRes, siblingsRes] = await Promise.all([
    supabase.from("promises").select("*").eq("official_id", id).order("created_at"),
    supabase.from("posts").select(POST_SELECT).eq("official_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("official_scorecard").select("*").eq("official_id", id).maybeSingle(),
    user ? supabase.from("follows").select("official_id").eq("official_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    getViewer(supabase, user),
    area?.constituency_id
      ? supabase.rpc("constituency_geojson", { cid: area.constituency_id })
      : area?.district_id
        ? supabase.rpc("district_geojson", { did: area.district_id })
        : Promise.resolve({ data: null }),
    area?.district_id
      ? supabase.from("official_roles").select("official_id, label, role, officials!inner(id, title, full_name, photo_path, status)").eq("district_id", area.district_id).neq("official_id", id)
      : Promise.resolve({ data: [] }),
  ]);

  const promises = (promisesRes.data ?? []) as PromiseRow[];
  const posts = (postsRes.data ?? []) as Post[];
  const updates = posts.filter((p) => p.kind === "update");
  const petitions = posts.filter((p) => p.kind === "petition");
  const score = scoreRes.data as Scorecard | null;
  const { stats, comments, mine } = await loadPostExtras(supabase, updates.slice(0, 5), user?.id ?? null);

  const promiseUpdateCounts: Record<string, number> = {};
  updates.forEach((p) => p.promise_id && (promiseUpdateCounts[p.promise_id] = (promiseUpdateCounts[p.promise_id] ?? 0) + 1));
  const shown = promises.filter((p) => status === "all" || p.status === status);
  const name = officialName(official);
  const markers = promises
    .filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat!, lng: p.lng!, color: STATUS[p.status].bar, label: p.title }))
    .concat(updates.filter((p) => p.lat && p.lng && !p.promise_id).map((p) => ({ lat: p.lat!, lng: p.lng!, color: "#2B6CC4", label: p.title })))
    .concat(
      updates
        .filter((p) => p.lat && p.lng && p.promise_id)
        .reduce((acc, p) => (acc.find((x) => x.label === p.promises?.title) ? acc : [...acc, { lat: p.lat!, lng: p.lng!, color: STATUS[(promises.find((x) => x.id === p.promise_id)?.status ?? "in_progress") as PromiseStatus].bar, label: p.promises?.title ?? p.title }]), [] as { lat: number; lng: number; color: string; label: string }[])
    );
  type Sib = { official_id: string; label: string | null; officials: { id: string; title: string | null; full_name: string; photo_path: string | null; status: string } };
  const siblings = ((siblingsRes.data ?? []) as unknown as Sib[]).filter((s, i, a) => a.findIndex((x) => x.official_id === s.official_id) === i && s.officials.status === "verified");
  const total = score?.total ?? 0;

  return (
    <>
      <Header />
      <div role="img" aria-label="Line drawing of Parliament House with the coat of arms" className="h-[220px] bg-gh-green bg-cover bg-bottom md:h-[340px]" style={{ backgroundImage: "url(/cover-parliament.svg)" }} />
      <main className="mx-auto max-w-[1200px] px-6 pb-16">
        <section aria-label="Profile" className="relative -mt-[84px] flex flex-wrap items-end gap-x-7 gap-y-5">
          <Avatar name={official.full_name} photo={official.photo_path} size={168} ring />
          <div className="min-w-0 flex-[999_1_420px] pb-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[34px] font-extrabold leading-tight md:text-[38px]">{name}</h1>
              {official.status === "verified" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-doing-bg px-2.5 py-1.5 text-[13px] font-semibold text-doing">Verified official</span>
              ) : (
                <span className="rounded-full bg-stall-bg px-2.5 py-1.5 text-[13px] font-semibold text-stall">Awaiting verification</span>
              )}
              {official.is_demo ? <DemoBadge /> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.map((r) => (
                <span key={r.id} className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${r.role === "mp" || r.role === "mmdce" || r.role === "assembly_member" ? "bg-gh-green text-white" : "bg-gh-gold text-ink"}`}>
                  {r.label ?? roleLine({ ...official, official_roles: [r] })}
                </span>
              ))}
              {official.party ? <span className="rounded-md bg-[#E3E8E5] px-3 py-1.5 text-[13px] font-semibold text-[#3E4A44]">{official.party}</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[15px] text-muted">
              {area?.constituencies?.name ? <span>{area.constituencies.name} Constituency</span> : null}
              {area?.electoral_areas?.name ? <span>{area.electoral_areas.name} electoral area</span> : null}
              {area?.districts?.name ? <span>{area.districts.name}</span> : null}
              {area?.regions?.name ? <span>{area.regions.name} Region</span> : null}
              {area?.term_start ? <span>Term: {fmtDate(area.term_start, { month: "short", year: "numeric" })} to {area.term_end ? fmtDate(area.term_end, { month: "short", year: "numeric" }) : "present"}</span> : null}
            </div>
          </div>
          <div className="flex gap-2.5 pb-1.5">
            <FollowButton officialId={id} userId={user?.id ?? null} initial={!!followRes.data} />
            <ShareButton title={name} />
          </div>
        </section>

        <section aria-label="Promise scorecard" className="card mt-8 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[22px] font-bold">Promise scorecard</h2>
            <span className="text-sm text-muted">Based on {total} logged promises</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-4">
            <div className="flex-[1_1_150px] rounded-[10px] bg-ground p-4">
              <div className="font-display text-4xl font-extrabold">{score?.kept_pct ?? 0}%</div>
              <div className="text-sm text-muted">Kept so far</div>
            </div>
            {(["completed", "in_progress", "stalled", "not_started"] as PromiseStatus[]).map((s) => (
              <div key={s} className="flex-[1_1_120px] rounded-[10px] p-4" style={{ background: STATUS[s].bg, color: STATUS[s].fg }}>
                <div className="font-display text-4xl font-extrabold">{score?.[s] ?? 0}</div>
                <div className="text-sm font-medium">{STATUS[s].label}</div>
              </div>
            ))}
          </div>
          {total ? (
            <div role="img" aria-label={`${score?.completed} completed, ${score?.in_progress} in progress, ${score?.stalled} stalled, ${score?.not_started} not started`} className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-md">
              {(["completed", "in_progress", "stalled", "not_started", "abandoned"] as PromiseStatus[]).map((s) =>
                score?.[s] ? <div key={s} style={{ flex: score[s], background: STATUS[s].bar }} /> : null
              )}
            </div>
          ) : null}
        </section>

        <div className="mt-7 flex flex-wrap items-start gap-7">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
            <section id="promises" aria-label="Campaign promises" className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[22px] font-bold">Campaign promises</h2>
                <nav aria-label="Filter promises" className="flex flex-wrap gap-1.5">
                  {FILTERS.map((f) => (
                    <Link
                      key={f.id}
                      href={`/officials/${id}?status=${f.id}#promises`}
                      scroll={false}
                      aria-current={status === f.id ? "page" : undefined}
                      className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm no-underline ${status === f.id ? "bg-ink font-semibold text-white hover:text-white" : "border border-[#C9D2CD] bg-white text-[#3E4A44]"}`}
                    >
                      {f.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="mt-5 flex flex-col gap-3.5">
                {shown.map((p) => (
                  <article key={p.id} className="rounded-xl border border-[#E1E6E3] p-[18px]">
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-[1_1_300px]">
                        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5B6660]">{p.category}</div>
                        <h3 className="mt-1 text-lg font-semibold leading-snug">{p.title}</h3>
                        <div className="mt-1.5 text-sm text-muted">Source: {p.source_note ?? p.source_type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!p.approved ? <span className="rounded-full bg-[#FFF3C4] px-2.5 py-1 text-xs font-semibold text-[#5A4300]">Being checked</span> : null}
                        <StatusChip status={p.status} />
                      </div>
                    </div>
                    <div className="mt-3.5">
                      <ProgressBar pct={p.progress} status={p.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-2 text-sm text-muted">
                      <span>
                        {promiseUpdateCounts[p.id] ?? 0} evidence posts · updated {timeAgo(p.updated_at)}
                      </span>
                      <Link href={`/promises/${p.id}`} className="font-semibold">View evidence</Link>
                    </div>
                  </article>
                ))}
                {!shown.length ? <Empty>No promises in this group yet.</Empty> : null}
              </div>
            </section>

            <section aria-label="Latest evidence" className="flex flex-col gap-4">
              <h2 className="font-display text-[22px] font-bold">Latest evidence</h2>
              {updates.slice(0, 5).map((p) => (
                <PostCard key={p.id} post={p} stats={stats[p.id]} comments={comments[p.id] ?? []} authorName={name} viewer={viewer} myVerdict={mine[p.id] ?? null} />
              ))}
              {!updates.length ? <Empty>No evidence posted yet.</Empty> : null}
            </section>

            <section id="petitions" aria-label="Petitions" className="card p-6">
              <h2 className="font-display text-[22px] font-bold">Petitions filed for the area</h2>
              {petitions.length ? (
                <ul className="mt-4 flex flex-col divide-y divide-[#ECEFED]">
                  {petitions.map((p) => {
                    const s = PETITION_STATUS[p.petition_status ?? "submitted"];
                    return (
                      <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                        <div className="min-w-0 flex-[1_1_320px]">
                          <div className="font-semibold">{p.title}</div>
                          <div className="mt-0.5 text-sm text-muted">
                            To {p.petition_to} · {fmtDate(p.created_at)}
                            {p.petition_ref ? ` · Ref ${p.petition_ref}` : ""}
                          </div>
                          {p.body ? <p className="mt-1.5 text-[15px]">{p.body}</p> : null}
                        </div>
                        <span className="rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4"><Empty>No petitions published yet.</Empty></div>
              )}
            </section>
          </div>

          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-7">
            <section aria-label="Area map" className="card overflow-hidden">
              <div className="px-5 pt-5">
                <h2 className="font-display text-xl font-bold">{area?.constituencies?.name ?? area?.electoral_areas?.name ?? area?.districts?.name ?? "Area"}</h2>
                <div className="mt-1 text-sm text-muted">{[area?.districts?.name, area?.regions?.name && `${area.regions.name} Region`].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="mt-3.5">
                <AreaMap geo={geoRes.data ?? null} markers={markers} height={260} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-4 text-[13px] text-[#3E4A44]">
                {(["completed", "in_progress", "stalled"] as PromiseStatus[]).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[s].bar }} />
                    {STATUS[s].label}
                  </span>
                ))}
              </div>
            </section>

            <section aria-label="About" className="card p-5">
              <h2 className="font-display text-xl font-bold">About</h2>
              {official.bio ? <p className="mt-2.5 text-[15px] leading-relaxed">{official.bio}</p> : null}
              <dl className="mt-3.5 grid gap-3 text-sm">
                {official.office_address ? (
                  <div><dt className="text-muted">Office</dt><dd className="mt-0.5 font-medium">{official.office_address}</dd></div>
                ) : null}
                {official.phone || official.email ? (
                  <div><dt className="text-muted">Contact</dt><dd className="mt-0.5 font-medium">{[official.phone, official.email].filter(Boolean).join(" · ")}</dd></div>
                ) : null}
                <div><dt className="text-muted">On Promise Tracker since</dt><dd className="mt-0.5 font-medium">{fmtDate(official.created_at, { month: "long", year: "numeric" })}</dd></div>
              </dl>
            </section>

            <section aria-label="Next election" className="rounded-[14px] bg-gh-red p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.08em]">Next general election</div>
              <div className="mt-1.5 font-display text-3xl font-extrabold">December 2028</div>
              <p className="mt-2 text-sm leading-normal">Follow this official to get updates when promises change, so you can vote with the full record.</p>
            </section>

            {siblings.length ? (
              <section aria-label="Also serving this area" className="card p-5">
                <h2 className="font-display text-xl font-bold">Also serving this area</h2>
                <div className="mt-3.5 flex flex-col gap-3">
                  {siblings.map((s) => (
                    <Link key={s.official_id} href={`/officials/${s.official_id}`} className="flex items-center gap-3 text-ink no-underline hover:text-ink">
                      <Avatar name={s.officials.full_name} photo={s.officials.photo_path} size={40} />
                      <span>
                        <span className="block text-[15px] font-semibold">{officialName(s.officials)}</span>
                        <span className="text-[13px] text-muted">{s.label}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
