"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteMovies } from "@/hooks/useInfiniteMovies";
import { apiFetch } from "@/lib/api-client";
import type { CatalogSort, Genre, MovieSummary } from "@/lib/tmdb/types";
import { CatalogToolbar } from "./CatalogToolbar";
import { InfiniteSentinel } from "./InfiniteSentinel";
import { ListButtons } from "./lists/ListButtons";
import { useLists } from "./lists/ListsProvider";
import { MovieGrid } from "./MovieGrid";
import { MovieModal } from "./MovieModal";
import { StatusMessage } from "./StatusMessage";

export function CatalogView() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [sort, setSort] = useState<CatalogSort>("popular");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<MovieSummary | null>(null);
  const { marksFor } = useLists();

  useEffect(() => {
    apiFetch<{ genres: Genre[] }>("/api/generos")
      .then((data) => setGenres(data.genres))
      .catch(() => setGenres([])); // sem gêneros, o filtro mostra só "Todos os gêneros"
  }, []);

  const searching = debouncedQuery !== "";
  const url = searching
    ? `/api/busca?q=${encodeURIComponent(debouncedQuery)}`
    : `/api/catalogo?ordem=${sort}${genreId ? `&genero=${genreId}` : ""}`;
  const { items, loading, error, hasMore, loadMore } = useInfiniteMovies(url);

  return (
    <>
      <CatalogToolbar
        query={query}
        onQueryChange={setQuery}
        genreId={genreId}
        onGenreChange={setGenreId}
        sort={sort}
        onSortChange={setSort}
        genres={genres}
      />
      <MovieGrid movies={items} showBadges={searching} getMarks={marksFor} onSelect={setSelected} />
      {error && <StatusMessage>{error}</StatusMessage>}
      {!error && !loading && items.length === 0 && <StatusMessage>Nenhum filme encontrado.</StatusMessage>}
      {loading && <StatusMessage>Carregando...</StatusMessage>}
      <InfiniteSentinel onVisible={loadMore} disabled={Boolean(error) || loading || !hasMore} watchKey={items.length} />
      <MovieModal movie={selected} onClose={() => setSelected(null)} actions={(movie) => <ListButtons movie={movie} />} />
    </>
  );
}
