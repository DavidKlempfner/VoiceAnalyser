import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <Link href="/" className="inline-block font-medium text-violet-600 hover:underline dark:text-violet-400">← Home</Link>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400">We couldn&apos;t find that page.</p>
    </main>
  );
}
