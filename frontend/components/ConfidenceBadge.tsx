"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { ConfidenceBreakdown } from "@/lib/api";

interface ConfidenceBadgeProps {
  score: number;
  breakdown: ConfidenceBreakdown;
  label?: string;
}

const components: Array<{
  key: keyof ConfidenceBreakdown;
  label: string;
  weight: number;
}> = [
  { key: "identifier_match", label: "Identifier Match", weight: 0.4 },
  { key: "infra_match", label: "Infrastructure Match", weight: 0.25 },
  { key: "stylometric_sim", label: "Stylometric Similarity", weight: 0.25 },
  { key: "behavioural", label: "Behavioural", weight: 0.1 },
];

function scoreStyle(score: number) {
  if (score < 0.4) return "border-red-200 bg-red-50 text-red-800";
  if (score <= 0.7) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default function ConfidenceBadge({
  score,
  breakdown,
  label = "Rebrand/Linkage Confidence",
}: ConfidenceBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`rounded-lg border p-4 ${scoreStyle(score)}`}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">{label}</span>
          <span className="mt-1 block text-3xl font-bold">{Math.round(score * 100)}%</span>
        </span>
        <ChevronDown className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-current/15 pt-4">
          {components.map(({ key, label: componentLabel, weight }) => {
            const contribution = breakdown[key];
            const rawValue = Math.min(1, contribution / weight);

            return (
              <div key={key}>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">{componentLabel}</span>
                  <span>
                    {rawValue.toFixed(2)} <span className="opacity-70">(contributes {contribution.toFixed(2)})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-current/15">
                  <div
                    className="h-full rounded-full bg-current"
                    style={{ width: `${Math.round(rawValue * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
