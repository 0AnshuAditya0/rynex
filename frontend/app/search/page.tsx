import SearchBar from "@/components/SearchBar";
import AbstractBg from "@/components/AbstractBg";

export default function SearchPage() {
  return (
    <main className="relative min-h-screen bg-[#fafafa] px-4 py-12 text-neutral-900 sm:px-6">
      <AbstractBg />
      <section className="relative mx-auto w-full max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Rynex Intelligence</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">Actor Search</h1>
        <p className="mt-2 text-neutral-500">
          Search the structured actor dataset by handle, PGP fingerprint, or wallet.
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>
      </section>
    </main>
  );
}
