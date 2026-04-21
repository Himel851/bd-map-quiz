import Link from "next/link";

export default function Home() {
  return (
    <div className="animated-quiz-bg min-h-full flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl border border-cyan-300/30 bg-white/10 p-8 text-center shadow-[0_0_40px_rgba(56,189,248,0.15)] backdrop-blur-xl md:p-12">
          <p className="text-base font-bold text-cyan-200/90">
            Bangladesh Map Quiz
          </p>
          <h1 className="mt-3 bg-linear-to-r from-cyan-200 via-sky-100 to-emerald-200 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            Home
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-sky-100/80 md:text-base">
            Quiz now runs on a dedicated page.
          </p>
          <Link
            href="/quiz"
            className="mt-8 inline-flex rounded-xl bg-linear-to-r from-cyan-400 to-emerald-400 px-7 py-3 text-base font-semibold text-slate-950 transition hover:brightness-110"
          >
            Start Quiz
          </Link>
        </div>
      </main>
    </div>
  );
}
