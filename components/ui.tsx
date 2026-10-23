import Link from "next/link";
import { STATUS, initials } from "@/lib/format";
import type { PromiseStatus } from "@/lib/types";
import { publicUrl } from "@/lib/supabase/env";

export function StarMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg bg-gh-gold"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24">
        <path d="M12 2.5l2.8 6.6 7.2.6-5.5 4.7 1.7 7-6.2-3.8-6.2 3.8 1.7-7-5.5-4.7 7.2-.6z" fill="#13201A" />
      </svg>
    </span>
  );
}

export function FlagStripe() {
  return (
    <div aria-hidden="true" className="flex h-1.5">
      <div className="flex-1 bg-gh-red" />
      <div className="flex-1 bg-gh-gold" />
      <div className="flex-1 bg-gh-green" />
    </div>
  );
}

export function StatusChip({ status }: { status: PromiseStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function ProgressBar({ pct, status }: { pct: number; status: PromiseStatus }) {
  return (
    <div className="h-2 overflow-hidden rounded bg-[#ECEFED]" role="img" aria-label={`${pct}% done`}>
      <div className="h-full" style={{ width: `${Math.max(pct, 2)}%`, background: STATUS[status].bar }} />
    </div>
  );
}

export function Avatar({ name, photo, size = 52, ring = false }: { name: string; photo?: string | null; size?: number; ring?: boolean }) {
  const url = publicUrl("avatars", photo);
  return (
    <span
      className="inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-[#CFDAD3] font-display font-extrabold text-gh-green"
      style={{ width: size, height: size, fontSize: size * 0.32, border: ring ? "6px solid #F4F6F4" : undefined }}
      aria-hidden={url ? undefined : true}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-block rounded-full bg-[#FFF3C4] px-2.5 py-1 text-xs font-semibold text-[#5A4300]">
      Demo profile · sample data
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#C9D2CD] p-6 text-center text-[15px] text-muted">{children}</p>;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="m-0 font-display text-[22px] font-bold">{children}</h2>
      {aside}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold">
      ← {children}
    </Link>
  );
}
