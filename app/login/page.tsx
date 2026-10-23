import Link from "next/link";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/my-area", error } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/my-area";
  return (
    <>
      <Header />
      <main className="mx-auto max-w-[480px] px-6 py-12">
        <div className="card p-8">
          <h1 className="font-display text-[28px] font-extrabold">Sign in as a resident</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">Confirm or dispute evidence, comment, and follow your officials.</p>
          {error ? <p className="mt-4 rounded-lg bg-stall-bg p-3 text-sm text-stall">That sign in link has expired or was already used. Request a new one.</p> : null}
          <div className="mt-6">
            <LoginForm next={safeNext} askName />
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          Are you an MP, Minister, MMDCE or Assembly Member? <Link href="/official/login">Official sign in</Link>
        </p>
      </main>
    </>
  );
}
