"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ConfidenceBadge from "@/components/ConfidenceBadge";
import {
  api,
  type Actor,
  type ActorStatus,
  type PostExtractionResponse,
} from "@/lib/api";

const statusStyles: Record<ActorStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  rebranded: "bg-amber-100 text-amber-800",
  inactive: "bg-zinc-200 text-zinc-700",
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

  return (
    <article className="space-y-8">
      <header className="border-b border-zinc-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sm font-medium text-sky-800">
            {actor.category}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${statusStyles[actor.status]}`}>
            {actor.status}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">{actor.primary_handle}</h1>
        <div className="mt-5 max-w-md">
          <ConfidenceBadge score={actor.confidence} breakdown={actor.confidence_breakdown} />
        </div>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-zinc-950">Confirmed identifiers</h2>
        <p className="mt-1 text-sm text-zinc-600">Structured, provenance-tracked facts.</p>
        <ul className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {actor.identifiers.map((identifier) => (
            <li key={`${identifier.type}:${identifier.value}`} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase text-zinc-700">
                  {identifier.type}
                </span>
                <code className="break-all text-sm text-zinc-900">{identifier.value}</code>
              </div>
              {identifier.platform && <p className="mt-2 text-sm text-zinc-600">Platform: {identifier.platform}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-950">Linked actors</h2>
        {!hasLinkages ? (
          <p className="mt-3 text-zinc-600">No known linkages.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {actor.linked_actors.map((linkedActor) => (
              <li key={linkedActor.actor_id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <Link href={`/actors/${linkedActor.actor_id}`} className="font-semibold text-sky-800 hover:underline">
                  {linkedActor.primary_handle}
                </Link>
                <p className="mt-2 text-sm text-zinc-700">
                  Shared {linkedActor.shared_type}: <code className="break-all">{linkedActor.shared_value}</code>
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Identifier match score: {Math.round(linkedActor.identifier_match_score * 100)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-950">Posts</h2>
        <div className="mt-3 space-y-4">
          {actor.posts.map((post) => {
            const extraction = extractions[post.id] ?? { status: "idle" };

            return (
              <article key={post.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
                  <span>{post.platform}</span>
                  <time dateTime={post.timestamp}>{new Date(post.timestamp).toLocaleDateString()}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-zinc-900">{post.raw_text}</p>
                <button
                  type="button"
                  onClick={() => extractPost(post.id)}
                  disabled={extraction.status === "loading"}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {extraction.status === "loading" && <LoaderCircle className="size-4 animate-spin" />}
                  Extract Identifiers
                </button>

                {extraction.status === "error" && (
                  <p className="mt-3 text-sm text-red-700" role="alert">
                    Identifier extraction is unavailable for this post. Please try again.
                  </p>
                )}

                {extraction.status === "success" && (
                  <div className="mt-4 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-amber-950">
                    <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                      Unconfirmed (from text)
                    </span>
                    {extraction.data.extracted_identifiers.length === 0 ? (
                      <p className="mt-3 text-sm">No identifier-shaped values were found in this post.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {extraction.data.extracted_identifiers.map((identifier) => (
                          <li key={`${identifier.type}:${identifier.value}`} className="break-all text-sm">
                            <span className="font-semibold uppercase">{identifier.type}</span>: {identifier.value}
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
