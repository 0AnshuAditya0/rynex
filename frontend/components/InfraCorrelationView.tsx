"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, type InfraCorrelation } from "@/lib/api";

interface InfraCorrelationViewProps {
  onionAddress: string;
}

function scoreStyle(score: number) {
  if (score < 0.4) return "border-red-500/30 bg-red-950/20 text-red-400";
  if (score <= 0.7) return "border-amber-500/30 bg-amber-950/20 text-amber-400";
  return "border-emerald-500/30 bg-emerald-950/20 text-emerald-400";
}

function truncateOnion(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 24) return trimmed;
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-8)}`;
}

export default function InfraCorrelationView({ onionAddress }: InfraCorrelationViewProps) {
  const [infra, setInfra] = useState<InfraCorrelation | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setInfra(null);

    async function loadInfra() {
      try {
        const response = await api.getInfra(onionAddress);
        if (!cancelled) {
          setInfra(response);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setInfra(null);
          setState("error");
        }
      }
    }

    void loadInfra();
    return () => {
      cancelled = true;
    };
  }, [onionAddress]);

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#121827] p-4 text-sm text-slate-400">
        <LoaderCircle className="size-4 animate-spin text-sky-400" />
        Loading infrastructure correlation data for onion service…
      </div>
    );
  }

  if (state === "error" || !infra) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400">
        Infrastructure correlation data is currently unavailable.
      </div>
    );
  }

  const hasCertMatches = infra.cert_banner_matches.length > 0;
  const isDescriptorFlagged = infra.descriptor_flag !== null && infra.descriptor_flag.flagged;
  const zeroSignals = infra.combined_infra_score === 0 && !hasCertMatches && !isDescriptorFlagged;

  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-[#121827] p-5 shadow-sm">
      {/* Onion Header & Score Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Hidden Service Infrastructure
          </span>
          <div className="mt-1 font-mono text-sm font-semibold text-slate-100" title={infra.onion_address}>
            {truncateOnion(infra.onion_address)}
          </div>
        </div>

        <div className={`rounded-lg border px-4 py-2 ${scoreStyle(infra.combined_infra_score)}`}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Infrastructure Correlation Score
          </span>
          <span className="block text-2xl font-bold">{Math.round(infra.combined_infra_score * 100)}%</span>
        </div>
      </div>

      {/* Baseline Zero Signals Notice */}
      {zeroSignals && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          No infrastructure correlation signals for this hidden service.
        </div>
      )}

      {/* Certificate / Banner Matches Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-200">Certificate / Banner Matches</h4>
        {!hasCertMatches ? (
          <p className="text-sm text-slate-400">No clearnet cert or banner matches found.</p>
        ) : (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
            {infra.cert_banner_matches.map((match, idx) => (
              <li key={`${match.signal_type}:${match.matched_indicator}:${idx}`} className="p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold uppercase text-slate-300">
                    {match.signal_type}
                  </span>
                  <span className="text-xs font-medium text-emerald-400">
                    +{(match.confidence_contribution * 100).toFixed(0)}% contribution
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Matched Indicator:</span>
                  <code className="break-all text-xs font-semibold text-sky-400 font-mono">
                    {match.matched_indicator}
                  </code>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Descriptor Analysis Section */}
      <div className="space-y-2 pt-2">
        <h4 className="text-sm font-semibold text-slate-200">Descriptor Analysis</h4>
        {isDescriptorFlagged && infra.descriptor_flag ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="size-4 text-amber-400" />
              Descriptor anomaly detected
            </div>
            <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-amber-200/90">
              {infra.descriptor_flag.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
            <CheckCircle2 className="size-4 text-emerald-400" />
            No descriptor inconsistencies detected
          </div>
        )}
      </div>
    </div>
  );
}
