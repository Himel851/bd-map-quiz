import Image from "next/image";
import Link from "next/link";

export function FullMapViewer() {
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
          Bangladesh Full Map
        </h1>
        <Link
          href="/"
          className="rounded-lg border border-cyan-200/30 bg-slate-900/55 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
        >
          Back to Quiz
        </Link>
      </div>

      <div className="">
        <Image
          src="/images/map-view.png"
          alt="Bangladesh map view"
          width={800}
          height={900}
          className="h-auto w-full rounded-xl bg-slate-200"
          priority
        />
      </div>
    </div>
  );
}
