import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Comment, Post, PostStats } from "./types";
import type { Viewer } from "@/components/PostCard";

export const OFFICIAL_SELECT =
  "*, official_roles(*, regions(name), districts(name), constituencies(name), electoral_areas(name))";

export const POST_SELECT = "*, post_media(*), promises(id, title)";

export const COMMENT_SELECT =
  "*, origin:districts!comments_origin_district_id_fkey(name), located:districts!comments_located_district_id_fkey(name)";

export async function getViewer(supabase: SupabaseClient, user: User | null): Promise<Viewer | null> {
  if (!user) return null;
  const [{ data: profile }, { data: official }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("officials").select("id, title, full_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const name = official
    ? `${official.title ? official.title + " " : ""}${official.full_name}`
    : profile?.display_name || user.email?.split("@")[0] || "Resident";
  return { id: user.id, name, officialId: official?.id ?? null };
}

export async function loadPostExtras(supabase: SupabaseClient, posts: Post[], userId: string | null) {
  const ids = posts.map((p) => p.id);
  if (!ids.length) return { stats: {} as Record<string, PostStats>, comments: {} as Record<string, Comment[]>, mine: {} as Record<string, "confirm" | "dispute"> };
  const [s, c, r] = await Promise.all([
    supabase.from("post_stats").select("*").in("post_id", ids),
    supabase.from("comments").select(COMMENT_SELECT).in("post_id", ids).order("created_at"),
    userId ? supabase.from("reactions").select("post_id, verdict").in("post_id", ids).eq("user_id", userId) : Promise.resolve({ data: [] }),
  ]);
  const stats: Record<string, PostStats> = {};
  (s.data ?? []).forEach((x: PostStats) => (stats[x.post_id] = x));
  const comments: Record<string, Comment[]> = {};
  (c.data ?? []).forEach((x: Comment) => {
    if (!x.post_id) return;
    (comments[x.post_id] ??= []).push(x);
  });
  const mine: Record<string, "confirm" | "dispute"> = {};
  ((r.data ?? []) as { post_id: string; verdict: "confirm" | "dispute" }[]).forEach((x) => (mine[x.post_id] = x.verdict));
  return { stats, comments, mine };
}
