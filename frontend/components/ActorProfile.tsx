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
  active: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
  rebranded: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  inactive: "bg-neutral-100 text-neutral-500 border border-neutral-300",
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
      <header className="border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-none bg-blue-600/10 border border-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {actor.category}
          </span>
          <span className={`rounded-none px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[actor.status]}`}>
            {actor.status}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">{actor.primary_handle}</h1>
        <div className="mt-5 max-w-md">
          <ConfidenceBadge score={actor.confidence} breakdown={actor.confidence_breakdown} />
        </div>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Relationship Graph</h2>
        <p className="mt-1 text-xs text-neutral-500">Structured links between this actor and its rebrand/identifier network.</p>
        <div className="mt-3">
          <GraphViewer actorId={actor.id} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Infrastructure Correlation</h2>
        <p className="mt-1 text-xs text-neutral-500">Clearnet IP matches, SSL certs, and descriptor anomalies.</p>
        <div className="mt-3 space-y-4">
          {!hasHiddenServices ? (
            <p className="text-sm text-neutral-500">This actor has no known hidden service infrastructure.</p>
          ) : (
            actor.hidden_services.map((onion) => (
              <InfraCorrelationView key={onion} onionAddress={onion} />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Confirmed Identifiers</h2>
        <p className="mt-1 text-xs text-neutral-500">Structured, provenance-tracked facts.</p>
        <ul className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-none border border-neutral-200 bg-white">
          {actor.identifiers.map((identifier) => (
            <li key={`${identifier.type}:${identifier.value}`} className="p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase text-neutral-600">
                  {identifier.type}
                </span>
                <code className="break-all text-sm font-mono text-blue-700">{identifier.value}</code>
              </div>
              {identifier.platform && <p className="mt-2 text-xs text-neutral-500">Platform: {identifier.platform}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Linked Actors</h2>
        {!hasLinkages ? (
          <p className="mt-3 text-sm text-neutral-500">No known linkages.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {actor.linked_actors.map((linkedActor) => (
              <li key={linkedActor.actor_id} className="rounded-none border border-neutral-200 bg-white p-4">
                <Link href={`/actors/${linkedActor.actor_id}`} className="font-semibold text-blue-700 hover:underline">
                  {linkedActor.primary_handle}
                </Link>
                <p className="mt-2 text-sm text-neutral-600">
                  Shared {linkedActor.shared_type}: <code className="break-all font-mono text-blue-700 text-xs">{linkedActor.shared_value}</code>
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Identifier match score: {Math.round(linkedActor.identifier_match_score * 100)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Posts</h2>
        <div className="mt-3 space-y-4">
          {actor.posts.map((post) => {
            const extraction = extractions[post.id] ?? { status: "idle" };

            return (
              <article key={post.id} className="rounded-none border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                  <span className="font-medium text-neutral-600">{post.platform}</span>
                  <time dateTime={post.timestamp}>{post.timestamp.slice(0, 10)}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-800 leading-relaxed">{post.raw_text}</p>
                <button
                  type="button"
                  onClick={() => extractPost(post.id)}
                  disabled={extraction.status === "loading"}
                  className="mt-4 inline-flex items-center gap-2 rounded-none bg-neutral-100 border border-neutral-300 px-3.5 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {extraction.status === "loading" && <LoaderCircle className="size-4 animate-spin text-blue-700" />}
                  Extract Identifiers
                </button>

                {extraction.status === "error" && (
                  <p className="mt-3 text-xs text-red-600" role="alert">
                    Identifier extraction is unavailable for this post. Please try again.
                  </p>
                )}

                {extraction.status === "success" && (
                  <div className="mt-4 rounded-none border border-amber-500/30 bg-amber-50/20 p-4 text-amber-800">
                    <span className="rounded-none bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Unconfirmed (from text)
                    </span>
                    {extraction.data.extracted_identifiers.length === 0 ? (
                      <p className="mt-2 text-xs text-neutral-600">No identifier-shaped values were found in this post.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {extraction.data.extracted_identifiers.map((identifier) => (
                          <li key={`${identifier.type}:${identifier.value}`} className="break-all text-xs">
                            <span className="font-semibold uppercase text-neutral-600">{identifier.type}</span>:{" "}
                            <code className="font-mono text-blue-700">{identifier.value}</code>
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
