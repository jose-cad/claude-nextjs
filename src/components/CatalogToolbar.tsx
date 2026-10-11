"use client";

import type { CatalogSort, Genre } from "@/lib/tmdb/types";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  genreId: number | null;
  onGenreChange: (value: number | null) => void;
  sort: CatalogSort;
  onSortChange: (value: CatalogSort) => void;
  genres: Genre[];
};

const control = "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm disabled:opacity-50";

export function CatalogToolbar({ query, onQueryChange, genreId, onGenreChange, sort, onSortChange, genres }: Props) {
  const searching = query.trim() !== "";
  return (
    <div className="sticky top-0 z-30 space-y-2 border-b border-neutral-800 bg-neutral-950/95 p-2 backdrop-blur md:top-14">
      <input
        type="search"
        aria-label="Buscar filme pelo nome"
        placeholder="Buscar filme pelo nome"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className={`${control} w-full`}
      />
      <div className="flex gap-2">
        <select
          aria-label="Gênero"
          value={genreId ?? ""}
          onChange={(e) => onGenreChange(e.target.value ? Number(e.target.value) : null)}
          disabled={searching}
          className={`${control} flex-1`}
        >
          <option value="">Todos os gêneros</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CatalogSort)}
          disabled={searching}
          className={`${control} flex-1`}
        >
          <option value="popular">Populares</option>
          <option value="top_rated">Mais bem avaliados</option>
        </select>
      </div>
    </div>
  );
}
