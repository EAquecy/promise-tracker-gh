import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[560px] px-6 py-20 text-center">
      <h1 className="font-display text-4xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-muted">That page doesn&apos;t exist or isn&apos;t public yet.</p>
      <Link href="/" className="btn btn-primary mt-6">Go home</Link>
    </main>
  );
}
