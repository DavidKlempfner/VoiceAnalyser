import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">Voice Analyser</p>
        <h1 className="text-4xl font-bold">Find your voice. Have some fun.</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Choose an experience. Your recordings stay on your device.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/masculinity" className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-bold">How masculine is your voice?</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Explore your pitch and vocal brightness.</p>
          <span className="mt-6 inline-block font-medium text-violet-600 dark:text-violet-400">Start analysing →</span>
        </Link>
        <Link href="/mimic" className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-bold">Let&apos;s mimic some celebrities!</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Listen, record an impression, and compare.</p>
          <span className="mt-6 inline-block font-medium text-violet-600 dark:text-violet-400">Choose a celebrity →</span>
        </Link>
      </div>
    </main>
  );
}
