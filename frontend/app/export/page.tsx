"use client";

import { useEffect, useState } from "react";

import ExportButton from "@/components/ExportButton";
import AbstractBg from "@/components/AbstractBg";
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
    <main className="relative mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <AbstractBg />
      <section className="relative rounded-none border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Data Export</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">Export Actor Records</h1>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between flex-wrap">
            <div className="w-full max-w-xs">
              <label htmlFor="category-filter" className="mb-2 block text-xs font-medium text-neutral-500">
                Category
              </label>
              <select
                id="category-filter"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                <label htmlFor="start-date" className="mb-2 block text-xs font-medium text-neutral-500">
                  From (First Seen)
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="mb-2 block text-xs font-medium text-neutral-500">
                  To (First Seen)
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <ExportButton category={category === "all" ? undefined : category} />
          </div>

          <div className="rounded-none border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-neutral-800">Preview</h2>
              <span className="text-xs text-neutral-500">First {items.length} rows</span>
            </div>

            {loading ? (
              <p className="text-sm text-neutral-500">Loading preview…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-neutral-500">No actors found for these criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-neutral-600">
                  <thead className="border-b border-neutral-200 text-xs text-neutral-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Handle</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">First Seen</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-100 transition">
                        <td className="px-3 py-2.5 font-medium text-neutral-900">{item.primary_handle}</td>
                        <td className="px-3 py-2.5 capitalize">{item.category}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-neutral-500">{item.first_seen ? item.first_seen.split("T")[0] : "-"}</td>
                        <td className="px-3 py-2.5 capitalize">
                          <span
                            className={`inline-block rounded-none px-2 py-0.5 text-xs font-medium ${
                              item.status === "active"
                                ? "bg-blue-500/10 text-blue-700 border border-blue-500/20"
                                : item.status === "rebranded"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-neutral-100 text-neutral-500 border border-neutral-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-700">{Math.round(item.confidence * 100)}%</td>
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
