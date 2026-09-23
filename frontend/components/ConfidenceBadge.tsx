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
}> = [
  { key: "identifier_match", label: "Identifier Match" },
  { key: "infra_match", label: "Infrastructure Match" },
  { key: "stylometric_sim", label: "Stylometric Similarity" },
  { key: "behavioural", label: "Behavioural" },
];

function scoreStyle(score: number) {
  if (score < 0.4) return "border-red-500/30 bg-red-950/20 text-red-400";
  if (score <= 0.7) return "border-amber-500/30 bg-amber-950/20 text-amber-400";
  return "border-emerald-500/30 bg-emerald-950/20 text-emerald-400";
}

export default function ConfidenceBadge({
  score,
  breakdown,
  label = "Rebrand/Linkage Confidence",
}: ConfidenceBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`rounded-lg border p-4 ${scoreStyle(score)} shadow-sm transition`}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 text-left cursor-pointer focus:outline-none"
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wider opacity-80">{label}</span>
          <span className="mt-1 block text-3xl font-bold">{Math.round(score * 100)}%</span>
        </span>
        <ChevronDown className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-current/20 pt-4">
          {components.map(({ key, label: componentLabel }) => {
            const component = breakdown[key];
            const rawValue = component.raw;
            const contribution = component.contribution;
            const isBehavioural = key === "behavioural";
            const displayNote = component.display_note;

            return (
              <div key={key}>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
                  <span className="font-medium">
                    {componentLabel}
                    {isBehavioural && (
                      <span className="ml-1 text-[10px] font-normal opacity-70">(not yet implemented)</span>
                    )}
                  </span>
                  <span>
                    {rawValue.toFixed(2)} <span className="opacity-70">(contributes {contribution.toFixed(2)})</span>
                  </span>
                </div>
                {displayNote && (
                  <div className="mt-1 text-[10px] font-medium opacity-70">{displayNote}</div>
                )}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-current/20">
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
