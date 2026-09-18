"use client";

import axios from "axios";
import { LoaderCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ActorProfile from "@/components/ActorProfile";
import { api, type Actor } from "@/lib/api";

type PageState = "loading" | "ready" | "not-found" | "error";

export default function ActorPage() {
  const { id } = useParams<{ id: string }>();
  const [actor, setActor] = useState<Actor | null>(null);
  const [state, setState] = useState<PageState>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setActor(null);

    async function loadActor() {
      try {
        const response = await api.getActor(id);
        if (!cancelled) {
          setActor(response);
          setState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setState(axios.isAxiosError(error) && error.response?.status === 404 ? "not-found" : "error");
        }
      }
    }

    void loadActor();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "loading") {
    return <PageMessage icon={<LoaderCircle className="size-6 animate-spin" />} message="Loading actor profile…" />;
  }

  if (state === "not-found") {
    return <PageMessage message="Actor not found." />;
  }

  if (state === "error" || !actor) {
    return <PageMessage message="The actor API is unreachable. Check that the backend is running and try again." />;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <ActorProfile actor={actor} />
      </div>
    </main>
  );
}

function PageMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-700">
      <p className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        {icon}
        {message}
      </p>
    </main>
  );
}
