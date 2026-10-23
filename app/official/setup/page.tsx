import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getUser } from "@/lib/supabase/server";
import { OFFICIAL_SELECT } from "@/lib/data";
import type { District, Official, Region } from "@/lib/types";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Official setup" };

export default async function SetupPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/official/login");
  const [{ data: official }, { data: regions }, { data: districts }] = await Promise.all([
    supabase.from("officials").select(OFFICIAL_SELECT).eq("user_id", user.id).maybeSingle(),
    supabase.from("regions").select("id, name").order("name"),
    supabase.from("districts").select("id, name, kind, region_id").order("name"),
  ]);
  const o = official as Official | null;
  if (o?.status === "verified") redirect("/official/dashboard");
  return (
    <>
      <Header variant="official" />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-8">
        <ol aria-label="Setup steps" className="flex flex-wrap gap-x-7 gap-y-2.5 text-sm">
          <li className="flex items-center gap-2 font-semibold text-done"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#1B7A4B] text-[13px] text-white">✓</span>Signed in</li>
          <li aria-current="step" className="flex items-center gap-2 font-bold"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-gh-green text-[13px] text-gh-green">2</span>Profile, role and area</li>
          <li className="flex items-center gap-2 text-muted"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#B5BDB9] text-[13px]">3</span>Verification</li>
        </ol>
        <h1 className="mt-6 font-display text-[34px] font-extrabold">{o ? "Your submission" : "Set up your official profile"}</h1>
        <p className="mt-2 text-base text-muted">
          {o ? "We are checking your details. You can still correct them below." : "Residents in your area will see you first when they open the app. Pick every role that applies."}
        </p>
        <SetupForm
          userId={user.id}
          email={user.email ?? ""}
          existing={o}
          regions={(regions ?? []) as Region[]}
          districts={(districts ?? []) as District[]}
        />
      </main>
    </>
  );
}
