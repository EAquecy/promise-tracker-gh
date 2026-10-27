import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getUser } from "@/lib/supabase/server";
import { ExploreClient, type DistrictStat } from "./ExploreClient";

export const metadata = { title: "Explore Ghana" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string; d?: string }> }) {
  const { q = "", d = "" } = await searchParams;
  const { supabase, user } = await getUser();
  const [{ data: stats }, { data: regions }, profileRes] = await Promise.all([
    supabase.from("district_stats").select("district_id, name, kind, region_id, officials, promises, completed, kept_pct").order("name"),
    supabase.from("regions").select("id, name").order("name"),
    user ? supabase.from("profiles").select("last_district_id").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const lastDistrict = (profileRes.data as { last_district_id: number | null } | null)?.last_district_id ?? null;
  return (
    <>
      <Header />
      <ExploreClient
        stats={(stats ?? []) as DistrictStat[]}
        regions={(regions ?? []) as { id: number; name: string }[]}
        initialQuery={q}
        initialDistrict={d ? Number(d) : null}
        knownHome={lastDistrict}
      />
      <Footer />
    </>
  );
}
