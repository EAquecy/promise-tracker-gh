export type PromiseStatus = "not_started" | "in_progress" | "completed" | "stalled" | "abandoned" | "no_update";
export type Role = "mp" | "minister" | "deputy_minister" | "regional_minister" | "mmdce" | "assembly_member";

export interface Region {
  id: number;
  name: string;
}
export interface District {
  id: number;
  name: string;
  kind: string;
  region_id: number;
}
export interface OfficialRole {
  id: number;
  official_id: string;
  role: Role;
  label: string | null;
  region_id: number | null;
  district_id: number | null;
  constituency_id: number | null;
  electoral_area_id: number | null;
  term_start: string | null;
  term_end: string | null;
  regions?: { name: string } | null;
  districts?: { name: string } | null;
  constituencies?: { name: string } | null;
  electoral_areas?: { name: string } | null;
}
export interface Official {
  id: string;
  user_id: string | null;
  full_name: string;
  title: string | null;
  party: string | null;
  bio: string | null;
  photo_path: string | null;
  phone: string | null;
  email: string | null;
  office_address: string | null;
  status: "pending" | "verified" | "rejected";
  is_demo: boolean;
  is_public_record: boolean;
  source_url: string | null;
  created_at: string;
  official_roles?: OfficialRole[];
}
export interface PromiseRow {
  id: string;
  official_id: string;
  title: string;
  category: string;
  description: string | null;
  quote: string | null;
  source_type: string;
  source_note: string | null;
  source_url: string | null;
  source_outlet: string | null;
  status_note: string | null;
  status_source_url: string | null;
  added_by: "official" | "research" | "resident";
  made_on: string | null;
  deadline: string | null;
  status: PromiseStatus;
  progress: number;
  approved: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
}
export interface PostMedia {
  id: number;
  post_id: string;
  path: string;
  kind: "photo" | "document";
  captured_in_app: boolean;
  lat: number | null;
  lng: number | null;
  taken_at: string | null;
}
export interface Post {
  id: string;
  official_id: string;
  promise_id: string | null;
  kind: "update" | "petition";
  title: string;
  body: string | null;
  stage: string | null;
  petition_to: string | null;
  petition_ref: string | null;
  petition_status: "submitted" | "acknowledged" | "answered" | null;
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  created_at: string;
  post_media?: PostMedia[];
  promises?: { id: string; title: string } | null;
}
export interface PostStats {
  post_id: string;
  confirms: number;
  disputes: number;
  comment_count: number;
}
export interface Comment {
  id: string;
  post_id: string | null;
  promise_id: string | null;
  author_id: string | null;
  author_name: string | null;
  official_id: string | null;
  verdict: "confirm" | "dispute" | null;
  body: string;
  created_at: string;
  is_demo: boolean;
}
export interface Scorecard {
  official_id: string;
  total: number;
  completed: number;
  in_progress: number;
  stalled: number;
  not_started: number;
  abandoned: number;
  no_update: number;
  kept_pct: number;
}
