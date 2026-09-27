"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import GraphViewer from "@/components/GraphViewer";
import ScanFeed from "@/components/ScanFeed";
import AbstractBg from "@/components/AbstractBg";
import { SectionTag } from "@/components/SectionTag";
import { api, type CalibrationResponse, type InfraSummary } from "@/lib/api";

export default function MetricsPage() {
  const [data, setData] = useState<CalibrationResponse | null>(null);
  const [infra, setInfra] = useState<InfraSummary | null>(null);
  const [topActorId, setTopActorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getCalibration().then((d) => {
      if (!cancelled) setData(d);
    }).catch(() => {
      if (!cancelled) setError("Failed to load calibration metrics.");
    });
    api.getInfraSummary().then((d) => {
      if (!cancelled) setInfra(d);
    }).catch(() => {});
    api.listActors({ limit: 500 }).then((list) => {
      if (cancelled || list.items.length === 0) return;
      const top = [...list.items].sort((a, b) => b.confidence - a.confidence)[0];
      setTopActorId(top.id);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <main className="mx-auto max-w-[1440px] bg-[#fafafa] px-4 py-10 text-red-600">{error}</main>;

  return (
    <main className="relative bg-[#fafafa] text-neutral-900">
      <AbstractBg />
      <div className="relative mx-auto max-w-[1440px] space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <SectionTag index="01" label="LIVE SIGNAL" dark />
          <h1 className="mt-3 text-3xl font-black tracking-tight">Operations, live.</h1>
        </div>

        {/* 3-column Live Signal panel */}
        <div className="grid grid-cols-1 gap-px border border-neutral-200 bg-neutral-200 lg:grid-cols-3">
          <div className="bg-white p-6">
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">
              INTELLIGENCE FEED
            </h2>
            <div className="mt-4">
              <ScanFeed />
            </div>
          </div>

          <div className="bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">
                RELATIONSHIP GRAPH
              </h2>
              {topActorId && (
                <Link
                  href={`/actors/${topActorId}`}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest text-blue-700 hover:underline"
                >
                  VIEW FULL <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
            <div className="mt-4">
              {topActorId ? (
                <GraphViewer actorId={topActorId} heightPx={300} />
              ) : (
                <div className="flex h-[300px] items-center justify-center border border-neutral-200 text-sm text-neutral-400">
                  Loading preview graph…
                </div>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] tracking-widest text-neutral-400">
              HIGHEST-CONFIDENCE ACTOR PREVIEW
            </p>
          </div>

          <div className="bg-white p-6">
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">
              INFRA SIGNAL BREAKDOWN
            </h2>
            {!infra ? (
              <p className="mt-4 text-sm text-neutral-400">Loading signal counts…</p>
            ) : (
              <div className="mt-4 space-y-4">
                {[
                  { label: "CERT FINGERPRINT", value: infra.cert_fingerprint_matches },
                  { label: "FAVICON HASH", value: infra.favicon_hash_matches },
                  { label: "BANNER HASH", value: infra.banner_hash_matches },
                  { label: "DESCRIPTOR FLAGS", value: infra.descriptor_flagged_count },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="tracking-widest text-neutral-500">{row.label}</span>
                      <span className="font-bold text-neutral-900">{row.value}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-neutral-100">
                      <div
                        className="h-full bg-blue-700"
                        style={{
                          width: `${infra.actors_with_matches ? (row.value / Math.max(infra.actors_with_matches, 1)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="font-mono text-[11px] tracking-widest text-neutral-400">
                  {infra.actors_with_matches} / {infra.total_actors} ACTORS WITH MATCHES
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Calibration (kept, restyled) */}
        <div>
          <SectionTag index="02" label="CALIBRATION" dark />
          <h2 className="mt-3 text-3xl font-black tracking-tight">Confidence calibration</h2>
          {!data ? (
            <p className="mt-4 text-sm text-neutral-400">Loading calibration…</p>
          ) : (
            <>
              <p className="mt-2 max-w-4xl text-sm text-neutral-600">{data.method}</p>
              <div className="mt-3 max-w-4xl border border-amber-500/50 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                <span className="font-bold">Limitation — n=3 positive pairs.</span> These curves illustrate
                separation on labeled synthetic data, not a statistically robust generalization estimate. With 3
                positives, ROC-AUC can only take a small number of discrete values, and 1.0 is close to the
                default outcome whenever the 3 deliberately-similar synthetic pairs outrank negatives. A real
                evaluation set would need dozens of positive examples plus held-out actors before any curve can
                be read as a performance claim.
              </div>
              <p className="mt-2 font-mono text-[11px] tracking-widest text-neutral-400">
                {data.n_actors_scored} ACTORS SCORED · {data.n_ground_truth_pairs} GROUND-TRUTH PAIRS ·{" "}
                {data.summary.n_positive_scores} POSITIVE VS {data.summary.n_negative_scores} NEGATIVE SCORES
              </p>

              <div className="mt-6 grid grid-cols-1 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Top-1 accuracy", value: `${Math.round(data.summary.top1_accuracy * 100)}%` },
                  { label: "Top-5 accuracy", value: `${Math.round(data.summary.top5_accuracy * 100)}%` },
                  { label: "MRR", value: data.summary.mrr.toFixed(3) },
                  { label: "ROC-AUC (stylometry only)", value: data.summary.roc_auc_stylometry_only.toFixed(3) },
                ].map((c) => (
                  <div key={c.label} className="bg-white p-5">
                    <p className="font-mono text-[11px] tracking-widest text-neutral-500">{c.label.toUpperCase()}</p>
                    <p className="mt-2 font-mono text-3xl font-bold text-neutral-900">{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border border-neutral-200 bg-white p-6">
                <h3 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">
                  GROUND-TRUTH PAIRS (STYLOMETRY-ONLY RANK)
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 font-mono text-[11px] tracking-widest text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">OLD</th>
                        <th className="px-3 py-2">NEW</th>
                        <th className="px-3 py-2">RAW SCORE</th>
                        <th className="px-3 py-2">RANK / CANDIDATES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.pairs.map((p) => (
                        <tr key={p.old_id}>
                          <td className="px-3 py-2 font-mono text-xs"><Link className="text-blue-700 hover:underline" href={`/actors/${p.old_id}`}>{p.old_id}</Link></td>
                          <td className="px-3 py-2 font-mono text-xs"><Link className="text-blue-700 hover:underline" href={`/actors/${p.new_id}`}>{p.new_id}</Link></td>
                          <td className="px-3 py-2 font-mono font-bold">{p.raw_stylometric_score.toFixed(4)}</td>
                          <td className="px-3 py-2 font-mono">#{p.rank_of_true_match ?? "—"} / {p.n_candidates}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-px border border-neutral-200 bg-neutral-200 lg:grid-cols-2">
                <section className="bg-white p-6">
                  <h3 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">
                    PRECISION / RECALL SWEEP
                  </h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.pr_curve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="threshold" stroke="#737373" fontSize={11} />
                        <YAxis stroke="#737373" fontSize={11} domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="precision" stroke="#7c3aed" dot={false} />
                        <Line type="monotone" dataKey="recall" stroke="#65a30d" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="bg-white p-6">
                  <h3 className="font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">
                    ROC SWEEP (STYLOMETRY ONLY)
                  </h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.roc_curve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="fpr" stroke="#737373" fontSize={11} />
                        <YAxis stroke="#737373" fontSize={11} domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="tpr" stroke="#7c3aed" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
