import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full flex flex-1 flex-col bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-stone-200 bg-white/90 p-8 text-center shadow-lg dark:border-stone-700 dark:bg-stone-900/90">
          <p className="text-base font-bold text-stone-600 dark:text-stone-300">
            Bangladesh Map Quiz
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Home
          </h1>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Quiz now runs on a dedicated page.
          </p>
          <Link
            href="/quiz"
            className="mt-6 inline-flex rounded-xl bg-stone-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Start Quiz
          </Link>
        </div>
      </main>
    </div>
  );
}
