import Link from "next/link";
import { Avatar } from "./ui";
import { keptTier, officialName, ROLE_LABEL } from "@/lib/format";
import type { Official, Scorecard } from "@/lib/types";

export function roleLine(o: Official) {
  const r = o.official_roles?.[0];
  if (!r) return "";
  const where = r.constituencies?.name ?? r.electoral_areas?.name ?? r.districts?.name ?? r.regions?.name;
  return `${r.label ?? ROLE_LABEL[r.role]}${where ? `, ${where}` : ""}`;
}

export function OfficialCard({ o, score }: { o: Official; score?: Scorecard }) {
  const pct = score?.kept_pct ?? 0;
  return (
    <Link href={`/officials/${o.id}`} className="card block overflow-hidden text-ink no-underline hover:text-ink hover:shadow-sm">
      <div aria-hidden="true" className="h-[72px] bg-gh-green-dark" />
      <div className="px-[18px] pb-[18px]">
        <div className="-mt-8 inline-block rounded-full border-4 border-white">
          <Avatar name={o.full_name} photo={o.photo_path} size={60} />
        </div>
        <div className="mt-2 text-[17px] font-semibold">{officialName(o)}</div>
        <div className="mt-0.5 text-sm text-muted">{roleLine(o)}</div>
        <div className="mt-3.5 flex justify-between text-[13px] text-[#3E4A44]">
          <span>Kept</span>
          <strong>{pct}%</strong>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded bg-[#ECEFED]">
          <div className="h-full" style={{ width: `${Math.max(pct, 2)}%`, background: "#1B7A4B" }} />
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[13px] text-muted">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: keptTier(score?.kept_pct) }} />
          {score?.total ?? 0} promises tracked
          {o.is_demo ? (
            <span className="ml-auto font-semibold text-[#5A4300]">Demo</span>
          ) : o.is_public_record && !o.user_id ? (
            <span className="ml-auto font-semibold text-[#48536A]">Public record</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
