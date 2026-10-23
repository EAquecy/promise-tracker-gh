"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { District, Official, Region, Role } from "@/lib/types";

const ROLE_OPTIONS: { id: Role; name: string; hint: string }[] = [
  { id: "mp", name: "Member of Parliament", hint: "Elected for a constituency" },
  { id: "minister", name: "Minister", hint: "Heads a ministry" },
  { id: "deputy_minister", name: "Deputy Minister", hint: "Deputy at a ministry" },
  { id: "regional_minister", name: "Regional Minister", hint: "Appointed for a region" },
  { id: "mmdce", name: "MMDCE", hint: "Metropolitan, Municipal or District Chief Executive" },
  { id: "assembly_member", name: "Assembly Member", hint: "Elected for an electoral area" },
];

function safeName(n: string) {
  return n.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
}

export function SetupForm({ userId, email, existing, regions, districts }: { userId: string; email: string; existing: Official | null; regions: Region[]; districts: District[] }) {
  const router = useRouter();
  const er = existing?.official_roles ?? [];
  const first = er[0];
  const [roles, setRoles] = useState<Set<Role>>(new Set(er.map((r) => r.role)));
  const [form, setForm] = useState({
    title: existing?.title ?? "Hon.",
    full_name: existing?.full_name ?? "",
    party: existing?.party ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? email,
    office_address: existing?.office_address ?? "",
    bio: existing?.bio ?? "",
    region_id: first?.region_id ? String(first.region_id) : "",
    district_id: er.find((r) => r.district_id)?.district_id ? String(er.find((r) => r.district_id)!.district_id) : "",
    constituency: (er.find((r) => r.role === "mp")?.label ?? "").replace(/^Member of Parliament, /, ""),
    electoral_area: (er.find((r) => r.role === "assembly_member")?.label ?? "").replace(/^Assembly Member, /, ""),
    ministry: (er.find((r) => r.role === "minister" || r.role === "deputy_minister")?.label ?? "").replace(/^(Deputy )?Minister, /, ""),
    term_start: first?.term_start?.slice(0, 7) ?? "",
  });
  const [docs, setDocs] = useState<File[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const regionDistricts = useMemo(() => districts.filter((d) => String(d.region_id) === form.region_id), [districts, form.region_id]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const has = (r: Role) => roles.has(r);
  const needsDistrict = has("mp") || has("mmdce") || has("assembly_member");

  function toggle(r: Role) {
    setRoles((prev) => {
      const n = new Set(prev);
      if (n.has(r)) n.delete(r);
      else n.add(r);
      return n;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!roles.size) return setErr("Pick at least one role.");
    if (!form.region_id) return setErr("Choose your region.");
    if (needsDistrict && !form.district_id) return setErr("Choose the district your area is in.");
    if (has("mp") && !form.constituency.trim()) return setErr("Enter your constituency name.");
    if (has("assembly_member") && !form.electoral_area.trim()) return setErr("Enter your electoral area.");
    if ((has("minister") || has("deputy_minister")) && !form.ministry.trim()) return setErr("Enter your ministry.");
    if (!existing && !docs.length) return setErr("Upload at least one proof of office document.");

    setBusy(true);
    const supabase = createClient();
    const basics = {
      title: form.title.trim() || null,
      full_name: form.full_name.trim(),
      party: form.party.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      office_address: form.office_address.trim() || null,
      bio: form.bio.trim() || null,
    };
    let officialId = existing?.id;
    if (!officialId) {
      const { data, error } = await supabase.from("officials").insert({ ...basics, user_id: userId }).select("id").single();
      if (error) {
        setBusy(false);
        return setErr("Could not save your profile: " + error.message);
      }
      officialId = data.id;
    } else {
      const { error } = await supabase.from("officials").update(basics).eq("id", officialId);
      if (error) {
        setBusy(false);
        return setErr("Could not save your profile: " + error.message);
      }
      await supabase.from("official_roles").delete().eq("official_id", officialId);
    }

    const region_id = Number(form.region_id);
    const district_id = form.district_id ? Number(form.district_id) : null;
    const term_start = form.term_start ? `${form.term_start}-01` : null;
    const rows = [...roles].map((r) => ({
      official_id: officialId,
      role: r,
      region_id,
      district_id: r === "mp" || r === "mmdce" || r === "assembly_member" ? district_id : null,
      term_start,
      label:
        r === "mp"
          ? `Member of Parliament, ${form.constituency.trim()}`
          : r === "assembly_member"
            ? `Assembly Member, ${form.electoral_area.trim()}`
            : r === "minister"
              ? `Minister, ${form.ministry.trim()}`
              : r === "deputy_minister"
                ? `Deputy Minister, ${form.ministry.trim()}`
                : r === "regional_minister"
                  ? `Regional Minister, ${regions.find((x) => x.id === region_id)?.name}`
                  : `${districts.find((d) => d.id === district_id)?.kind === "metropolitan" ? "Metropolitan" : districts.find((d) => d.id === district_id)?.kind === "municipal" ? "Municipal" : "District"} Chief Executive`,
    }));
    const { error: rErr } = await supabase.from("official_roles").insert(rows);
    if (rErr) {
      setBusy(false);
      return setErr("Could not save your roles: " + rErr.message);
    }

    for (const f of docs) {
      const path = `${officialId}/${Date.now()}-${safeName(f.name)}`;
      const up = await supabase.storage.from("official-docs").upload(path, f);
      if (up.error) {
        setBusy(false);
        return setErr(`Could not upload ${f.name}: ${up.error.message}`);
      }
      await supabase.from("official_documents").insert({ official_id: officialId, path, label: f.name });
    }
    if (photo) {
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${officialId}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, photo, { upsert: true });
      if (!up.error) await supabase.from("officials").update({ photo_path: path }).eq("id", officialId);
    }
    router.push("/official/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 flex max-w-[860px] flex-col gap-6">
      <fieldset className="card m-0 p-[22px]">
        <legend className="px-1.5 font-display text-lg font-bold">About you</legend>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          <div>
            <label htmlFor="title" className="label">Title</label>
            <input id="title" className="field" value={form.title} onChange={set("title")} />
          </div>
          <div>
            <label htmlFor="full_name" className="label">Full name</label>
            <input id="full_name" required className="field" value={form.full_name} onChange={set("full_name")} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="party" className="label">Party (if any)</label>
            <input id="party" className="field" value={form.party} onChange={set("party")} />
          </div>
          <div>
            <label htmlFor="phone" className="label">Public phone (optional)</label>
            <input id="phone" type="tel" className="field" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label htmlFor="pemail" className="label">Public email (optional)</label>
            <input id="pemail" type="email" className="field" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label htmlFor="office" className="label">Office address (optional)</label>
            <input id="office" className="field" value={form.office_address} onChange={set("office_address")} />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="bio" className="label">Short bio</label>
          <textarea id="bio" rows={3} className="field" value={form.bio} onChange={set("bio")} maxLength={600} />
        </div>
        <div className="mt-4">
          <label htmlFor="photo" className="label">Profile photo</label>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
      </fieldset>

      <fieldset className="card m-0 p-[22px]">
        <legend className="px-1.5 font-display text-lg font-bold">Your role</legend>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 ${has(r.id) ? "border-gh-green bg-[#EEF7F1]" : "border-line bg-white"}`}>
              <input type="checkbox" checked={has(r.id)} onChange={() => toggle(r.id)} className="mt-0.5 h-5 w-5 accent-gh-green" />
              <span>
                <span className="block text-[15px] font-semibold">{r.name}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="card m-0 p-[22px]">
        <legend className="px-1.5 font-display text-lg font-bold">Area you serve</legend>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          <div>
            <label htmlFor="reg" className="label">Region</label>
            <select id="reg" className="field" value={form.region_id} onChange={(e) => setForm((f) => ({ ...f, region_id: e.target.value, district_id: "" }))}>
              <option value="">Select…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {needsDistrict ? (
            <div>
              <label htmlFor="dis" className="label">District, municipal or metropolitan assembly</label>
              <select id="dis" className="field" value={form.district_id} onChange={set("district_id")} disabled={!form.region_id}>
                <option value="">{form.region_id ? "Select…" : "Choose a region first"}</option>
                {regionDistricts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {has("mp") ? (
            <div>
              <label htmlFor="con" className="label">Constituency</label>
              <input id="con" className="field" value={form.constituency} onChange={set("constituency")} placeholder="e.g. Ejisu" />
            </div>
          ) : null}
          {has("assembly_member") ? (
            <div>
              <label htmlFor="ea" className="label">Electoral area</label>
              <input id="ea" className="field" value={form.electoral_area} onChange={set("electoral_area")} />
            </div>
          ) : null}
          {has("minister") || has("deputy_minister") ? (
            <div>
              <label htmlFor="min" className="label">Ministry</label>
              <input id="min" className="field" value={form.ministry} onChange={set("ministry")} placeholder="e.g. Education" />
            </div>
          ) : null}
          <div>
            <label htmlFor="term" className="label">Term started</label>
            <input id="term" type="month" className="field" value={form.term_start} onChange={set("term_start")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="card m-0 p-[22px]">
        <legend className="px-1.5 font-display text-lg font-bold">Proof of office</legend>
        <p className="mt-1 text-sm leading-normal text-muted">
          Upload your EC declaration of results, gazette notice or appointment letter. Only our verification team can see these.
        </p>
        <input
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setDocs(Array.from(e.target.files ?? []))}
          className="mt-3.5 block w-full rounded-xl border-2 border-dashed border-[#B5BDB9] p-5 text-sm"
          aria-label="Proof of office files"
        />
        {docs.length ? <p className="mt-2 text-sm text-done">{docs.length} file(s) ready to upload</p> : null}
      </fieldset>

      {err ? <p role="alert" className="rounded-lg bg-stall-bg p-3 text-sm text-stall">{err}</p> : null}
      <div className="flex justify-end">
        <button className="btn btn-primary h-12 px-6" disabled={busy}>
          {busy ? "Saving…" : existing ? "Save changes" : "Submit for verification"}
        </button>
      </div>
    </form>
  );
}
