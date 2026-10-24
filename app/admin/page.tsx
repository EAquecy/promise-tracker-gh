import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Header } from "@/components/Header";
import { Empty } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";
import { OFFICIAL_SELECT } from "@/lib/data";
import { fmtDate, officialName } from "@/lib/format";
import type { Official, PromiseRow } from "@/lib/types";

export const metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/admin");
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) redirect("/");
  return supabase;
}

async function setOfficialStatus(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["verified", "rejected", "pending"].includes(status)) return;
  await supabase.from("officials").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

async function claimProfile(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();
  const pending = String(formData.get("pending"));
  const target = String(formData.get("target"));
  if (!target) return;
  await supabase.rpc("admin_claim_profile", { pending_id: pending, target_id: target });
  revalidatePath("/admin");
}

async function setCorrection(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();
  const status = String(formData.get("status"));
  if (!["fixed", "dismissed"].includes(status)) return;
  await supabase.from("corrections").update({ status }).eq("id", String(formData.get("id")));
  revalidatePath("/admin");
}

async function setPromiseApproval(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const approve = formData.get("approve") === "1";
  if (approve) await supabase.from("promises").update({ approved: true }).eq("id", id);
  else await supabase.from("promises").delete().eq("id", id);
  revalidatePath("/admin");
}

export default async function AdminPage() {
  const supabase = await requireAdmin();
  const [{ data: pending }, { data: promises }, { data: unclaimed }, { data: corrections }] = await Promise.all([
    supabase.from("officials").select(OFFICIAL_SELECT + ", official_documents(*)").eq("status", "pending").order("created_at"),
    supabase.from("promises").select("*, officials(title, full_name)").eq("approved", false).order("created_at"),
    supabase.from("officials").select("id, full_name, official_roles(label)").eq("is_public_record", true).is("user_id", null).order("full_name"),
    supabase.from("corrections").select("*, promises(id, title), officials(id, title, full_name)").eq("status", "open").order("created_at"),
  ]);
  type Unclaimed = { id: string; full_name: string; official_roles: { label: string | null }[] };
  type Corr = { id: string; body: string; link: string | null; created_at: string; promises: { id: string; title: string } | null; officials: { id: string; title: string | null; full_name: string } | null };
  const unclaimedList = (unclaimed ?? []) as Unclaimed[];
  const corr = (corrections ?? []) as Corr[];
  const officials = (pending ?? []) as unknown as (Official & { official_documents: { id: number; path: string; label: string | null }[] })[];
  const docLinks: Record<string, string> = {};
  for (const o of officials) {
    for (const d of o.official_documents) {
      const { data } = await supabase.storage.from("official-docs").createSignedUrl(d.path, 3600);
      if (data?.signedUrl) docLinks[d.path] = data.signedUrl;
    }
  }
  const pend = (promises ?? []) as (PromiseRow & { officials: { title: string | null; full_name: string } })[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1000px] px-6 pb-16 pt-8">
        <h1 className="font-display text-[32px] font-extrabold">Verification queue</h1>

        <section className="mt-6">
          <h2 className="font-display text-[22px] font-bold">Officials waiting ({officials.length})</h2>
          <div className="mt-4 flex flex-col gap-4">
            {officials.map((o) => (
              <article key={o.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{officialName(o)}</div>
                    <div className="text-sm text-muted">Submitted {fmtDate(o.created_at)} · {o.email ?? "no public email"} · {o.phone ?? "no phone"}</div>
                  </div>
                  <div className="flex gap-2">
                    <form action={setOfficialStatus}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value="verified" />
                      <button className="btn btn-primary">Approve</button>
                    </form>
                    <form action={setOfficialStatus}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="btn btn-ghost">Reject</button>
                    </form>
                  </div>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5 text-[15px]">
                  {o.official_roles?.map((r) => (
                    <li key={r.id}>
                      {r.label} {r.districts?.name ? `· ${r.districts.name}` : ""} {r.regions?.name ? `· ${r.regions.name}` : ""}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.official_documents.map((d) =>
                    docLinks[d.path] ? (
                      <a key={d.id} href={docLinks[d.path]} target="_blank" rel="noreferrer" className="btn btn-ghost">{d.label ?? "Document"}</a>
                    ) : null
                  )}
                  {!o.official_documents.length ? <span className="text-sm text-stall">No documents uploaded</span> : null}
                </div>
                {unclaimedList.length ? (
                  <form action={claimProfile} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                    <input type="hidden" name="pending" value={o.id} />
                    <div className="min-w-0 flex-[1_1_320px]">
                      <label htmlFor={`t-${o.id}`} className="label">Already has a public record profile? Approve and link it</label>
                      <select id={`t-${o.id}`} name="target" className="field" defaultValue={unclaimedList.find((u) => u.full_name.toLowerCase() === o.full_name.toLowerCase())?.id ?? ""}>
                        <option value="">Choose profile…</option>
                        {unclaimedList.map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name} · {u.official_roles[0]?.label}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-dark">Approve and link</button>
                  </form>
                ) : null}
              </article>
            ))}
            {!officials.length ? <Empty>No officials waiting.</Empty> : null}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[22px] font-bold">Reported errors ({corr.length})</h2>
          <div className="mt-4 flex flex-col gap-3">
            {corr.map((c) => (
              <article key={c.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-[1_1_400px]">
                  <div className="text-sm text-muted">
                    {fmtDate(c.created_at)} ·{" "}
                    {c.promises ? <a href={`/promises/${c.promises.id}`}>{c.promises.title}</a> : c.officials ? <a href={`/officials/${c.officials.id}`}>{officialName(c.officials)}</a> : "General"}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[15px]">{c.body}</p>
                  {c.link ? <a href={c.link} target="_blank" rel="noreferrer" className="text-sm font-semibold">Evidence link</a> : null}
                </div>
                <div className="flex gap-2">
                  <form action={setCorrection}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="fixed" />
                    <button className="btn btn-primary">Mark fixed</button>
                  </form>
                  <form action={setCorrection}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <button className="btn btn-ghost">Dismiss</button>
                  </form>
                </div>
              </article>
            ))}
            {!corr.length ? <Empty>No open reports.</Empty> : null}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[22px] font-bold">Promises to check ({pend.length})</h2>
          <div className="mt-4 flex flex-col gap-3">
            {pend.map((p) => (
              <article key={p.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-[1_1_400px]">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-muted">{officialName(p.officials)} · {p.category} · {p.source_type}{p.source_note ? `: ${p.source_note}` : ""}</div>
                  {p.description ? <p className="mt-1.5 text-[15px]">{p.description}</p> : null}
                </div>
                <div className="flex gap-2">
                  <form action={setPromiseApproval}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="approve" value="1" />
                    <button className="btn btn-primary">Approve</button>
                  </form>
                  <form action={setPromiseApproval}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="approve" value="0" />
                    <button className="btn btn-ghost">Remove</button>
                  </form>
                </div>
              </article>
            ))}
            {!pend.length ? <Empty>No promises waiting.</Empty> : null}
          </div>
        </section>
      </main>
    </>
  );
}
