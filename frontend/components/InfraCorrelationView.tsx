"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, type InfraCorrelation, type SampleArtifact } from "@/lib/api";

interface InfraCorrelationViewProps {
  onionAddress: string;
}

function scoreStyle(score: number) {
  if (score < 0.4) return "border-red-300 bg-red-50 text-red-700";
  if (score <= 0.7) return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function truncateOnion(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 24) return trimmed;
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-8)}`;
}

export default function InfraCorrelationView({ onionAddress }: InfraCorrelationViewProps) {
  const [infra, setInfra] = useState<InfraCorrelation | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [artifact, setArtifact] = useState<SampleArtifact | null>(null);

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
    api.getSampleArtifact().then(setArtifact).catch(() => setArtifact(null));
    return () => {
      cancelled = true;
    };
  }, [onionAddress]);

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-none border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        <LoaderCircle className="size-4 animate-spin text-blue-700" />
        Loading infrastructure correlation data for onion service…
      </div>
    );
  }

  if (state === "error" || !infra) {
    return (
      <div className="rounded-none border border-red-500/30 bg-red-50/30 p-4 text-sm text-red-600">
        Infrastructure correlation data is currently unavailable.
      </div>
    );
  }

  const hasCertMatches = infra.cert_banner_matches.length > 0;
  const isDescriptorFlagged = infra.descriptor_flag !== null && infra.descriptor_flag.flagged;
  const zeroSignals = infra.combined_infra_score === 0 && !hasCertMatches && !isDescriptorFlagged;

  return (
    <div className="space-y-4 rounded-none border border-neutral-200 bg-white p-5">
      {/* Onion Header & Score Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Hidden Service Infrastructure
          </span>
          <div className="mt-1 font-mono text-sm font-semibold text-neutral-900" title={infra.onion_address}>
            {truncateOnion(infra.onion_address)}
          </div>
        </div>

        <div className={`rounded-none border px-4 py-2 ${scoreStyle(infra.combined_infra_score)}`}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Infrastructure Correlation Score
          </span>
          <span className="block text-2xl font-bold">{Math.round(infra.combined_infra_score * 100)}%</span>
        </div>
      </div>

      {/* Baseline Zero Signals Notice */}
      {zeroSignals && (
        <div className="rounded-none border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
          No infrastructure correlation signals for this hidden service.
        </div>
      )}

      {/* Certificate / Banner Matches Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-neutral-800">Certificate / Banner Matches</h4>
        {!hasCertMatches ? (
          <p className="text-sm text-neutral-500">No clearnet cert or banner matches found.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-none border border-neutral-200 bg-neutral-50">
            {infra.cert_banner_matches.map((match, idx) => (
              <li key={`${match.signal_type}:${match.matched_indicator}:${idx}`} className="p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase text-neutral-600">
                    {match.signal_type}
                  </span>
                  <span className="text-xs font-medium text-blue-700">
                    +{(match.confidence_contribution * 100).toFixed(0)}% contribution
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-500">Matched Indicator:</span>
                  <code className="break-all text-xs font-semibold text-blue-700 font-mono">
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
        <h4 className="text-sm font-semibold text-neutral-800">Descriptor Analysis</h4>
        {isDescriptorFlagged && infra.descriptor_flag ? (
          <div className="rounded-none border border-amber-500/40 bg-amber-50/30 p-4 text-amber-800">
            <div className="flex items-center gap-2 font-semibold text-amber-700">
              <AlertTriangle className="size-4 text-amber-400" />
              Descriptor anomaly detected
            </div>
            <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-amber-800/90">
              {infra.descriptor_flag.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-none border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
            <CheckCircle2 className="size-4 text-blue-700" />
            No descriptor inconsistencies detected
          </div>
        )}
      </div>
      {/* Sample Artifact Analysis — capability demonstration, not actor evidence */}
      {artifact && (
        <div className="space-y-2 border-t border-neutral-200 pt-4">
          <h4 className="text-sm font-semibold text-neutral-800">
            Sample Artifact Analysis{" "}
            <span className="ml-1 rounded-none border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
              Demonstration
            </span>
          </h4>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Real artifact parsing on a sample file — not actor-specific evidence. Cert is locally
            generated and self-signed ({artifact.source_file}), never fetched from a live service.
          </p>
          <dl className="grid grid-cols-1 gap-2 rounded-none border border-neutral-200 bg-neutral-50 p-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-neutral-400">SHA-256 fingerprint</dt>
              <dd className="break-all font-mono text-[11px] text-neutral-800">{artifact.parsed.sha256_fingerprint}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Subject CN / Issuer CN</dt>
              <dd className="font-mono text-[11px] text-neutral-800">
                {artifact.parsed.subject_cn ?? "—"} / {artifact.parsed.issuer_cn ?? "—"}
                {artifact.parsed.self_signed ? " (self-signed)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">SANs</dt>
              <dd className="font-mono text-[11px] text-neutral-800">{artifact.parsed.sans.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Validity</dt>
              <dd className="font-mono text-[11px] text-neutral-800">
                {artifact.parsed.not_before.slice(0, 10)} → {artifact.parsed.not_after.slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">Public key</dt>
              <dd className="font-mono text-[11px] text-neutral-800">
                {artifact.parsed.public_key_algorithm} / {artifact.parsed.public_key_size}-bit /{" "}
                {artifact.parsed.signature_hash_algorithm}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">Serial</dt>
              <dd className="break-all font-mono text-[11px] text-neutral-800">{artifact.parsed.serial_number}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
