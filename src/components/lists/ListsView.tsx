"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieModal } from "@/components/MovieModal";
import { StatusMessage } from "@/components/StatusMessage";
import type { ListType } from "@/lib/lists/types";
import type { MovieSummary } from "@/lib/tmdb/types";
import { ListButtons } from "./ListButtons";
import { useLists } from "./ListsProvider";

const TABS: { listType: ListType; label: string }[] = [
  { listType: "want", label: "Quero assistir" },
  { listType: "favorite", label: "Favoritos" },
];

export function ListsView() {
  const { user, openAuth } = useAuth();
  const { items, loaded, error, marksFor } = useLists();
  const [tab, setTab] = useState<ListType>("want");
  const [selected, setSelected] = useState<MovieSummary | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="text-sm text-neutral-300">Entre para ver suas listas.</p>
        <button type="button" onClick={() => openAuth()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
          Entrar
        </button>
      </div>
    );
  }

  const movies: MovieSummary[] = items
    .filter((i) => i.listType === tab)
    .map((i) => ({ id: i.tmdbMovieId, title: i.title, posterPath: i.posterPath, year: null, onNetflix: i.onNetflix }));

  return (
    <>
      <div role="tablist" aria-label="Minhas listas" className="sticky top-0 z-30 flex border-b border-neutral-800 bg-neutral-950/95 backdrop-blur md:top-14">
        {TABS.map((t) => (
          <button
            key={t.listType}
            type="button"
            role="tab"
            aria-selected={tab === t.listType}
            onClick={() => setTab(t.listType)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t.listType ? "border-b-2 border-red-600 text-white" : "text-neutral-400"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <StatusMessage>{error}</StatusMessage>}
      {!error && !loaded && <StatusMessage>Carregando...</StatusMessage>}
      {!error && loaded && movies.length === 0 && <StatusMessage>Nenhum filme aqui ainda.</StatusMessage>}
      <MovieGrid movies={movies} showBadges getMarks={marksFor} onSelect={setSelected} />
      <MovieModal movie={selected} onClose={() => setSelected(null)} actions={(movie) => <ListButtons movie={movie} />} />
    </>
  );
}
