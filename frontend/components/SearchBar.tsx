"use client";

import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type ActorStatus, type SearchResult } from "@/lib/api";

const statusStyles: Record<ActorStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  rebranded: "bg-amber-100 text-amber-800",
  inactive: "bg-zinc-200 text-zinc-700",
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults([]);
      setError(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(false);

      try {
        const response = await api.search(normalizedQuery);
        if (!cancelled) {
          setResults(response.results);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  return (
    <div className="w-full">
      <label className="sr-only" htmlFor="actor-search">
        Search actors
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
        />
        <input
          id="actor-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a handle, PGP fingerprint, or wallet"
          className="w-full rounded-lg border border-zinc-300 bg-white py-3 pl-11 pr-11 text-zinc-950 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-200"
        />
        {isLoading && (
          <LoaderCircle
            aria-label="Searching"
            className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-sky-700"
          />
        )}
      </div>

      {normalizedQuery.length > 0 && normalizedQuery.length < 2 && (
        <p className="mt-3 text-sm text-zinc-500">Enter at least 2 characters to search.</p>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          Search is unavailable. Check that the API is running and try again.
        </p>
      )}

      {!isLoading && !error && normalizedQuery.length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-zinc-600">No matches found.</p>
      )}

      {results.length > 0 && !error && (
        <ul className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-200">
          {results.map((result) => (
            <li key={result.id}>
              <Link
                href={`/actors/${result.id}`}
                className="block p-4 transition hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-950">{result.primary_handle}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">
                        {result.category}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${statusStyles[result.status]}`}>
                        {result.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-zinc-700">
                    Rebrand Confidence: {Math.round(result.confidence * 100)}%
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
