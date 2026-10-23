import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Empty, StatusChip } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";
import { OFFICIAL_SELECT } from "@/lib/data";
import { PETITION_STATUS, fmtDate, officialName, timeAgo } from "@/lib/format";
import type { Comment, Official, Post, PromiseRow, Scorecard } from "@/lib/types";
import { Composer } from "./Composer";

export const metadata = { title: "Official dashboard" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/official/login");
  const { data: o } = await supabase.from("officials").select(OFFICIAL_SELECT).eq("user_id", user.id).maybeSingle();
  if (!o) redirect("/official/setup");
  const official = o as Official;
  const name = officialName(official);
  const roles = official.official_roles ?? [];

  if (official.status !== "verified") {
    return (
      <>
        <Header variant="official" />
        <main className="mx-auto max-w-[760px] px-6 py-12">
          <div className="card p-8">
            <div className="inline-block rounded-full bg-stall-bg px-3 py-1.5 text-[13px] font-semibold text-stall">
              {official.status === "rejected" ? "Not approved" : "Awaiting verification"}
            </div>
            <h1 className="mt-4 font-display text-[30px] font-extrabold">Thanks, {name}</h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {official.status === "rejected"
                ? "We could not confirm your details. Update your documents and submit again, or contact us."
                : "We are checking your proof of office. Once approved, your public profile goes live and you can post updates, petitions and new promises. This usually takes 1 to 3 working days."}
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-[15px]">
              {roles.map((r) => (
                <li key={r.id} className="rounded-lg bg-ground px-3.5 py-2.5">
                  <strong>{r.label}</strong>
                  {r.districts?.name ? ` · ${r.districts.name}` : ""}
                  {r.regions?.name ? ` · ${r.regions.name}` : ""}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/official/setup" className="btn btn-ghost">Edit submission</Link>
              <Link href={`/officials/${official.id}`} className="btn btn-ghost">Preview my profile</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const [promisesRes, postsRes, scoreRes, followersRes] = await Promise.all([
    supabase.from("promises").select("*").eq("official_id", official.id).order("created_at"),
    supabase.from("posts").select("*, promises(id, title)").eq("official_id", official.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("official_scorecard").select("*").eq("official_id", official.id).maybeSingle(),
    supabase.from("follows").select("user_id", { count: "exact", head: true }).eq("official_id", official.id),
  ]);
  const promises = (promisesRes.data ?? []) as PromiseRow[];
  const posts = (postsRes.data ?? []) as Post[];
  const updates = posts.filter((p) => p.kind === "update");
  const petitions = posts.filter((p) => p.kind === "petition");
  const score = scoreRes.data as Scorecard | null;
  const ids = updates.map((p) => p.id);
  const [{ data: cmts }, { data: pstats }] = ids.length
    ? await Promise.all([
        supabase.from("comments").select("*").in("post_id", ids).order("created_at", { ascending: false }).limit(200),
        supabase.from("post_stats").select("*").in("post_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const comments = (cmts ?? []) as Comment[];
  const answered = new Set(comments.filter((c) => c.official_id).map((c) => c.post_id));
  const toAnswer = comments.filter((c) => c.verdict === "dispute" && !c.official_id && !answered.has(c.post_id));
  const confirms = (pstats ?? []).reduce((a: number, s: { confirms: number }) => a + s.confirms, 0);
  const disputes = (pstats ?? []).reduce((a: number, s: { disputes: number }) => a + s.disputes, 0);
  const postTitle = Object.fromEntries(updates.map((p) => [p.id, p]));

  return (
    <>
      <Header variant="official" />
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-7 px-6 pb-16 pt-7">
        <nav aria-label="Dashboard" className="flex max-w-[240px] flex-[1_1_200px] flex-col gap-1">
          <a href="#compose" className="flex h-11 items-center rounded-[10px] bg-gh-green px-3.5 font-semibold text-white no-underline hover:text-white">Post an update</a>
          <a href="#respond" className="flex h-11 items-center justify-between rounded-[10px] px-3.5 text-ink no-underline hover:bg-white">
            Residents to answer
            {toAnswer.length ? <span className="rounded-full bg-gh-red px-2 py-0.5 text-xs font-bold text-white">{toAnswer.length}</span> : null}
          </a>
          <a href="#promises" className="flex h-11 items-center rounded-[10px] px-3.5 text-ink no-underline hover:bg-white">Promises · {promises.length}</a>
          <a href="#petitions" className="flex h-11 items-center rounded-[10px] px-3.5 text-ink no-underline hover:bg-white">Petitions · {petitions.length}</a>
          <Link href={`/officials/${official.id}`} className="flex h-11 items-center rounded-[10px] px-3.5 text-ink no-underline hover:bg-white">View my public profile</Link>
          <div className="mt-3.5 rounded-xl border border-line bg-white p-3.5 text-[13px] leading-normal text-muted">
            <div className="font-semibold text-ink">Your area</div>
            {roles.map((r) => (
              <div key={r.id}>{r.label}{r.districts?.name ? `, ${r.districts.name}` : ""}</div>
            ))}
          </div>
        </nav>

        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-6">
          <div>
            <h1 className="font-display text-[30px] font-extrabold">Welcome, {name}</h1>
            <p className="mt-1.5 text-[15px] text-muted">Residents see everything you publish here on your public profile.</p>
          </div>

          <section aria-label="Summary" className="flex flex-wrap gap-3.5">
            {[
              [followersRes.count ?? 0, "Followers", ""],
              [score?.kept_pct ?? 0, "% kept", ""],
              [confirms, "Resident confirmations", "text-done"],
              [disputes, "Disputes", "text-stall"],
            ].map(([n, l, c]) => (
              <div key={l as string} className="card flex-[1_1_150px] p-4">
                <div className={`font-display text-[28px] font-extrabold ${c}`}>{(n as number).toLocaleString()}</div>
                <div className="text-sm text-muted">{l}</div>
              </div>
            ))}
          </section>

          <section id="compose" aria-label="New post" className="card p-6">
            <Composer officialId={official.id} userId={user.id} promises={promises.map((p) => ({ id: p.id, title: p.title, status: p.status, progress: p.progress, approved: p.approved }))} />
          </section>

          <section id="respond" aria-label="Residents to answer" className="card p-6">
            <h2 className="font-display text-[22px] font-bold">Residents waiting for an answer</h2>
            <div className="mt-4 flex flex-col gap-3.5">
              {toAnswer.slice(0, 10).map((c) => (
                <div key={c.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-[#F0CDB0] bg-[#FFF6EF] p-3.5">
                  <div className="min-w-0 flex-[1_1_360px]">
                    <div className="text-sm">
                      <strong>{c.author_name ?? "Resident"}</strong> · <span className="font-semibold text-stall">Disputes</span> · {postTitle[c.post_id!]?.title} · {timeAgo(c.created_at)}
                    </div>
                    <p className="mt-1.5 text-[15px] leading-normal">{c.body}</p>
                  </div>
                  {postTitle[c.post_id!]?.promise_id ? (
                    <Link href={`/promises/${postTitle[c.post_id!]!.promise_id}`} className="btn btn-dark">Reply officially</Link>
                  ) : (
                    <Link href={`/officials/${official.id}`} className="btn btn-dark">Reply officially</Link>
                  )}
                </div>
              ))}
              {!toAnswer.length ? <Empty>No open disputes. Nice.</Empty> : null}
            </div>
          </section>

          <section id="promises" aria-label="Promises" className="card p-6">
            <h2 className="font-display text-[22px] font-bold">Your promises</h2>
            <ul className="mt-4 flex flex-col divide-y divide-[#ECEFED]">
              {promises.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link href={`/promises/${p.id}`} className="min-w-0 flex-[1_1_300px] font-semibold text-ink">{p.title}</Link>
                  <div className="flex items-center gap-2">
                    {!p.approved ? <span className="rounded-full bg-[#FFF3C4] px-2.5 py-1 text-xs font-semibold text-[#5A4300]">Being checked</span> : null}
                    <span className="text-sm text-muted">{p.progress}%</span>
                    <StatusChip status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
            {!promises.length ? <Empty>No promises yet. Use &quot;New promise&quot; above to add the ones you campaigned on.</Empty> : null}
          </section>

          <section id="petitions" aria-label="Petitions" className="card p-6">
            <h2 className="font-display text-[22px] font-bold">Petitions you have filed</h2>
            <div className="mt-3.5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="border-b border-line px-2 py-2.5 font-semibold">Petition</th>
                    <th className="border-b border-line px-2 py-2.5 font-semibold">Submitted to</th>
                    <th className="border-b border-line px-2 py-2.5 font-semibold">Date</th>
                    <th className="border-b border-line px-2 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {petitions.map((p) => {
                    const s = PETITION_STATUS[p.petition_status ?? "submitted"];
                    return (
                      <tr key={p.id}>
                        <td className="border-b border-[#ECEFED] px-2 py-3 font-medium">{p.title}</td>
                        <td className="border-b border-[#ECEFED] px-2 py-3">{p.petition_to}</td>
                        <td className="border-b border-[#ECEFED] px-2 py-3">{fmtDate(p.created_at)}</td>
                        <td className="border-b border-[#ECEFED] px-2 py-3">
                          <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!petitions.length ? <div className="mt-3"><Empty>No petitions yet.</Empty></div> : null}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
