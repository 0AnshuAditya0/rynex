"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type WatchlistResponse } from "@/lib/api";
import AbstractBg from "@/components/AbstractBg";

export default function WatchlistPage() {
  const [threshold, setThreshold] = useState(0.7);
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      api.getWatchlist(threshold).then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      }).catch(() => {
        if (!cancelled) setError("Failed to load watchlist.");
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [threshold]);

  return (
    <main className="relative mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
      <AbstractBg />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Monitoring</p>
      <h1 className="mt-1 text-3xl font-bold text-neutral-900">High-Confidence Watchlist</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Static threshold view — not a live alerting system.
      </p>

      <section className="mt-6 rounded-none border border-neutral-200 bg-white p-6">
        <label htmlFor="min-confidence" className="block text-xs font-medium text-neutral-500">
          Minimum confidence: <span className="font-bold text-blue-700">{Math.round(threshold * 100)}%</span>
        </label>
        <input
          id="min-confidence"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-3 w-full accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </section>

      <section className="mt-6 rounded-none border border-neutral-200 bg-white p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && !data && <p className="text-sm text-neutral-500">Loading…</p>}
        {data && (
          <>
            <p className="text-xs text-neutral-500">
              {data.total} actor{data.total === 1 ? "" : "s"} at ≥ {Math.round(data.min_confidence * 100)}%
            </p>
            {data.items.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No actors meet this threshold.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-neutral-600">
                  <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="px-3 py-2">Handle</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {data.items.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-100">
                        <td className="px-3 py-2 font-medium text-neutral-900">
                          <Link href={`/actors/${item.id}`} className="text-blue-700 hover:underline">
                            {item.primary_handle}
                          </Link>
                        </td>
                        <td className="px-3 py-2 capitalize">{item.category}</td>
                        <td className="px-3 py-2 capitalize">{item.status}</td>
                        <td className="px-3 py-2 text-right font-bold text-blue-700">
                          {Math.round(item.confidence * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
