"use client";

import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type ActorStatus, type SearchResult } from "@/lib/api";

const statusStyles: Record<ActorStatus, string> = {
  active: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
  rebranded: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  inactive: "bg-neutral-100 text-neutral-500 border border-neutral-300",
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
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-neutral-500"
        />
        <input
          id="actor-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a handle, PGP fingerprint, or wallet"
          className="w-full rounded-none border border-neutral-300 bg-white py-3.5 pl-11 pr-11 text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
        {isLoading && (
          <LoaderCircle
            aria-label="Searching"
            className="absolute right-3.5 top-1/2 size-5 -translate-y-1/2 animate-spin text-blue-700"
          />
        )}
      </div>

      {normalizedQuery.length > 0 && normalizedQuery.length < 2 && (
        <p className="mt-3 text-xs text-neutral-500">Enter at least 2 characters to search.</p>
      )}

      {error && (
        <p className="mt-3 rounded-none border border-red-500/30 bg-red-50/30 p-3 text-sm text-red-600" role="alert">
          Search is unavailable. Check that the API is running and try again.
        </p>
      )}

      {!isLoading && !error && normalizedQuery.length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">No matches found.</p>
      )}

      {results.length > 0 && !error && (
        <ul className="mt-4 overflow-hidden rounded-none border border-neutral-200 bg-white divide-y divide-neutral-200">
          {results.map((result) => (
            <li key={result.id}>
              <Link
                href={`/actors/${result.id}`}
                className="block p-4 transition hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{result.primary_handle}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-none bg-blue-600/10 border border-blue-600/20 px-2.5 py-0.5 text-blue-700">
                        {result.category}
                      </span>
                      <span className={`rounded-none px-2.5 py-0.5 capitalize ${statusStyles[result.status]}`}>
                        {result.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-blue-700">
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
