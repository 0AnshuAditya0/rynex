"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle, Users, Activity, Layers, ShieldCheck, Link2 } from "lucide-react";

import { api, type ActorSummary, type Actor } from "@/lib/api";

const REBRAND_PAIRS = [
  { oldId: "actor-rebrand-01-old", newId: "actor-rebrand-01-new", label: "Pair 1 (Drugs)" },
  { oldId: "actor-rebrand-02-old", newId: "actor-rebrand-02-new", label: "Pair 2 (Hacking)" },
  { oldId: "actor-rebrand-03-old", newId: "actor-rebrand-03-new", label: "Pair 3 (Stolen Data)" },
];

export default function OverviewPage() {
  const [actorsLoaded, setActorsLoaded] = useState<number | null>(null);
  const [actors, setActors] = useState<ActorSummary[]>([]);
  const [rebrandPairsData, setRebrandPairsData] = useState<
    Array<{ label: string; oldActor: Actor; newActor: Actor }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [healthRes, listRes] = await Promise.all([
          api.health(),
          api.listActors({ limit: 500 }),
        ]);

        if (cancelled) return;

        setActorsLoaded(healthRes.actors_loaded);
        setActors(listRes.items);

        // Fetch exact details for the 3 ground-truth rebrand pairs from live API
        const pairsResults = await Promise.all(
          REBRAND_PAIRS.map(async (pair) => {
            const [oldActor, newActor] = await Promise.all([
              api.getActor(pair.oldId),
              api.getActor(pair.newId),
            ]);
            return { label: pair.label, oldActor, newActor };
          })
        );

        if (!cancelled) {
          setRebrandPairsData(pairsResults);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load live dashboard metrics.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 text-slate-400">
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#121827] px-6 py-4 shadow-lg">
          <LoaderCircle className="size-5 animate-spin text-sky-400" />
          <span>Loading live telemetry & metrics…</span>
        </div>
      </main>
    );
  }

  if (error || !actors) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 text-red-400">
        <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-6 py-4">
          {error ?? "Error loading overview."}
        </div>
      </main>
    );
  }

  // Compute category breakdown from live items
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = { active: 0, rebranded: 0, inactive: 0 };

  actors.forEach((a) => {
    categoryCounts[a.category] = (categoryCounts[a.category] ?? 0) + 1;
    if (a.status in statusCounts) {
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    }
  });

  // Top high confidence actors sorted by score
  const topActors = [...actors]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Telemetry & Analytics</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-100">Overview Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Live intelligence summary from system data store.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-[#121827] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Actors Loaded</span>
            <Users className="size-5 text-sky-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-100">{actorsLoaded ?? actors.length}</p>
          <span className="mt-1 block text-xs text-slate-500">Live data store records</span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#121827] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Personas</span>
            <Activity className="size-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-100">{statusCounts.active ?? 0}</p>
          <span className="mt-1 block text-xs text-slate-500">Currently monitored</span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#121827] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Rebranded Personas</span>
            <Layers className="size-5 text-amber-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-100">{statusCounts.rebranded ?? 0}</p>
          <span className="mt-1 block text-xs text-slate-500">Identified rebrand links</span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#121827] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inactive Personas</span>
            <ShieldCheck className="size-5 text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-100">{statusCounts.inactive ?? 0}</p>
          <span className="mt-1 block text-xs text-slate-500">Historical records</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Category Breakdown */}
        <section className="rounded-lg border border-slate-800 bg-[#121827] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">Category Breakdown</h2>
          <p className="mt-1 text-xs text-slate-400">Distribution of threat actors by market category</p>

          <div className="mt-6 space-y-4">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / actors.length) * 100);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="capitalize">{cat.replace("-", " ")}</span>
                    <span className="text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Known Ground-Truth Rebrand Pairs (Live API Scores) */}
        <section className="rounded-lg border border-slate-800 bg-[#121827] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">Ground-Truth Rebrand Pairs</h2>
          <p className="mt-1 text-xs text-slate-400">Live attribution scores calculated by API pipeline</p>

          <div className="mt-6 space-y-4">
            {rebrandPairsData.map((pair) => (
              <div
                key={pair.label}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-wide">
                    {pair.label}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                    {Math.round(pair.oldActor.confidence * 100)}% Link Score
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    href={`/actors/${pair.oldActor.id}`}
                    className="font-medium text-slate-200 hover:text-sky-400 hover:underline transition truncate"
                  >
                    {pair.oldActor.primary_handle}
                  </Link>
                  <Link2 className="size-4 shrink-0 text-slate-500" />
                  <Link
                    href={`/actors/${pair.newActor.id}`}
                    className="font-medium text-slate-200 hover:text-sky-400 hover:underline transition truncate text-right"
                  >
                    {pair.newActor.primary_handle}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent High-Confidence Linkages */}
      <section className="rounded-lg border border-slate-800 bg-[#121827] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-100">Highest Rebrand Confidence Personas</h2>
        <p className="mt-1 text-xs text-slate-400">Top attributed personas ordered by entity linkage & stylometry scores</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3 font-semibold">Primary Handle</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Rebrand Pair / Link</th>
                <th className="px-3 py-3 font-semibold text-right">Confidence Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topActors.map((actor) => (
                <tr key={actor.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-3 py-3 font-semibold text-slate-100">
                    <Link href={`/actors/${actor.id}`} className="hover:text-sky-400 hover:underline">
                      {actor.primary_handle}
                    </Link>
                  </td>
                  <td className="px-3 py-3 capitalize">{actor.category}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        actor.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : actor.status === "rebranded"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {actor.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400 font-mono">
                    {actor.matched_actor_id ? (
                      <Link href={`/actors/${actor.matched_actor_id}`} className="text-sky-400 hover:underline">
                        {actor.matched_actor_id}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-sky-400">
                    {Math.round(actor.confidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
