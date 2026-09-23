"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ConfidenceBadge from "@/components/ConfidenceBadge";
import GraphViewer from "@/components/GraphViewer";
import InfraCorrelationView from "@/components/InfraCorrelationView";
import {
  api,
  type Actor,
  type ActorStatus,
  type PostExtractionResponse,
} from "@/lib/api";

const statusStyles: Record<ActorStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  rebranded: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  inactive: "bg-slate-800 text-slate-400 border border-slate-700",
};

type ExtractionState =
  | { status: "idle" | "loading" | "error" }
  | { status: "success"; data: PostExtractionResponse };

export default function ActorProfile({ actor }: { actor: Actor }) {
  const [extractions, setExtractions] = useState<Record<string, ExtractionState>>({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  async function extractPost(postId: string) {
    setExtractions((current) => ({ ...current, [postId]: { status: "loading" } }));

    try {
      const data = await api.extractPost(postId);
      if (!cancelledRef.current) {
        setExtractions((current) => ({ ...current, [postId]: { status: "success", data } }));
      }
    } catch {
      if (!cancelledRef.current) {
        setExtractions((current) => ({ ...current, [postId]: { status: "error" } }));
      }
    }
  }

  const hasLinkages = actor.entity_link !== null || actor.linked_actors.length > 0;
  const hasHiddenServices = actor.hidden_services && actor.hidden_services.length > 0;

  return (
    <article className="space-y-8">
      <header className="border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-400">
            {actor.category}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[actor.status]}`}>
            {actor.status}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-100">{actor.primary_handle}</h1>
        <div className="mt-5 max-w-md">
          <ConfidenceBadge score={actor.confidence} breakdown={actor.confidence_breakdown} />
        </div>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Relationship Graph</h2>
        <p className="mt-1 text-xs text-slate-400">Structured links between this actor and its rebrand/identifier network.</p>
        <div className="mt-3">
          <GraphViewer actorId={actor.id} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Infrastructure Correlation</h2>
        <p className="mt-1 text-xs text-slate-400">Clearnet IP matches, SSL certs, and descriptor anomalies.</p>
        <div className="mt-3 space-y-4">
          {!hasHiddenServices ? (
            <p className="text-sm text-slate-400">This actor has no known hidden service infrastructure.</p>
          ) : (
            actor.hidden_services.map((onion) => (
              <InfraCorrelationView key={onion} onionAddress={onion} />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Confirmed Identifiers</h2>
        <p className="mt-1 text-xs text-slate-400">Structured, provenance-tracked facts.</p>
        <ul className="mt-3 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 bg-[#121827]">
          {actor.identifiers.map((identifier) => (
            <li key={`${identifier.type}:${identifier.value}`} className="p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold uppercase text-slate-300">
                  {identifier.type}
                </span>
                <code className="break-all text-sm font-mono text-sky-400">{identifier.value}</code>
              </div>
              {identifier.platform && <p className="mt-2 text-xs text-slate-400">Platform: {identifier.platform}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Linked Actors</h2>
        {!hasLinkages ? (
          <p className="mt-3 text-sm text-slate-400">No known linkages.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {actor.linked_actors.map((linkedActor) => (
              <li key={linkedActor.actor_id} className="rounded-lg border border-slate-800 bg-[#121827] p-4">
                <Link href={`/actors/${linkedActor.actor_id}`} className="font-semibold text-sky-400 hover:underline">
                  {linkedActor.primary_handle}
                </Link>
                <p className="mt-2 text-sm text-slate-300">
                  Shared {linkedActor.shared_type}: <code className="break-all font-mono text-sky-400 text-xs">{linkedActor.shared_value}</code>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Identifier match score: {Math.round(linkedActor.identifier_match_score * 100)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Posts</h2>
        <div className="mt-3 space-y-4">
          {actor.posts.map((post) => {
            const extraction = extractions[post.id] ?? { status: "idle" };

            return (
              <article key={post.id} className="rounded-lg border border-slate-800 bg-[#121827] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{post.platform}</span>
                  <time dateTime={post.timestamp}>{new Date(post.timestamp).toLocaleDateString()}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">{post.raw_text}</p>
                <button
                  type="button"
                  onClick={() => extractPost(post.id)}
                  disabled={extraction.status === "loading"}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {extraction.status === "loading" && <LoaderCircle className="size-4 animate-spin text-sky-400" />}
                  Extract Identifiers
                </button>

                {extraction.status === "error" && (
                  <p className="mt-3 text-xs text-red-400" role="alert">
                    Identifier extraction is unavailable for this post. Please try again.
                  </p>
                )}

                {extraction.status === "success" && (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-amber-200">
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                      Unconfirmed (from text)
                    </span>
                    {extraction.data.extracted_identifiers.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-300">No identifier-shaped values were found in this post.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {extraction.data.extracted_identifiers.map((identifier) => (
                          <li key={`${identifier.type}:${identifier.value}`} className="break-all text-xs">
                            <span className="font-semibold uppercase text-slate-300">{identifier.type}</span>:{" "}
                            <code className="font-mono text-sky-400">{identifier.value}</code>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </article>
  );
}
