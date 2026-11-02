import Link from "next/link";
import { FlagStripe } from "./ui";

export function Footer() {
  return (
    <footer className="mt-16">
      <FlagStripe />
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-6 py-8 text-sm">
          <span>Promise Tracker GH · Independent and non partisan</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link href="/about" className="text-white hover:text-white">About and moderation</Link>
            <Link href="/official/login" className="text-white hover:text-white">For officials</Link>
            <a href="https://www.geoboundaries.org" className="text-white hover:text-white">Boundaries: geoBoundaries (CC BY 4.0)</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
