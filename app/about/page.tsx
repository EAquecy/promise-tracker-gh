import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "About and moderation" };

export default function About() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-[760px] px-6 pb-10 pt-10">
        <h1 className="font-display text-[34px] font-extrabold">About Promise Tracker GH</h1>
        <div className="mt-5 flex flex-col gap-4 text-[17px] leading-relaxed">
          <p>
            Promise Tracker GH is an independent, non partisan record of what Ghana&apos;s elected and appointed officials promised and what they
            delivered. Every promise carries its source. Every update carries evidence. Residents confirm or dispute what they see.
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold">How officials are verified</h2>
          <p>
            Officials sign up and upload proof of office, such as the Electoral Commission declaration of results, a gazette notice or an appointment
            letter. Our team checks it before the profile goes live. New promises added by officials are checked against a manifesto or recording.
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold">Evidence</h2>
          <p>
            Photos taken with the in app camera carry the time and the device location. Photos uploaded from a gallery are marked as not verified. Posts
            cannot be deleted, only corrected.
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold">Comments and moderation</h2>
          <p>
            Disagree with the evidence, not the person. Insults, tribal or party attacks, threats and false claims about private people are removed.
            Officials can reply officially to any comment on their posts.
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold">Your privacy</h2>
          <p>
            We use your location only to match your area. Your exact position is never stored. You can choose your area by hand instead.
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold">Data</h2>
          <p>
            District and region boundaries come from geoBoundaries (CC BY 4.0). Map tiles © OpenStreetMap contributors and CARTO. Profiles marked
            &quot;Demo&quot; contain sample data for testing and do not describe real people.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
