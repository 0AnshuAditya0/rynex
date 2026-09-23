"use client";

import { useState } from "react";

import { api, type ExportFormat } from "@/lib/api";

export default function ExportButton({ category }: { category?: string }) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildFilename = (format: ExportFormat) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const label = category && category.trim() ? category : "all";
    return `rynex-export-${label}-${timestamp}.${format}`;
  };

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    setError(null);

    try {
      const payload = await api.exportActors(format, category);

      const content =
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2);

      const blob = new Blob([content], {
        type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildFilename(format);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleExport("csv")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
        >
          {loading === "csv" ? "Exporting CSV…" : "Export CSV"}
        </button>

        <button
          type="button"
          onClick={() => void handleExport("json")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
        >
          {loading === "json" ? "Exporting JSON…" : "Export JSON"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
