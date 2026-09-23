import SearchBar from "@/components/SearchBar";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#0a0e17] px-4 py-12 text-slate-100 sm:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">Rynex Intelligence</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">Actor Search</h1>
        <p className="mt-2 text-slate-400">
          Search the structured actor dataset by handle, PGP fingerprint, or wallet.
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>
      </section>
    </main>
  );
}
