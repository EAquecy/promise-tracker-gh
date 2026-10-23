import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/LoginForm";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Official sign in" };

export default async function OfficialLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await getUser();
  if (user) {
    const { data } = await supabase.from("officials").select("id").eq("user_id", user.id).maybeSingle();
    redirect(data ? "/official/dashboard" : "/official/setup");
  }
  return (
    <>
      <Header variant="official" />
      <main className="mx-auto flex max-w-[1200px] flex-wrap items-stretch gap-8 px-6 pb-16 pt-10">
        <section
          aria-label="About official accounts"
          className="flex min-h-[420px] min-w-0 flex-[999_1_480px] flex-col rounded-2xl bg-gh-green bg-cover bg-bottom p-9 text-white"
          style={{ backgroundImage: "url(/cover-parliament.svg)" }}
        >
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gh-gold">Official accounts</div>
          <h1 className="mt-2.5 max-w-[520px] font-display text-[36px] font-extrabold leading-[1.1] md:text-[40px]">
            Show your constituents the work, not just the words.
          </h1>
          <ul className="mt-5 flex max-w-[520px] flex-col gap-2.5 text-base">
            <li>Post project updates with GPS stamped photos</li>
            <li>Publish petitions you submit on behalf of your people</li>
            <li>Answer residents who confirm or dispute your updates</li>
          </ul>
        </section>
        <section aria-label="Sign in" className="card min-w-0 flex-[1_1_380px] p-8">
          <h2 className="font-display text-[26px] font-bold">Official sign in</h2>
          <p className="mt-2 text-[15px] leading-normal text-muted">
            For MPs, Ministers, MMDCEs and Assembly Members. New here? Use the same form: after signing in you&apos;ll set up your profile.
          </p>
          {error ? <p className="mt-4 rounded-lg bg-stall-bg p-3 text-sm text-stall">That sign in link has expired or was already used. Request a new one.</p> : null}
          <div className="mt-6">
            <LoginForm next="/official/dashboard" />
          </div>
          <div className="mt-6 border-t border-[#E1E6E3] pt-5 text-sm leading-normal text-muted">
            We confirm every official with the Electoral Commission, the Clerk to Parliament or the district assembly before a profile goes live.
          </div>
        </section>
      </main>
    </>
  );
}
