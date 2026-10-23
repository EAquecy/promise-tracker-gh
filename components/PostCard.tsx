"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { publicUrl } from "@/lib/supabase/env";
import { fmtDate, initials, timeAgo } from "@/lib/format";
import type { Comment, Post, PostStats } from "@/lib/types";

export interface Viewer {
  id: string;
  name: string;
  officialId: string | null;
}

export function PostCard({
  post,
  stats,
  comments: initialComments,
  authorName,
  viewer,
  myVerdict,
  showPromiseLink = true,
  compact = false,
}: {
  post: Post;
  stats: PostStats | undefined;
  comments: Comment[];
  authorName: string;
  viewer: Viewer | null;
  myVerdict: "confirm" | "dispute" | null;
  showPromiseLink?: boolean;
  compact?: boolean;
}) {
  const supabase = createClient();
  const [verdict, setVerdict] = useState(myVerdict);
  const [counts, setCounts] = useState({ confirms: stats?.confirms ?? 0, disputes: stats?.disputes ?? 0 });
  const [comments, setComments] = useState(initialComments);
  const [open, setOpen] = useState(!compact && initialComments.length > 0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isOwnOfficial = viewer?.officialId === post.official_id;

  async function react(v: "confirm" | "dispute") {
    if (!viewer) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setErr(null);
    const prev = verdict;
    const next = prev === v ? null : v;
    setVerdict(next);
    setCounts((c) => {
      const n = { ...c };
      if (prev === "confirm") n.confirms--;
      if (prev === "dispute") n.disputes--;
      if (next === "confirm") n.confirms++;
      if (next === "dispute") n.disputes++;
      return n;
    });
    const res = next
      ? await supabase.from("reactions").upsert({ post_id: post.id, user_id: viewer.id, verdict: next })
      : await supabase.from("reactions").delete().eq("post_id", post.id).eq("user_id", viewer.id);
    if (res.error) setErr("Could not save your response. Please try again.");
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer || !text.trim()) return;
    setBusy(true);
    setErr(null);
    const row = {
      post_id: post.id,
      author_id: viewer.id,
      author_name: viewer.name,
      official_id: isOwnOfficial ? viewer.officialId : null,
      verdict: isOwnOfficial ? null : verdict,
      body: text.trim(),
    };
    const { data, error } = await supabase.from("comments").insert(row).select().single();
    setBusy(false);
    if (error) return setErr("Could not post your comment.");
    setComments((c) => [...c, data as Comment]);
    setText("");
  }

  const photos = (post.post_media ?? []).filter((m) => m.kind === "photo");
  const docs = (post.post_media ?? []).filter((m) => m.kind === "document");
  const allInApp = photos.length > 0 && photos.every((p) => p.captured_in_app);

  return (
    <article className="card p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#CFDAD3] font-bold text-gh-green">
          {initials(authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{authorName}</div>
          <div className="text-[13px] text-muted">
            {timeAgo(post.created_at)}
            {showPromiseLink && post.promises ? (
              <>
                {" · on "}
                <Link href={`/promises/${post.promises.id}`}>{post.promises.title}</Link>
              </>
            ) : null}
          </div>
        </div>
        {post.stage ? (
          <span className="rounded-full bg-doing-bg px-3 py-1.5 text-[13px] font-semibold text-doing">{post.stage}</span>
        ) : null}
      </div>
      <h3 className="mt-3.5 text-lg font-semibold">{post.title}</h3>
      {post.body ? <p className="mt-1.5 whitespace-pre-line text-base leading-relaxed">{post.body}</p> : null}

      {photos.length ? (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {photos.slice(0, 6).map((m) => (
            <a key={m.id} href={publicUrl("evidence", m.path)!} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-lg bg-[#DCE3DF]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl("evidence", m.path)!} alt={`Evidence photo for ${post.title}`} className="h-full w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      ) : null}
      {docs.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {docs.map((d) => (
            <li key={d.id}>
              <a className="btn btn-ghost" href={publicUrl("evidence", d.path)!} target="_blank" rel="noreferrer">
                Open document
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {photos.length || post.place_name ? (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium">
          {post.place_name ? <span className="text-done">Location: {post.place_name}</span> : null}
          {photos.length ? (
            <span className={allInApp ? "text-done" : "text-stall"}>
              {allInApp ? "Photos taken in app, GPS and time stamped" : "Some photos uploaded from gallery, not verified"}
            </span>
          ) : null}
          <span className="text-muted">{fmtDate(post.created_at)}</span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#E1E6E3] pt-3.5">
        <button
          type="button"
          onClick={() => react("confirm")}
          aria-pressed={verdict === "confirm"}
          className="btn"
          style={{ background: verdict === "confirm" ? "#1B7A4B" : "#E3F3EA", color: verdict === "confirm" ? "#fff" : "#14633D", border: "1px solid #B9DCC8" }}
        >
          I can confirm this · {counts.confirms}
        </button>
        <button
          type="button"
          onClick={() => react("dispute")}
          aria-pressed={verdict === "dispute"}
          className="btn"
          style={{ background: verdict === "dispute" ? "#9A4507" : "#FCEBDC", color: verdict === "dispute" ? "#fff" : "#9A4507", border: "1px solid #F0CDB0" }}
        >
          I dispute this · {counts.disputes}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-ghost" aria-expanded={open}>
          Comments · {comments.length}
        </button>
      </div>
      {err ? <p className="mt-2 text-sm text-gh-red">{err}</p> : null}

      {open ? (
        <div className="mt-4 flex flex-col gap-3.5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#E3E8E5] text-[13px] font-bold text-[#3E4A44]">
                {initials(c.author_name ?? "?")}
              </span>
              <div className={`min-w-0 flex-1 rounded-xl px-3.5 py-3 ${c.official_id ? "border border-[#C9DCF3] bg-[#F1F6FD]" : "bg-ground"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <strong>{c.author_name ?? "Resident"}</strong>
                  {c.official_id ? (
                    <span className="rounded-full bg-doing-bg px-2 py-0.5 text-xs font-semibold text-doing">Official response</span>
                  ) : null}
                  {c.verdict === "confirm" ? <span className="text-xs font-semibold text-done">Confirms</span> : null}
                  {c.verdict === "dispute" ? <span className="text-xs font-semibold text-stall">Disputes</span> : null}
                  <span className="text-muted">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[15px] leading-normal">{c.body}</p>
              </div>
            </div>
          ))}
          {viewer ? (
            <form onSubmit={addComment} className="flex flex-col gap-2">
              <label htmlFor={`c-${post.id}`} className="sr-only">Write a comment</label>
              <textarea
                id={`c-${post.id}`}
                className="field"
                rows={3}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isOwnOfficial ? "Reply officially to residents" : "Live nearby? Say what you have seen."}
              />
              <div className="flex justify-end">
                <button className="btn btn-primary" disabled={busy || !text.trim()}>
                  {isOwnOfficial ? "Post official reply" : "Post comment"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted">
              <Link href="/login">Sign in</Link> to confirm, dispute or comment.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
