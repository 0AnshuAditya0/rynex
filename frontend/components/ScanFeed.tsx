"use client";

import { useCallback, useEffect, useState } from "react";

import { api, type ScanStatus } from "@/lib/api";

export default function ScanFeed() {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.getScanStatus());
    } catch {
      setError("Scan feed unreachable.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const trigger = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.triggerScan();
      await refresh();
    } catch {
      setError("Trigger failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-none border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            Autonomous Collection{" "}
            <span className="ml-2 border border-amber-500/50 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold tracking-widest text-amber-700">
              SIMULATED FEED
            </span>
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Stands in for Tor crawler + scheduler. Each tick appends one clearly-marked demo post in-memory. No live
            Tor crawling.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void trigger()}
          disabled={loading}
          className="bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Ticking…" : "Trigger scan tick"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="border border-neutral-200 bg-neutral-50 p-3">
          <p className="font-mono text-[11px] tracking-widest text-neutral-500">TICKS</p>
          <p className="font-mono text-xl font-bold text-neutral-900">{status?.tick ?? "—"}</p>
        </div>
        <div className="border border-neutral-200 bg-neutral-50 p-3">
          <p className="font-mono text-[11px] tracking-widest text-neutral-500">LAST SCAN</p>
          <p className="font-mono text-xs font-bold text-neutral-900">{status?.last_scan ?? "never"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(status?.recent_events ?? []).slice().reverse().map((e) => (
          <div key={e.tick} className="border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">
            <span className="font-bold text-blue-700">tick {e.tick}</span>
            <span className="text-neutral-400"> · </span>
            <span className="font-bold text-neutral-900">{e.primary_handle}</span>
            <span className="text-neutral-400"> · {e.post_id} · {e.timestamp}</span>
          </div>
        ))}
        {(status?.recent_events ?? []).length === 0 && (
          <p className="text-xs text-neutral-500">No ticks yet — press trigger to simulate a collection cycle.</p>
        )}
      </div>
    </section>
  );
}
