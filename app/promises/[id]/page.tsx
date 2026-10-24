import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DemoBadge, Empty, ProgressBar, StatusChip } from "@/components/ui";
import { PostCard } from "@/components/PostCard";
import { ShareButton } from "@/components/FollowButton";
import { AreaMap } from "@/components/maps";
import { ReportError } from "@/components/ReportError";
import { getUser } from "@/lib/supabase/server";
import { POST_SELECT, getViewer, loadPostExtras } from "@/lib/data";
import { SOURCE_LABEL, STATUS, fmtDate, officialName } from "@/lib/format";
import type { Post, PromiseRow } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data } = await supabase.from("promises").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Promise" };
}

export default async function PromisePage({ params }: Params) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getUser();
  const { data: pr } = await supabase
    .from("promises")
    .select("*, officials(id, title, full_name, is_demo)")
    .eq("id", id)
    .maybeSingle();
  if (!pr) notFound();
  const promise = pr as PromiseRow & { officials: { id: string; title: string | null; full_name: string; is_demo: boolean } };
  const owner = officialName(promise.officials);

  const [{ data: postsData }, viewer] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("promise_id", id).order("created_at", { ascending: true }),
    getViewer(supabase, user),
  ]);
  const posts = (postsData ?? []) as Post[];
  const { stats, comments, mine } = await loadPostExtras(supabase, posts, user?.id ?? null);
  const confirms = posts.reduce((a, p) => a + (stats[p.id]?.confirms ?? 0), 0);
  const disputes = posts.reduce((a, p) => a + (stats[p.id]?.disputes ?? 0), 0);
  const latest = posts[posts.length - 1];
  const share = confirms + disputes ? Math.round((100 * confirms) / (confirms + disputes)) : null;
  const pin = promise.lat && promise.lng ? { lat: promise.lat, lng: promise.lng } : latest?.lat && latest?.lng ? { lat: latest.lat, lng: latest.lng } : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted">
          <Link href={`/officials/${promise.officials.id}`}>{owner}</Link>
          <span aria-hidden="true">/</span>
          <span>Promises</span>
          <span aria-hidden="true">/</span>
          <span>{promise.title}</span>
        </nav>

        <section aria-label="Promise summary" className="card mt-4 p-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5B6660]">{promise.category}</span>
            <StatusChip status={promise.status} />
            <span className="text-sm font-semibold" style={{ color: STATUS[promise.status].fg }}>{promise.progress}%</span>
            {promise.officials.is_demo ? <DemoBadge /> : null}
          </div>
          <h1 className="mt-2.5 font-display text-[30px] font-extrabold leading-tight md:text-4xl">{promise.title}</h1>
          <div className="mt-3 max-w-xl"><ProgressBar pct={promise.progress} status={promise.status} /></div>
          <div className="mt-5 flex flex-wrap gap-5">
            <figure className="m-0 min-w-0 flex-[1_1_340px] rounded-xl border border-[#E1E6E3] bg-[#F7F9F8] p-4">
              <figcaption className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5B6660]">What was promised</figcaption>
              <blockquote className="mt-2.5 text-[17px] leading-relaxed">
                {promise.quote ? `"${promise.quote}"` : promise.description ?? promise.title}
              </blockquote>
              {promise.quote && promise.description ? <p className="mt-2.5 text-[15px] leading-normal text-muted">{promise.description}</p> : null}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span>
                  {promise.added_by === "research" && promise.source_outlet
                    ? `Reported by ${promise.source_outlet}${promise.made_on ? `, ${fmtDate(promise.made_on)}` : ""}`
                    : `${SOURCE_LABEL[promise.source_type] ?? promise.source_type}${promise.source_note ? `: ${promise.source_note}` : ""}`}
                </span>
                {promise.source_url ? <a href={promise.source_url} target="_blank" rel="noreferrer" className="font-semibold">Read the source</a> : null}
              </div>
              {promise.added_by === "research" ? (
                <p className="mt-2 text-[13px] text-muted">Added by Promise Tracker GH from public reporting. The official has not confirmed it here.</p>
              ) : null}
            </figure>
            <div className="flex flex-[1_1_300px] flex-wrap content-start gap-3">
              {[
                ["Promised on", fmtDate(promise.made_on) || "Unknown"],
                ["Deadline", fmtDate(promise.deadline) || "Not stated"],
                ["Evidence posts", String(posts.length)],
                ["Last update", latest ? fmtDate(latest.created_at) : "None yet"],
              ].map(([k, v]) => (
                <div key={k} className="flex-[1_1_130px] rounded-[10px] bg-ground p-3.5">
                  <div className="text-[13px] text-muted">{k}</div>
                  <div className="mt-1 font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-7 flex flex-wrap items-start gap-7">
          <section aria-label="Evidence timeline" className="min-w-0 flex-[999_1_560px]">
            {promise.status_note ? (
              <div className="card mb-6 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[#5B6660]">Latest status</div>
                <p className="mt-2 text-base leading-relaxed">{promise.status_note}</p>
                {promise.status_source_url ? (
                  <a href={promise.status_source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold">Read the source</a>
                ) : null}
              </div>
            ) : null}
            <h2 className="font-display text-[22px] font-bold">Evidence timeline</h2>
            <p className="mt-1.5 text-sm text-muted">Each stage is posted by the official. Residents confirm or dispute what they see.</p>
            {posts.length ? (
              <ol className="mt-5 flex flex-col">
                {posts.map((p, i) => {
                  const last = i === posts.length - 1;
                  return (
                    <li key={p.id} className="flex gap-4">
                      <div className="flex w-7 flex-none flex-col items-center">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                          style={last && promise.status !== "completed" ? { borderColor: "#2B6CC4", color: "#1A4F94", background: "#fff" } : { borderColor: "#1B7A4B", background: "#1B7A4B", color: "#fff" }}
                        >
                          {i + 1}
                        </span>
                        {!last ? <span className="w-0.5 flex-1 bg-line" /> : null}
                      </div>
                      <div className="min-w-0 flex-1 pb-6">
                        <PostCard post={p} stats={stats[p.id]} comments={comments[p.id] ?? []} authorName={owner} viewer={viewer} myVerdict={mine[p.id] ?? null} showPromiseLink={false} compact={!last} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-5">
                <Empty>
                  No evidence posted for this promise yet. Seen progress on the ground? Use &quot;Report an error&quot; with a link or photo, and the official
                  can post updates once they claim their profile.
                </Empty>
              </div>
            )}
          </section>

          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-7">
            <section aria-label="Community verdict" className="card p-5">
              <h2 className="font-display text-xl font-bold">Community verdict</h2>
              <div className="mt-4 flex justify-between text-sm font-semibold">
                <span className="text-done">{confirms} confirm</span>
                <span className="text-stall">{disputes} dispute</span>
              </div>
              <div role="img" aria-label={share != null ? `${share} percent confirm` : "No responses yet"} className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-md bg-[#ECEFED]">
                {confirms ? <div style={{ flex: confirms, background: "#1B7A4B" }} /> : null}
                {disputes ? <div style={{ flex: disputes, background: "#C25E12" }} /> : null}
              </div>
              <p className="mt-3 text-sm leading-normal text-muted">
                {share != null ? `${share}% of responses across all updates say the evidence is accurate.` : "No resident responses yet."}
              </p>
            </section>

            <section aria-label="Project location" className="card overflow-hidden">
              <div className="px-5 pt-5">
                <h2 className="font-display text-xl font-bold">Project site</h2>
                <div className="mt-1 text-sm text-muted">{latest?.place_name ?? "Location not set yet"}</div>
              </div>
              <div className="mt-3.5">
                <AreaMap markers={pin ? [{ ...pin, color: STATUS[promise.status].bar, label: promise.title }] : []} height={220} />
              </div>
              {pin ? (
                <div className="px-5 py-3.5">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`} target="_blank" rel="noreferrer" className="text-sm font-semibold">Get directions to visit the site</a>
                </div>
              ) : null}
            </section>

            <section aria-label="Corrections" className="card p-5">
              <h2 className="font-display text-xl font-bold">Something wrong?</h2>
              <p className="mt-2 text-sm leading-normal text-muted">If this promise, its source or its status is inaccurate, tell us and we will check it.</p>
              <div className="mt-3">
                <ReportError promiseId={promise.id} officialId={promise.official_id} userId={user?.id ?? null} />
              </div>
            </section>

            <section aria-label="Share" className="rounded-[14px] bg-ink p-5 text-white">
              <h2 className="font-display text-xl font-bold">Spread the record</h2>
              <p className="mt-2 text-sm leading-normal text-[#C9D6CF]">Share this promise so more residents can check it.</p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <a className="btn btn-gold rounded-full" href={`https://wa.me/?text=${encodeURIComponent(`${promise.title} (${STATUS[promise.status].label}) on Promise Tracker GH`)}`} target="_blank" rel="noreferrer">
                  Share to WhatsApp
                </a>
                <ShareButton title={promise.title} />
              </div>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
