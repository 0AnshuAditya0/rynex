import SearchBar from "@/components/SearchBar";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-950 sm:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Rynex</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Actor search</h1>
        <p className="mt-2 text-zinc-600">
          Search the structured actor dataset by handle, PGP fingerprint, or wallet.
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>
      </section>
    </main>
  );
}
