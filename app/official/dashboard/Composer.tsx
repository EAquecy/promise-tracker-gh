"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STATUS } from "@/lib/format";
import type { PromiseStatus } from "@/lib/types";

type P = { id: string; title: string; status: PromiseStatus; progress: number; approved: boolean };
type Shot = { file: File; inApp: boolean; lat: number | null; lng: number | null; at: string; preview: string };
type Kind = "update" | "petition" | "promise";

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}

export function Composer({ officialId, userId, promises }: { officialId: string; userId: string; promises: P[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("update");
  const [promiseId, setPromiseId] = useState(promises[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState<number | "">("");
  const [status, setStatus] = useState<PromiseStatus | "">("");
  const [petitionTo, setPetitionTo] = useState("");
  const [petitionRef, setPetitionRef] = useState("");
  const [category, setCategory] = useState("Education");
  const [sourceType, setSourceType] = useState("manifesto");
  const [sourceNote, setSourceNote] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const selected = promises.find((p) => p.id === promiseId);

  async function addPhotos(files: FileList | null, inApp: boolean) {
    if (!files?.length) return;
    const pos = inApp ? await getPosition() : null;
    const at = new Date().toISOString();
    setShots((s) => [
      ...s,
      ...Array.from(files).map((file) => ({ file, inApp: inApp && !!pos, lat: pos?.coords.latitude ?? null, lng: pos?.coords.longitude ?? null, at, preview: URL.createObjectURL(file) })),
    ]);
  }

  function reset() {
    setTitle(""); setBody(""); setStage(""); setProgress(""); setStatus(""); setPetitionTo(""); setPetitionRef(""); setSourceNote(""); setPlaceName(""); setShots([]); setDocs([]);
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (kind === "promise") {
        const { error } = await supabase.from("promises").insert({
          official_id: officialId, title: title.trim(), description: body.trim() || null, category, source_type: sourceType, source_note: sourceNote.trim() || null, approved: false,
        });
        if (error) throw error;
        setMsg({ ok: true, text: "Sent for checking. It will appear on your profile once our team confirms the source." });
      } else {
        const located = shots.find((s) => s.lat != null);
        const pos = located ? null : await getPosition();
        const { data: post, error } = await supabase
          .from("posts")
          .insert({
            official_id: officialId,
            author_id: userId,
            kind,
            promise_id: kind === "update" ? promiseId || null : null,
            title: title.trim(),
            body: body.trim() || null,
            stage: kind === "update" ? stage.trim() || null : null,
            petition_to: kind === "petition" ? petitionTo.trim() : null,
            petition_ref: kind === "petition" ? petitionRef.trim() || null : null,
            petition_status: kind === "petition" ? "submitted" : null,
            place_name: placeName.trim() || null,
            lat: located?.lat ?? pos?.coords.latitude ?? null,
            lng: located?.lng ?? pos?.coords.longitude ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        const files: { file: File; kind: "photo" | "document"; s?: Shot }[] = [
          ...shots.map((s) => ({ file: s.file, kind: "photo" as const, s })),
          ...docs.map((f) => ({ file: f, kind: "document" as const })),
        ];
        for (const f of files) {
          const ext = f.file.name.split(".").pop()?.toLowerCase() || (f.kind === "photo" ? "jpg" : "pdf");
          const path = `${officialId}/${post.id}/${crypto.randomUUID()}.${ext}`;
          const up = await supabase.storage.from("evidence").upload(path, f.file, { contentType: f.file.type || undefined });
          if (up.error) throw up.error;
          const { error: mErr } = await supabase.from("post_media").insert({
            post_id: post.id, path, kind: f.kind, captured_in_app: f.s?.inApp ?? false, lat: f.s?.lat ?? null, lng: f.s?.lng ?? null, taken_at: f.s?.at ?? null,
          });
          if (mErr) throw mErr;
        }
        if (kind === "update" && promiseId && (progress !== "" || status)) {
          const patch: Record<string, unknown> = {};
          if (progress !== "") patch.progress = progress;
          if (status) patch.status = status;
          await supabase.from("promises").update(patch).eq("id", promiseId);
        }
        setMsg({ ok: true, text: kind === "petition" ? "Petition published on your profile." : "Update published. Residents can now confirm or dispute it." });
      }
      reset();
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: "Could not publish: " + (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Kind; label: string }[] = [
    { id: "update", label: "Project update" },
    { id: "petition", label: "Petition" },
    { id: "promise", label: "New promise" },
  ];

  return (
    <form onSubmit={publish}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-bold">Post to your profile</h2>
        <div role="tablist" aria-label="Post type" className="flex flex-wrap gap-1.5 rounded-xl bg-ground p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={kind === t.id}
              onClick={() => setKind(t.id)}
              className={`h-10 rounded-[9px] px-4 text-sm font-semibold ${kind === t.id ? "bg-white text-gh-green shadow-sm" : "text-[#3E4A44]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {kind === "update" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            <div>
              <label htmlFor="prom" className="label">Which promise is this about?</label>
              <select id="prom" className="field" value={promiseId} onChange={(e) => setPromiseId(e.target.value)}>
                <option value="">General update (no promise)</option>
                {promises.filter((p) => p.approved).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stage" className="label">Stage</label>
              <input id="stage" className="field" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. Roofing" />
            </div>
            {promiseId ? (
              <>
                <div>
                  <label htmlFor="prog" className="label">Progress now ({selected?.progress ?? 0}% before)</label>
                  <input id="prog" type="number" min={0} max={100} className="field" value={progress} onChange={(e) => setProgress(e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))))} />
                </div>
                <div>
                  <label htmlFor="st" className="label">Status</label>
                  <select id="st" className="field" value={status} onChange={(e) => setStatus(e.target.value as PromiseStatus | "")}>
                    <option value="">Keep as {selected ? STATUS[selected.status].label : ""}</option>
                    {(Object.keys(STATUS) as PromiseStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS[s].label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {kind === "petition" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            <div>
              <label htmlFor="to" className="label">Submitted to</label>
              <input id="to" required className="field" value={petitionTo} onChange={(e) => setPetitionTo(e.target.value)} placeholder="e.g. Ministry of Roads and Highways" />
            </div>
            <div>
              <label htmlFor="ref" className="label">Reference number (optional)</label>
              <input id="ref" className="field" value={petitionRef} onChange={(e) => setPetitionRef(e.target.value)} />
            </div>
          </div>
        ) : null}

        {kind === "promise" ? (
          <>
            <div className="rounded-[10px] border border-[#F0DC8A] bg-[#FFF8DA] p-3.5 text-sm leading-normal text-[#4A3A00]">
              New promises are checked against your manifesto or a recording before they go live, so residents can trust the list.
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              <div>
                <label htmlFor="cat" className="label">Category</label>
                <select id="cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["Education", "Health", "Roads", "Water", "Energy", "Jobs", "Markets", "Agriculture", "Security", "Sanitation", "Other"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="src" className="label">Where you promised it</label>
                <select id="src" className="field" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                  <option value="manifesto">Manifesto</option>
                  <option value="rally">Campaign rally</option>
                  <option value="interview">Interview</option>
                  <option value="social">Social media</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="srcn" className="label">Source details</label>
                <input id="srcn" className="field" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} placeholder="e.g. 2024 manifesto, page 9" />
              </div>
            </div>
          </>
        ) : null}

        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" required maxLength={160} className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="body" className="label">{kind === "promise" ? "What exactly did you promise?" : kind === "petition" ? "What are you asking for?" : "What happened?"}</label>
          <textarea id="body" rows={4} className="field" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Plain words residents will understand." />
        </div>

        {kind !== "promise" ? (
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-[2_1_320px]">
              <div className="label">{kind === "petition" ? "Petition letter and supporting photos" : "Photos"}</div>
              <div className="grid grid-cols-4 gap-2">
                {shots.map((s, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-[10px] bg-[#DCE3DF]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.preview} alt="" className="h-full w-full object-cover" />
                    <span className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${s.inApp ? "bg-done-bg text-done" : "bg-stall-bg text-stall"}`}>
                      {s.inApp ? "GPS ✓" : "Gallery"}
                    </span>
                    <button type="button" aria-label="Remove photo" onClick={() => setShots((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 h-7 w-7 rounded-full bg-white/90 text-sm font-bold">×</button>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => camRef.current?.click()}>Take photo</button>
                <button type="button" className="btn btn-ghost" onClick={() => galRef.current?.click()}>Upload from gallery</button>
                <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addPhotos(e.target.files, true); e.target.value = ""; }} />
                <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files, false); e.target.value = ""; }} />
              </div>
              <p className="mt-2 text-[13px] text-muted">Photos taken here are stamped with time and location. Gallery uploads are marked &quot;not verified&quot;.</p>
              {kind === "petition" ? (
                <div className="mt-3">
                  <label htmlFor="pdocs" className="label">Petition letter (PDF)</label>
                  <input id="pdocs" type="file" accept="application/pdf" multiple onChange={(e) => setDocs(Array.from(e.target.files ?? []))} className="text-sm" />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-[1_1_220px]">
              <label htmlFor="place" className="label">Place name</label>
              <input id="place" className="field" value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="e.g. Abenase" />
              <p className="mt-2 text-[13px] text-muted">Your device location is attached when you publish, if you allow it.</p>
            </div>
          </div>
        ) : null}

        {msg ? (
          <p role="status" className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-done-bg text-done" : "bg-stall-bg text-stall"}`}>{msg.text}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E1E6E3] pt-4">
          <span className="text-sm text-muted">Posts are public and can&apos;t be deleted, only corrected.</span>
          <button className="btn btn-primary h-12 px-6" disabled={busy || !title.trim()}>
            {busy ? "Publishing…" : kind === "petition" ? "Publish petition" : kind === "promise" ? "Send for checking" : "Publish update"}
          </button>
        </div>
      </div>
    </form>
  );
}
