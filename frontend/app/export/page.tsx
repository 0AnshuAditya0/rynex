"use client";

import { useEffect, useState } from "react";

import ExportButton from "@/components/ExportButton";
import { api, type ActorSummary } from "@/lib/api";

const categoryOptions = [
  "all",
  "drugs",
  "arms",
  "stolen-data",
  "hacking-services",
  "money-laundering",
  "terror-financing",
];

export default function ExportPage() {
  const [category, setCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [items, setItems] = useState<ActorSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.listActors({
          category: category === "all" ? undefined : category,
          first_seen_after: startDate ? `${startDate}T00:00:00` : undefined,
          first_seen_before: endDate ? `${endDate}T23:59:59` : undefined,
          limit: 10,
          offset: 0,
        });

        if (!cancelled) {
          setItems(response.items);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load export preview.");
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [category, startDate, endDate]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-slate-800 bg-[#121827] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Data Export</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">Export Actor Records</h1>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between flex-wrap">
            <div className="w-full max-w-xs">
              <label htmlFor="category-filter" className="mb-2 block text-xs font-medium text-slate-400">
                Category
              </label>
              <select
                id="category-filter"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All categories" : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label htmlFor="start-date" className="mb-2 block text-xs font-medium text-slate-400">
                  From (First Seen)
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="mb-2 block text-xs font-medium text-slate-400">
                  To (First Seen)
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <ExportButton category={category === "all" ? undefined : category} />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-200">Preview</h2>
              <span className="text-xs text-slate-400">First {items.length} rows</span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading preview…</p>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400">No actors found for these criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Handle</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">First Seen</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-3 py-2.5 font-medium text-slate-100">{item.primary_handle}</td>
                        <td className="px-3 py-2.5 capitalize">{item.category}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{item.first_seen ? item.first_seen.split("T")[0] : "-"}</td>
                        <td className="px-3 py-2.5 capitalize">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : item.status === "rebranded"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-sky-400">{Math.round(item.confidence * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
