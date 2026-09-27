"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, AudioWaveform, BarChart3, Bug, Crosshair, Database, FileText, FlaskConical, Link2, ListChecks, Pill, ServerCog, Shield, Terminal, Users } from "lucide-react";
import { Audiowide } from "next/font/google";

import { CornerMarks, SectionTag } from "@/components/SectionTag";
import { api, type CalibrationResponse, type InfraSummary } from "@/lib/api";
import {
  formatSynced,
  getCachedHeroStats,
  setCachedHeroStats,
} from "@/lib/statsCache";

const michroma = Audiowide({
  weight: "400",
  subsets: ["latin"],
});


const REBRAND_PAIRS = [
  { oldId: "actor-rebrand-01-old", newId: "actor-rebrand-01-new", tag: "DRUGS" },
  { oldId: "actor-rebrand-02-old", newId: "actor-rebrand-02-new", tag: "HACKING" },
  { oldId: "actor-rebrand-03-old", newId: "actor-rebrand-03-new", tag: "STOLEN DATA" },
];

interface HeroStats {
  actors: number | null;
  infraMatches: number | null;
  rebrands: number | null;
  categories: number | null;
}

export default function Home() {
  const [stats, setStats] = useState<HeroStats>({ actors: null, infraMatches: null, rebrands: null, categories: null });
  const [pairs, setPairs] = useState<Array<{ tag: string; oldHandle: string; newHandle: string; oldId: string; score: number }>>([]);
  const [calib, setCalib] = useState<CalibrationResponse["summary"] | null>(null);
  const [signals, setSignals] = useState<InfraSummary | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Instant: render last-known values first, no loading state from cache.
    const cached = getCachedHeroStats();
    if (cached) {
      setStats({
        actors: cached.actors,
        infraMatches: cached.infraMatches,
        rebrands: cached.rebrands,
        categories: cached.categories,
      });
      setLastSynced(cached.lastSynced);
    }
    // Background: refresh from live API.
    Promise.all([
      api.health().catch(() => null),
      api.getInfraSummary().catch(() => null),
      api.listActors({ limit: 500 }).catch(() => null),
    ]).then(([health, infra, list]) => {
      if (cancelled) return;
      if (!health || !infra || !list) {
        // Backend unreachable: keep cached numbers silently; honest empty
        // state only when there is no cache at all (first-ever load).
        if (!getCachedHeroStats()) setUnavailable(true);
        return;
      }
      const items = list.items;
      const fresh = {
        actors: health.actors_loaded,
        infraMatches: infra.actors_with_matches,
        rebrands: items.filter((a) => a.status === "rebranded").length,
        categories: new Set(items.map((a) => a.category)).size || null,
      };
      setStats(fresh);
      setUnavailable(false);
      setLastSynced(setCachedHeroStats(fresh).lastSynced);
      setSignals(infra);
      const byId = new Map(items.map((a) => [a.id, a]));
      // Pair cards reuse the same list response — no extra per-actor fetches.
      const live = REBRAND_PAIRS.map((p) => {
        const old = byId.get(p.oldId);
        const newer = byId.get(p.newId);
        return old && newer
          ? { tag: p.tag, oldHandle: old.primary_handle, newHandle: newer.primary_handle, oldId: old.id, score: old.confidence }
          : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null);
      setPairs(live);
    });
    api.getCalibration().then((d) => {
      if (!cancelled) setCalib(d.summary);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const statValue = (v: number | null) => {
    if (v !== null) return { text: String(v), stale: false };
    if (unavailable) return { text: "-- (backend unavailable)", stale: true };
    return { text: "…", stale: false };
  };

  const cards = [
    { label: "ACTORS", ...statValue(stats.actors) },
    { label: "INFRA MATCHES", ...statValue(stats.infraMatches) },
    { label: "REBRANDS", ...statValue(stats.rebrands) },
    { label: "CATEGORIES", ...statValue(stats.categories) },
  ];

  return (
    <main className="bg-[#fafafa] text-neutral-900">
      {/* COVER HERO */}
      <section
        className="relative flex min-h-svh flex-col overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url(/rhynex.png)" }}
      >
        {/* middle: giant two-tone ladder title */}
        <div className="flex flex-1 items-center justify-center px-4">
          <h1
            className={`${michroma.className} text-center leading-none text-transparent`}
            style={{ fontSize: "clamp(2.25rem, 8vw, 7rem)", fontWeight: 400, letterSpacing: "0.18em" }}
          >
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(180deg, #0a2472, #0a2472)", transform: "translateY(-0.12em)" }}
            >
              RHY
            </span>
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(180deg, #2563eb, #2563eb)", transform: "translateY(0.12em)" }}
            >
              NEX
            </span>
          </h1>
        </div>

        {/* bottom: desc left, investigate center */}
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 pb-12 sm:block sm:px-8 lg:px-12">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-700/30 transition hover:bg-blue-600 sm:absolute sm:bottom-12 sm:left-1/2 sm:-translate-x-1/2"
          >
            Investigate <ArrowRight className="size-4" />
          </Link>
          <div className="w-full max-w-xs self-start border-l-2 border-blue-700 pl-4">
            <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-neutral-900">
              TRACE PERSONAS.
              <br />
              SURFACE PATTERNS.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              Handles, keys, wallets and hidden-service footprints — fused into ranked,
              explainable attribution confidence.
            </p>
          </div>
        </div>
      </section>

      {/* /01 LIVE SIGNAL */}
      <section className="relative flex min-h-svh flex-col justify-center overflow-hidden border-y-4 border-blue-700 bg-[#f2f6fd]">
        {/* abstract geometric backdrop */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 620">
          <g stroke="rgba(29,78,216,0.14)" strokeWidth="1">
            <line x1="180" y1="0" x2="180" y2="620" />
            <line x1="520" y1="0" x2="520" y2="620" />
            <line x1="900" y1="0" x2="900" y2="620" />
            <line x1="1240" y1="0" x2="1240" y2="620" />
            <line x1="0" y1="140" x2="1440" y2="140" />
            <line x1="0" y1="470" x2="1440" y2="470" />
            <line x1="0" y1="620" x2="1440" y2="40" />
            <line x1="0" y1="120" x2="1440" y2="600" />
          </g>
          <circle cx="720" cy="310" r="150" fill="none" stroke="rgba(29,78,216,0.3)" strokeWidth="1.5" />
          <circle cx="720" cy="310" r="205" fill="none" stroke="rgba(29,78,216,0.18)" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="720" y1="20" x2="720" y2="600" stroke="rgba(29,78,216,0.25)" strokeWidth="1" strokeDasharray="2 5" />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[12%] h-16 w-16 bg-blue-600/80" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[16%] top-[38%] h-10 w-10 bg-blue-500/25" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[4%] top-[58%] h-8 w-8 bg-blue-700/70" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[10%] top-[16%] h-14 w-14 bg-blue-600/75" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[22%] top-[46%] h-9 w-9 bg-blue-500/25" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[5%] top-[64%] h-8 w-8 bg-blue-700/70" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[30%] top-[8%] h-12 w-24 bg-blue-500/15" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[30%] bottom-[10%] h-12 w-24 bg-blue-500/15" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[42%] top-[20%] h-24 w-24"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.45) 1.2px, transparent 1.2px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[38%] bottom-[16%] h-24 w-24"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.4) 1.2px, transparent 1.2px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[2%] top-[30%] h-20 w-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.35) 1.2px, transparent 1.2px)",
            backgroundSize: "12px 12px",
          }}
        />
        {[
          "left-[24%] top-[18%]",
          "left-[47%] top-[30%]",
          "right-[28%] top-[24%]",
          "left-[36%] bottom-[24%]",
          "right-[14%] bottom-[34%]",
        ].map((pos) => (
          <span key={pos} aria-hidden="true" className={`pointer-events-none absolute font-mono text-xl leading-none text-blue-500/70 ${pos}`}>
            +
          </span>
        ))}

        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="border-l-2 border-blue-700 pl-3 font-mono text-xs font-bold tracking-[0.25em] text-neutral-600">
            /01 LIVE SIGNAL
          </p>
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="relative rounded-lg border border-blue-200/70 bg-white/70 px-6 py-8 text-center shadow-[0_10px_36px_-18px_rgba(29,78,216,0.45)] backdrop-blur"
              >
                {["left-2 top-1", "right-2 top-1", "bottom-1 left-2", "bottom-1 right-2"].map((pos) => (
                  <span key={pos} aria-hidden="true" className={`absolute font-mono text-sm leading-none text-blue-500 ${pos}`}>
                    +
                  </span>
                ))}
                <p className={`font-mono font-bold text-blue-950 ${c.stale ? "text-sm" : "text-5xl"}`}>{c.text}</p>
                <div className="mx-auto mt-2 h-0.5 w-5 bg-blue-700" />
                <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-neutral-600">{c.label}</p>
              </div>
            ))}
          </div>
          {signals && (
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { v: signals.actors_with_hidden_services, l: "WITH HIDDEN SERVICES" },
                { v: signals.cert_fingerprint_matches, l: "CERT MATCHES" },
                { v: signals.favicon_hash_matches, l: "FAVICON MATCHES" },
                { v: signals.banner_hash_matches, l: "BANNER MATCHES" },
                { v: signals.descriptor_flagged_count, l: "DESCRIPTOR FLAGS" },
                { v: Object.values(signals.signal_counts).reduce((a, b) => a + b, 0), l: "TOTAL SIGNALS" },
              ].map((s) => (
                <div key={s.l} className="border border-blue-200/60 bg-white/60 px-4 py-3 backdrop-blur">
                  <p className="font-mono text-xl font-black text-blue-800">{s.v}</p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-neutral-500">{s.l}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-10 border-l-2 border-blue-700 pl-3 font-mono text-[11px] tracking-widest text-neutral-500">
            LIVE SYSTEM DATA // SYNTHETIC DEMO DATASET // LAST SYNCED: {formatSynced(lastSynced).toUpperCase()}
          </p>
        </div>
      </section>

      {/* /02 INTELLIGENCE SYSTEM */}
      <section className="relative overflow-hidden border-b-4 border-blue-700 bg-white">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 700">
          <g stroke="rgba(29,78,216,0.1)" strokeWidth="1">
            <line x1="0" y1="120" x2="1440" y2="120" />
            <line x1="0" y1="580" x2="1440" y2="580" />
            <line x1="200" y1="0" x2="200" y2="700" />
            <line x1="1240" y1="0" x2="1240" y2="700" />
          </g>
        </svg>
        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="border-l-2 border-blue-700 pl-3 font-mono text-xs font-bold tracking-[0.25em] text-neutral-600">
                /02 INTELLIGENCE SYSTEM
              </p>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-neutral-900 sm:text-5xl">
                MULTI-LAYER
                <br />
                <span className="text-blue-700">INTELLIGENCE</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600">
                From identity resolution to infrastructure correlation, Rhynex fuses independent
                signals into a single, explainable intelligence layer. Four signals in — one
                ranked confidence score out, with every contribution visible.
              </p>
            </div>
            <div className="border-l-2 border-blue-700 pl-4 lg:mt-14 lg:max-w-sm">
              <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-neutral-900">
                MORE SIGNALS.
                <br />
                CLEARER TRUTHS.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Cross-source reasoning to expose hidden connections, reduce noise, and surface
                what matters.
              </p>
              <Link
                href="/metrics"
                className="mt-3 inline-flex items-center gap-1 font-mono text-xs font-bold tracking-widest text-blue-700 hover:underline"
              >
                EXPLORE SYSTEM <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-6">
              {[
                { n: "01", icon: Link2, title: "ENTITY RESOLUTION", body: "Shared PGP keys and wallets link handles across marketplaces into a single actor identity — with evidence shown, not asserted.", href: "/search" },
                { n: "03", icon: ServerCog, title: "INFRA CORRELATION", body: "Cert fingerprints, banner and favicon hashes matched to clearnet indicators, plus descriptor-anomaly checks.", href: "/overview" },
              ].map((b) => (
                <div key={b.n} className="relative rounded-lg border border-blue-200/70 bg-white/80 p-6 shadow-[0_10px_36px_-18px_rgba(29,78,216,0.4)] backdrop-blur">
                  <span className="absolute right-4 top-3 font-mono text-xs font-bold text-blue-300">{b.n}</span>
                  <b.icon className="size-6 text-blue-700" strokeWidth={1.5} />
                  <h3 className="mt-3 font-mono text-sm font-bold tracking-widest text-neutral-900">{b.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">{b.body}</p>
                  <Link href={b.href} className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest text-blue-700 hover:underline">
                    LEARN MORE <ArrowRight className="size-3" />
                  </Link>
                </div>
              ))}
            </div>

            {/* centerpiece: 4 signals → 1 score */}
            <div aria-hidden="true" className="relative mx-auto hidden h-72 w-72 items-center justify-center lg:flex">
              <div className="absolute h-64 w-64 rounded-full border border-blue-300/50" />
              <div className="absolute h-44 w-44 rounded-full border border-dashed border-blue-400/60" />
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute h-24 w-24 border-2 border-blue-700/50 bg-blue-600/10 backdrop-blur-sm"
                  style={{ transform: `translate(${(i - 1.5) * 14}px, ${(1.5 - i) * 14}px)` }}
                />
              ))}
              <p className="relative bg-white/80 px-2 text-center font-mono text-[10px] font-bold tracking-[0.2em] text-blue-800">
                4 SIGNALS
                <br />→ 1 SCORE
              </p>
            </div>

            <div className="space-y-6">
              {[
                { n: "02", icon: AudioWaveform, title: "STYLOMETRY", body: "TF-IDF author comparison with background calibration unmasks rebranded personas by how they write, ranked against every candidate.", href: "/metrics" },
                { n: "04", icon: Crosshair, title: "BEHAVIOURAL SIGNALS", body: "Posting-time rhythms and identifier-hygiene patterns add a fourth live signal to every confidence breakdown. No stubs.", href: "/metrics" },
              ].map((b) => (
                <div key={b.n} className="relative rounded-lg border border-blue-200/70 bg-white/80 p-6 shadow-[0_10px_36px_-18px_rgba(29,78,216,0.4)] backdrop-blur">
                  <span className="absolute right-4 top-3 font-mono text-xs font-bold text-blue-300">{b.n}</span>
                  <b.icon className="size-6 text-blue-700" strokeWidth={1.5} />
                  <h3 className="mt-3 font-mono text-sm font-bold tracking-widest text-neutral-900">{b.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">{b.body}</p>
                  <Link href={b.href} className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest text-blue-700 hover:underline">
                    LEARN MORE <ArrowRight className="size-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* /03 CONFIRMED REBRANDS */}
      <section className="relative overflow-hidden border-t-4 border-blue-700 bg-[#f2f6fd]">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 640">
          <g stroke="rgba(29,78,216,0.12)" strokeWidth="1">
            <line x1="0" y1="90" x2="1440" y2="90" />
            <line x1="0" y1="560" x2="1440" y2="560" />
            <line x1="120" y1="0" x2="120" y2="640" />
            <line x1="1320" y1="0" x2="1320" y2="640" />
          </g>
          <circle cx="1150" cy="140" r="130" fill="none" stroke="rgba(29,78,216,0.22)" strokeWidth="1.5" />
          <circle cx="1150" cy="140" r="185" fill="none" stroke="rgba(29,78,216,0.14)" strokeWidth="1" strokeDasharray="4 6" />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute right-[12%] top-[10%] h-12 w-12 bg-blue-600/80" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[5%] top-[46%] h-8 w-8 bg-blue-700/70" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[6%] bottom-[18%] h-8 w-8 bg-blue-700/70" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[10%] bottom-[12%] h-24 w-24"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(29,78,216,0.4) 1.2px, transparent 1.2px)",
            backgroundSize: "14px 14px",
          }}
        />

        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="border-l-2 border-blue-700 pl-3 font-mono text-xs font-bold tracking-[0.25em] text-neutral-600">
                /03 CONFIRMED REBRANDS
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600">
                Three known migration pairs, scored live by the attribution pipeline. Same handle, new
                marketplace — linked by shared identifiers, writing style and infrastructure.
              </p>
              <Link
                href="/overview"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-600"
              >
                View All Cases <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <p className="hidden text-right font-mono text-[10px] leading-relaxed tracking-[0.25em] text-neutral-500 lg:block">
              FOLLOW
              <br />
              THE SIGNALS
              <br />
              BEYOND
              <br />
              NEW NAMES
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {pairs.map((p, i) => {
              const icons = [
                [Pill, FlaskConical],
                [Terminal, Bug],
                [Database, FileText],
              ][i % 3];
              const [IconA, IconB] = icons;
              return (
                <div
                  key={p.oldId}
                  className="relative rounded-lg border border-blue-200/70 bg-white/75 p-6 shadow-[0_10px_36px_-18px_rgba(29,78,216,0.45)] backdrop-blur"
                >
                  {["left-2 top-1", "right-2 top-1", "bottom-1 left-2", "bottom-1 right-2"].map((pos) => (
                    <span key={pos} aria-hidden="true" className={`absolute font-mono text-sm leading-none text-blue-500 ${pos}`}>
                      +
                    </span>
                  ))}
                  <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-blue-700">[{p.tag}]</p>
                  <p className="mt-2 font-mono text-[13px] font-bold text-neutral-900">
                    {p.oldHandle} <span className="text-neutral-400">→</span> {p.newHandle}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-5xl font-black text-neutral-900">
                        {Math.round(p.score * 100)}<span className="text-xl text-neutral-400">%</span>
                      </p>
                      <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-neutral-500">LINK CONFIDENCE</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-11 items-center justify-center rounded-md border border-blue-200/70 bg-blue-50/60">
                        <IconA className="size-5 text-blue-800" strokeWidth={1.5} />
                      </span>
                      <span className="font-mono text-blue-400">→</span>
                      <span className="flex size-11 items-center justify-center rounded-md border border-blue-200/70 bg-blue-50/60">
                        <IconB className="size-5 text-blue-800" strokeWidth={1.5} />
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">
                    <Link
                      href={`/actors/${p.oldId}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest text-blue-700 hover:underline"
                    >
                      OPEN CASE <ArrowRight className="size-3" />
                    </Link>
                    <span className="font-mono text-[11px] font-bold text-blue-300">0{i + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 border-t border-neutral-200 pt-8 md:grid-cols-[auto_1fr] md:gap-12">
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.25em] text-neutral-900">
                REBRANDS
                <br />
                IN CONTEXT
              </p>
              <div className="mt-2 h-0.5 w-8 bg-blue-700" />
            </div>
            <div>
              <p className="max-w-xl text-xs leading-relaxed text-neutral-600">
                Track how threat actors evolve. Explore migration chains, infrastructure overlaps, and
                behavioural fingerprints across marketplaces.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[
                  { icon: Link2, value: "3", label: "CONFIRMED REBRANDS" },
                  { icon: ServerCog, value: stats.infraMatches !== null ? String(stats.infraMatches) : "…", label: "INFRA MATCHES" },
                  { icon: Users, value: stats.actors !== null ? String(stats.actors) : "…", label: "ACTORS SCORED" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-700/10">
                      <s.icon className="size-5 text-blue-700" strokeWidth={1.5} />
                    </span>
                    <div>
                      <p className="font-mono text-xl font-black text-neutral-900">{s.value}</p>
                      <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-10 text-center font-mono text-[11px] tracking-[0.3em] text-neutral-400">
            — DIFFERENT NAMES. SAME FOOTPRINT. —
          </p>
        </div>
      </section>

      {/* /04 VALIDATION */}
      <section className="relative overflow-hidden border-t-4 border-blue-700 bg-[#f2f6fd]">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 680">
          <g stroke="rgba(29,78,216,0.12)" strokeWidth="1">
            <line x1="0" y1="80" x2="1440" y2="80" />
            <line x1="0" y1="600" x2="1440" y2="600" />
          </g>
          <circle cx="720" cy="300" r="150" fill="none" stroke="rgba(29,78,216,0.28)" strokeWidth="1.5" />
          <circle cx="720" cy="300" r="210" fill="none" stroke="rgba(29,78,216,0.16)" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="720" y1="20" x2="720" y2="580" stroke="rgba(29,78,216,0.22)" strokeWidth="1" strokeDasharray="2 5" />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute left-[6%] top-[24%] h-12 w-12 bg-blue-600/75" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[7%] top-[20%] h-10 w-10 bg-blue-600/70" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[12%] bottom-[24%] h-8 w-8 bg-blue-700/70" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[14%] bottom-[28%] h-8 w-8 bg-blue-700/70" />

        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="border-l-2 border-blue-700 pl-3 font-mono text-xs font-bold tracking-[0.25em] text-neutral-600">
                /04 VALIDATION
              </p>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-neutral-900 sm:text-5xl">
                VALIDATION
              </h2>
              <p className="mt-2 font-mono text-xs font-bold tracking-[0.25em] text-neutral-900">
                TRUST THROUGH EVIDENCE.
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
                Retrieval verified on synthetic benchmarks to ensure reliable, explainable
                attribution — an in-sample check (n=3), never a generalization claim.
              </p>
            </div>
            <p className="hidden text-right font-mono text-[10px] leading-relaxed tracking-[0.25em] text-neutral-500 lg:block">
              MEASURABLE ACCURACY
              <br />
              FOR A MORE OPEN WEB.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
            {[
              { value: calib ? `${Math.round(calib.top1_accuracy * 100)}%` : "…", label: "TOP-1 RETRIEVAL" },
              { value: calib ? calib.mrr.toFixed(3) : "…", label: "MEAN RECIPROCAL RANK" },
              { value: "3", label: "GROUND-TRUTH PAIRS" },
            ].map((s) => (
              <div
                key={s.label}
                className="relative rounded-lg border border-blue-200/70 bg-white/75 px-6 py-8 text-center shadow-[0_10px_36px_-18px_rgba(29,78,216,0.45)] backdrop-blur"
              >
                {["left-2 top-1", "right-2 top-1", "bottom-1 left-2", "bottom-1 right-2"].map((pos) => (
                  <span key={pos} aria-hidden="true" className={`absolute font-mono text-sm leading-none text-blue-500 ${pos}`}>
                    +
                  </span>
                ))}
                <p className="font-mono text-5xl font-black text-blue-800">{s.value}</p>
                <div className="mx-auto mt-2 h-0.5 w-5 bg-blue-700" />
                <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-neutral-600">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Link
              href="/metrics"
              className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-600"
            >
              View Full Calibration <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 border-t border-neutral-200 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Database, title: "SYNTHETIC EVALUATION", body: "Assessed on ~199 candidates with 3 known rebrand pairs (n=3)." },
              { icon: ListChecks, title: "EXPLAINABLE RESULTS", body: "Every match is backed by traceable evidence and surface patterns." },
              { icon: Shield, title: "NO GENERALIZATION CLAIMS", body: "Stylometry-only retrieval on an in-sample check, not a broad claim." },
              { icon: BarChart3, title: "OPEN METHODOLOGY", body: "Methods and data details available for reproducibility and audit." },
            ].map((f) => (
              <div key={f.title}>
                <span className="flex size-10 items-center justify-center rounded-md bg-blue-700/10">
                  <f.icon className="size-5 text-blue-700" strokeWidth={1.5} />
                </span>
                <h3 className="mt-3 font-mono text-xs font-bold tracking-[0.18em] text-neutral-900">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-600">{f.body}</p>
                <div className="mt-3 h-0.5 w-8 bg-blue-700" />
              </div>
            ))}
          </div>
          <p className="mt-10 text-center font-mono text-[11px] tracking-[0.3em] text-neutral-400">
            DATA × TRANSPARENCY × TRUST
          </p>
        </div>
      </section>

      {/* /05 CTA */}
      <section className="border-t-4 border-blue-700 bg-neutral-900">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.25em] text-blue-400">/05 BEGIN</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Open a case. Follow the evidence.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/watchlist"
              className="bg-blue-700 px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-blue-600"
            >
              View watchlist
            </Link>
            <Link
              href="/export"
              className="border border-neutral-600 px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:border-white"
            >
              Export reports
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
