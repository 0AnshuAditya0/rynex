import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-slate-800 bg-[#121827]/80 p-8 shadow-lg sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Threat actor attribution</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">Rynex</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-400">
          Dark-web threat actor attribution PoC.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/overview"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-6 py-3 text-base font-medium text-slate-950 transition hover:bg-sky-400 shadow-sm"
          >
            Dashboard Overview
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 px-6 py-3 text-base font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Search Actors
          </Link>
        </div>

        <div className="mt-12 border-t border-slate-800/80 pt-8">
          <h2 className="text-xl font-semibold text-slate-200">How it works</h2>
          <ul className="mt-4 space-y-3 text-base text-slate-400">
            <li>• <strong className="text-slate-200">Entity resolution</strong> links handles, PGP keys, wallets, and aliases into a single actor identity.</li>
            <li>• <strong className="text-slate-200">Stylometry</strong> compares language patterns across posts to detect persistent author traits.</li>
            <li>• <strong className="text-slate-200">Infrastructure correlation</strong> groups related domains, wallets, and communication channels.</li>
            <li>• <strong className="text-slate-200">Confidence scoring</strong> combines each signal into a ranked attribution confidence for each actor.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
