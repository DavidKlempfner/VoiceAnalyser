import Link from "next/link";
import CelebrityPortrait from "@/components/CelebrityPortrait";
import { celebrities } from "@/data/celebrities";

export default function MimicPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
      <Link href="/" className="inline-block font-medium text-violet-600 hover:underline dark:text-violet-400">← Home</Link>
      <header>
        <h1 className="text-3xl font-bold">Celebrity Voice Mimic Challenge</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Pick a voice, listen closely, and give it your best impression.</p>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {celebrities.map((celebrity) => (
          <Link key={celebrity.slug} href={`/mimic/${celebrity.slug}`} className="rounded-2xl border border-zinc-200 bg-white p-3 transition hover:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900">
            <CelebrityPortrait celebrity={celebrity} />
            <span className="mt-3 block font-semibold">{celebrity.name} →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
