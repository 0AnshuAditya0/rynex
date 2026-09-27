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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    setError(null);

    try {
      const payload = await api.exportActors(format, category);

      if (format === "pdf") {
        downloadBlob(payload as Blob, buildFilename(format));
        return;
      }

      if (format === "html") {
        const blob = new Blob([payload as string], { type: "text/html;charset=utf-8" });
        downloadBlob(blob, buildFilename(format));
        return;
      }

      const content =
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2);

      const blob = new Blob([content], {
        type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
      });
      downloadBlob(blob, buildFilename(format));
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
          className="inline-flex items-center justify-center rounded-none border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "csv" ? "Exporting CSV…" : "Export CSV"}
        </button>

        <button
          type="button"
          onClick={() => void handleExport("json")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-none bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "json" ? "Exporting JSON…" : "Export JSON"}
        </button>

        <button
          type="button"
          onClick={() => void handleExport("pdf")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-none border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "pdf" ? "Exporting PDF…" : "Export PDF report"}
        </button>

        <button
          type="button"
          onClick={() => void handleExport("html")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-none border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "html" ? "Exporting HTML…" : "Export HTML"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
