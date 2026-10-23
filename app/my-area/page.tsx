import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getUser } from "@/lib/supabase/server";
import { MyAreaClient } from "./MyAreaClient";

export const metadata = { title: "My area" };

export default async function MyAreaPage() {
  const { supabase, user } = await getUser();
  const [{ data: districts }, profile] = await Promise.all([
    supabase.from("districts").select("id, name, region_id, regions(name)").order("name"),
    user ? supabase.from("profiles").select("home_district_id").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <Header />
      <MyAreaClient
        districts={(districts ?? []) as unknown as { id: number; name: string; region_id: number; regions: { name: string } }[]}
        userId={user?.id ?? null}
        savedDistrict={(profile.data as { home_district_id: number | null } | null)?.home_district_id ?? null}
      />
      <Footer />
    </>
  );
}
