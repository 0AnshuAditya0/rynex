"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle, Users, Activity, Layers, ShieldCheck, Link2 } from "lucide-react";

import { SectionTag } from "@/components/SectionTag";
import AbstractBg from "@/components/AbstractBg";
import { api, type ActorSummary, type Actor } from "@/lib/api";
import {
  formatSynced,
  getCachedOverviewStats,
  setCachedOverviewStats,
  type OverviewStatsCache,
} from "@/lib/statsCache";

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
  const [cardCache, setCardCache] = useState<OverviewStatsCache | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      setStale(false);

      // Instant: last-known card values first, no spinner from cache.
      const cached = getCachedOverviewStats();
      if (cached) {
        setCardCache(cached);
        setLastSynced(cached.lastSynced);
        setLoading(false);
      }
      setRefreshing(true);

      try {
        const [healthRes, listRes] = await Promise.all([
          api.health(),
          api.listActors({ limit: 500 }),
        ]);

        if (cancelled) return;

        setActorsLoaded(healthRes.actors_loaded);
        setActors(listRes.items);

        // Refresh the card cache from live counts.
        const sc = { active: 0, rebranded: 0, inactive: 0 };
        listRes.items.forEach((a) => {
          if (a.status in sc) sc[a.status as keyof typeof sc] += 1;
        });
        const entry = setCachedOverviewStats({
          actorsLoaded: healthRes.actors_loaded,
          active: sc.active,
          rebranded: sc.rebranded,
          inactive: sc.inactive,
        });
        setCardCache(entry);
        setLastSynced(entry.lastSynced);

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
          if (getCachedOverviewStats()) {
            // Backend unreachable: keep cached cards silently, flag stale.
            // Tables below stay empty — the banner says why.
            setStale(true);
          } else {
            setError("Failed to load live dashboard metrics.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
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
      <main className="flex min-h-[70vh] items-center justify-center bg-[#fafafa] px-4">
        <div className="flex items-center gap-3 border border-neutral-200 bg-white px-6 py-4">
          <LoaderCircle className="size-5 animate-spin text-blue-700" />
          <span className="text-neutral-600">Loading live telemetry & metrics…</span>
        </div>
      </main>
    );
  }

  if (error || !actors) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#fafafa] px-4">
        <div className="border border-red-300 bg-red-50 px-6 py-4 text-red-600">
          {error ?? "Error loading dashboard."}
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

  // Live counts when actors loaded, else last-known cached cards.
  const live = actors.length > 0;
  const cardLoaded = live ? (actorsLoaded ?? actors.length) : cardCache?.actorsLoaded;
  const cardActive = live ? statusCounts.active : cardCache?.active;
  const cardRebranded = live ? statusCounts.rebranded : cardCache?.rebranded;
  const cardInactive = live ? statusCounts.inactive : cardCache?.inactive;
  const cardText = (v: number | null | undefined) => (v ?? "…");

  return (
    <main className="relative bg-[#fafafa] text-neutral-900">
      <AbstractBg />
      <div className="relative mx-auto max-w-[1440px] space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <SectionTag index="01" label="TELEMETRY" dark />
          <h1 className="mt-3 text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="mt-1 font-mono text-xs tracking-widest text-neutral-500">
            LIVE INTELLIGENCE SUMMARY // SYSTEM DATA STORE // LAST SYNCED: {formatSynced(lastSynced).toUpperCase()}
          </p>
        </div>

        {stale && (
          <div className="border border-amber-300 bg-amber-50 px-4 py-3 font-mono text-xs tracking-widest text-amber-800">
            FAILED TO FETCH LIVE DATA — SHOWING LAST-SYNCED FROM {formatSynced(lastSynced).toUpperCase()}
          </div>
        )}

        {refreshing && !loading && !stale && (
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-blue-700">
            <LoaderCircle className="size-3.5 animate-spin" />
            REFRESHING LIVE DATA…
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral-500">ACTORS LOADED</span>
              <Users className="size-5 text-blue-700" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold">{cardText(cardLoaded)}</p>
            <span className="mt-1 block font-mono text-[11px] tracking-widest text-neutral-400">LIVE DATA STORE RECORDS</span>
          </div>

          <div className="bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral-500">ACTIVE PERSONAS</span>
              <Activity className="size-5 text-blue-700" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold">{cardText(cardActive)}</p>
            <span className="mt-1 block font-mono text-[11px] tracking-widest text-neutral-400">CURRENTLY MONITORED</span>
          </div>

          <div className="bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral-500">REBRANDED PERSONAS</span>
              <Layers className="size-5 text-blue-700" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold">{cardText(cardRebranded)}</p>
            <span className="mt-1 block font-mono text-[11px] tracking-widest text-neutral-400">IDENTIFIED REBRAND LINKS</span>
          </div>

          <div className="bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral-500">INACTIVE PERSONAS</span>
              <ShieldCheck className="size-5 text-neutral-400" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold">{cardText(cardInactive)}</p>
            <span className="mt-1 block font-mono text-[11px] tracking-widest text-neutral-400">HISTORICAL RECORDS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px border border-neutral-200 bg-neutral-200 lg:grid-cols-2">
          {/* Category Breakdown */}
          <section className="bg-white p-6">
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">CATEGORY BREAKDOWN</h2>
            <p className="mt-1 text-xs text-neutral-500">Distribution of threat actors by market category</p>

            <div className="mt-6 space-y-4">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / actors.length) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="tracking-widest text-neutral-600">{cat.replace("-", " ").toUpperCase()}</span>
                      <span className="font-bold text-neutral-900">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-neutral-100">
                      <div
                        className="h-full bg-blue-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Known Ground-Truth Rebrand Pairs (Live API Scores) */}
          <section className="bg-white p-6">
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">GROUND-TRUTH REBRAND PAIRS</h2>
            <p className="mt-1 text-xs text-neutral-500">Live attribution scores calculated by API pipeline</p>

            <div className="mt-6 space-y-4">
              {rebrandPairsData.map((pair) => (
                <div
                  key={pair.label}
                  className="border border-neutral-200 bg-neutral-50 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-widest text-blue-700 uppercase">
                      {pair.label}
                    </span>
                    <span className="border border-blue-700/40 bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                      {Math.round(pair.oldActor.confidence * 100)}% Link Score
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/actors/${pair.oldActor.id}`}
                      className="font-mono font-bold text-neutral-900 hover:text-blue-700 hover:underline transition truncate"
                    >
                      {pair.oldActor.primary_handle}
                    </Link>
                    <Link2 className="size-4 shrink-0 text-neutral-400" />
                    <Link
                      href={`/actors/${pair.newActor.id}`}
                      className="font-mono font-bold text-neutral-900 hover:text-blue-700 hover:underline transition truncate text-right"
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
        <section className="border border-neutral-200 bg-white p-6">
          <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">HIGHEST REBRAND CONFIDENCE PERSONAS</h2>
          <p className="mt-1 text-xs text-neutral-500">Top attributed personas ordered by entity linkage & stylometry scores</p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 font-mono text-[11px] tracking-widest text-neutral-500">
                <tr>
                  <th className="px-3 py-3">PRIMARY HANDLE</th>
                  <th className="px-3 py-3">CATEGORY</th>
                  <th className="px-3 py-3">STATUS</th>
                  <th className="px-3 py-3">REBRAND PAIR / LINK</th>
                  <th className="px-3 py-3 text-right">CONFIDENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topActors.map((actor) => (
                  <tr key={actor.id} className="hover:bg-neutral-50 transition">
                    <td className="px-3 py-3 font-mono font-bold text-neutral-900">
                      <Link href={`/actors/${actor.id}`} className="hover:text-blue-700 hover:underline">
                        {actor.primary_handle}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs uppercase text-neutral-600">{actor.category}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                          actor.status === "active"
                            ? "bg-blue-50 text-blue-700 border border-blue-700/40"
                            : actor.status === "rebranded"
                            ? "bg-amber-50 text-amber-700 border border-amber-500/40"
                            : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                        }`}
                      >
                        {actor.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-500 font-mono">
                      {actor.matched_actor_id ? (
                        <Link href={`/actors/${actor.matched_actor_id}`} className="text-blue-700 hover:underline">
                          {actor.matched_actor_id}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-neutral-900">
                      {Math.round(actor.confidence * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
