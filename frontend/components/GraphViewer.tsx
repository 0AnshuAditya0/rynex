'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataSet, Network } from "vis-network/standalone";

import { api, type GraphResponse } from "@/lib/api";

type GraphState = "loading" | "ready" | "empty" | "error";

const TYPE_COLORS: Record<string, string> = {
  actor: "#1d4ed8",
  handle: "#2563eb",
  pgp: "#1e40af",
  wallet: "#b45309",
};

function formatNodeLabel(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}...`;
}

export default function GraphViewer({ actorId, heightPx = 430 }: { actorId: string; heightPx?: number }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);
  const actorIdRef = useRef(actorId);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [state, setState] = useState<GraphState>("loading");

  useEffect(() => {
    actorIdRef.current = actorId;
  }, [actorId]);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setGraph(null);

    async function loadGraph() {
      try {
        const response = await api.getGraph(actorId);
        if (cancelled) return;

        setGraph(response);
        setState(response.nodes.length === 0 ? "empty" : "ready");
      } catch {
        if (!cancelled) {
          setGraph(null);
          setState("error");
        }
      }
    }

    void loadGraph();
    return () => {
      cancelled = true;
    };
  }, [actorId]);

  useEffect(() => {
    if (!containerRef.current || !graph) {
      return;
    }

    const nodes = new DataSet(
      graph.nodes.map((node) => {
        const type = String(node.data.type ?? "handle");
        return {
          id: node.data.id,
          label: formatNodeLabel(node.data.label),
          title: node.data.label,
          type,
          shape: "dot",
          size: type === "actor" ? 30 : 14,
          color: {
            background: TYPE_COLORS[type] ?? "#9ca3af",
          },
          font: {
            color: "#111827",
            face: "Inter, sans-serif",
            vadjust: 0,
          },
        };
      }),
    );

    const edges = new DataSet(
      graph.edges.map((edge) => {
        const label = edge.data.label;
        // SAME_AS (confirmed rebrand): thick dashed blue.
        // TRUSTS (weak signal): thin dotted gray, no arrow — never conflate.
        const isSameAs = label === "SAME_AS";
        const isTrusts = label === "TRUSTS";
        return {
          id: edge.data.id ?? `${edge.data.source}-${edge.data.target}`,
          from: edge.data.source,
          to: edge.data.target,
          label,
          title: edge.data.evidence ?? label,
          color: isSameAs ? "#1d4ed8" : isTrusts ? "#9ca3af" : "#d1d5db",
          dashes: isSameAs ? true : isTrusts ? [2, 4] : false,
          width: isSameAs ? 3 : 1,
          font: {
            color: "#6b7280",
          },
        };
      }),
    );

    const options = {
      autoResize: true,
      height: "100%",
      width: "100%",
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 2,
        color: {
          border: "#ffffff",
        },
        font: {
          color: "#111827",
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: "dynamic",
          roundness: 0.2,
        },
        arrows: {
          to: { enabled: false },
        },
      },
      interaction: {
        hover: true,
        multiselect: false,
        navigationButtons: false,
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.2,
          springLength: 130,
          springConstant: 0.05,
        },
        stabilization: {
          iterations: 200,
          fit: true,
        },
      },
    };

    if (!networkRef.current) {
      networkRef.current = new Network(
        containerRef.current,
        { nodes, edges },
        options,
      );

      networkRef.current.on("click", (params) => {
        if (!params.nodes || params.nodes.length === 0) {
          return;
        }

        const nodeId = String(params.nodes[0]);
        const node = nodes.get(nodeId) as { type?: string } | undefined;

        if (node?.type === "actor" && nodeId !== actorIdRef.current) {
          void router.push(`/actors/${encodeURIComponent(nodeId)}`);
        }
      });
    } else {
      networkRef.current.setData({ nodes, edges });
      networkRef.current.setOptions(options);
    }

    networkRef.current.fit({ animation: false });
    networkRef.current.stabilize(200);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graph, router]);

  return (
    <div className="rounded-none border border-neutral-200 bg-white p-3">
      {state === "loading" && (
        <div className="flex items-center justify-center text-sm text-neutral-500" style={{ height: heightPx }}>
          Loading relationship graph…
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center justify-center text-sm text-red-600" style={{ height: heightPx }}>
          Relationship graph is unavailable.
        </div>
      )}

      {state === "empty" && (
        <div className="flex items-center justify-center text-sm text-neutral-500" style={{ height: heightPx }}>
          No relationship graph data for this actor.
        </div>
      )}

      {state === "ready" && graph && (
        <>
          <div
            ref={containerRef}
            className="graph-viewer relative w-full overflow-hidden rounded-none border border-neutral-200 bg-white"
            style={{ height: heightPx }}
          />
          {(graph.trust_hidden ?? 0) > 0 && (
            <p className="mt-2 text-[11px] text-neutral-400">
              Showing top {graph.trust_shown ?? 0} trust links ({graph.trust_total ?? 0} total);{" "}
              {graph.trust_hidden} additional platform-overlap{" "}
              {(graph.trust_hidden ?? 0) === 1 ? "link" : "links"} not shown.
            </p>
          )}
        </>
      )}
    </div>
  );
}
