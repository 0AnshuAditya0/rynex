'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataSet, Network } from "vis-network/standalone";

import { api, type GraphResponse } from "@/lib/api";

type GraphState = "loading" | "ready" | "empty" | "error";

const TYPE_COLORS: Record<string, string> = {
  actor: "#0f172a",
  handle: "#38bdf8",
  pgp: "#a78bfa",
  wallet: "#fbbf24",
};

function formatNodeLabel(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}...`;
}

export default function GraphViewer({ actorId }: { actorId: string }) {
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
            background: TYPE_COLORS[type] ?? "#94a3b8",
          },
          font: {
            color: "#f8fafc",
            face: "Inter, sans-serif",
            vadjust: 0,
          },
        };
      }),
    );

    const edges = new DataSet(
      graph.edges.map((edge) => ({
        id: edge.data.id ?? `${edge.data.source}-${edge.data.target}`,
        from: edge.data.source,
        to: edge.data.target,
        label: edge.data.label,
        color: edge.data.label === "SAME_AS" ? "#f97316" : "#475569",
        dashes: edge.data.label === "SAME_AS",
        width: edge.data.label === "SAME_AS" ? 3 : 1,
        font: {
          color: "#94a3b8",
        },
      })),
    );

    const options = {
      autoResize: true,
      height: "100%",
      width: "100%",
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 2,
        color: {
          border: "#1e293b",
        },
        font: {
          color: "#f8fafc",
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
    <div className="rounded-lg border border-slate-800 bg-[#121827] p-3 shadow-sm">
      {state === "loading" && (
        <div className="flex h-[430px] items-center justify-center text-sm text-slate-400">
          Loading relationship graph…
        </div>
      )}

      {state === "error" && (
        <div className="flex h-[430px] items-center justify-center text-sm text-red-400">
          Relationship graph is unavailable.
        </div>
      )}

      {state === "empty" && (
        <div className="flex h-[430px] items-center justify-center text-sm text-slate-400">
          No relationship graph data for this actor.
        </div>
      )}

      {state === "ready" && graph && (
        <div
          ref={containerRef}
          className="graph-viewer relative h-[430px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80"
        />
      )}
    </div>
  );
}
