import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { ExploreClient, type DistrictStat } from "./ExploreClient";

export const metadata = { title: "Explore Ghana" };
export const revalidate = 120;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string; d?: string }> }) {
  const { q = "", d = "" } = await searchParams;
  const supabase = await createClient();
  const [{ data: stats }, { data: regions }] = await Promise.all([
    supabase.from("district_stats").select("district_id, name, kind, region_id, officials, promises, completed, kept_pct").order("name"),
    supabase.from("regions").select("id, name").order("name"),
  ]);
  return (
    <>
      <Header />
      <ExploreClient
        stats={(stats ?? []) as DistrictStat[]}
        regions={(regions ?? []) as { id: number; name: string }[]}
        initialQuery={q}
        initialDistrict={d ? Number(d) : null}
      />
      <Footer />
    </>
  );
}
