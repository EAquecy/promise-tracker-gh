import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { FlagStripe, StarMark } from "./ui";
import { LocationPrompt } from "./LocationPrompt";

export async function Header({ variant = "light" }: { variant?: "light" | "dark" | "official" }) {
  const { supabase, user } = await getUser();
  let official: { id: string } | null = null;
  if (user) {
    const { data } = await supabase.from("officials").select("id").eq("user_id", user.id).maybeSingle();
    official = data;
  }
  const dark = variant !== "light";
  const linkCls = dark ? "text-[#D5E4DB] hover:text-white" : "text-[#3E4A44] hover:text-ink";
  return (
    <>
      <header className={dark ? "bg-gh-green-dark" : "border-b border-line bg-white"} style={variant === "official" ? { background: "#13201A" } : undefined}>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-7 gap-y-3 px-6 py-3.5">
          <Link href="/" className={`flex items-center gap-2.5 no-underline ${dark ? "text-white hover:text-white" : "text-ink hover:text-ink"}`}>
            <StarMark />
            <span className="font-display text-[19px] font-extrabold">Promise Tracker GH</span>
            {variant === "official" && (
              <span className="rounded-full bg-gh-gold px-2.5 py-1 text-xs font-semibold text-ink">For officials</span>
            )}
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-medium">
            <Link href="/my-area" className={`no-underline ${linkCls}`}>My area</Link>
            <Link href="/explore" className={`no-underline ${linkCls}`}>Explore Ghana</Link>
            <Link href="/officials" className={`no-underline ${linkCls}`}>Officials</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {official ? (
              <Link href="/official/dashboard" className={dark ? "btn btn-gold" : "btn btn-ghost"}>Dashboard</Link>
            ) : null}
            {user ? (
              <form action="/auth/signout" method="post">
                <button className={`text-sm font-semibold ${dark ? "text-[#D5E4DB]" : "text-muted"}`} type="submit">Sign out</button>
              </form>
            ) : (
              <Link href="/login" className={dark ? "btn btn-gold" : "btn btn-ghost"} style={{ borderRadius: 22 }}>Sign in</Link>
            )}
          </div>
        </div>
      </header>
      <FlagStripe />
      <LocationPrompt />
    </>
  );
}
