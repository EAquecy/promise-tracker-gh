import type { PromiseStatus, Role } from "./types";

export const STATUS: Record<PromiseStatus, { label: string; bg: string; fg: string; bar: string }> = {
  completed: { label: "Completed", bg: "#E3F3EA", fg: "#14633D", bar: "#1B7A4B" },
  in_progress: { label: "In progress", bg: "#E4EDFA", fg: "#1A4F94", bar: "#2B6CC4" },
  stalled: { label: "Stalled", bg: "#FCEBDC", fg: "#9A4507", bar: "#C25E12" },
  not_started: { label: "Not started", bg: "#ECEEED", fg: "#4A5550", bar: "#9AA39E" },
  abandoned: { label: "Abandoned", bg: "#F9E0E3", fg: "#8E1B26", bar: "#B3263A" },
  no_update: { label: "No update yet", bg: "#EEF1F6", fg: "#48536A", bar: "#B7BFCC" },
};

export const ROLE_LABEL: Record<Role, string> = {
  mp: "Member of Parliament",
  minister: "Minister",
  deputy_minister: "Deputy Minister",
  regional_minister: "Regional Minister",
  mmdce: "MMDCE",
  assembly_member: "Assembly Member",
};

export const SOURCE_LABEL: Record<string, string> = {
  manifesto: "Manifesto",
  rally: "Campaign rally",
  interview: "Interview",
  social: "Social media",
  other: "Other",
};

export const PETITION_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  submitted: { label: "Submitted", bg: "#ECEEED", fg: "#4A5550" },
  acknowledged: { label: "Acknowledged", bg: "#E4EDFA", fg: "#1A4F94" },
  answered: { label: "Answered", bg: "#E3F3EA", fg: "#14633D" },
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

export function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} hours ago`;
  const days = h / 24;
  if (days < 30) return `${Math.floor(days)} days ago`;
  return fmtDate(d);
}

export function officialName(o: { title: string | null; full_name: string }) {
  return `${o.title ? o.title + " " : ""}${o.full_name}`;
}

export function keptTier(pct: number | null | undefined) {
  if (pct == null) return "#E3E8E5";
  if (pct < 25) return "#F2B8BF";
  if (pct <= 50) return "#FBE29A";
  return "#9DD6B3";
}
