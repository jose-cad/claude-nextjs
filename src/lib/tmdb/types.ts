// ── Tipos do app ───────────────────────────────────────────────────
export type MovieSummary = {
  id: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  /** true/false = sabemos; null = não deu para verificar */
  onNetflix: boolean | null;
};

export type MovieDetails = MovieSummary & {
  overview: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  cast: string[];
  trailerUrl: string | null;
  backdropPath: string | null;
};

export type Page<T> = { items: T[]; page: number; totalPages: number };

export type Genre = { id: number; name: string };

export type CatalogSort = "popular" | "top_rated";

// ── Formato das respostas do TMDB ──────────────────────────────────
export type TmdbMovieResult = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
};

export type TmdbPaged<T> = { page: number; total_pages: number; results: T[] };

export type TmdbProviders = {
  results?: Record<string, { flatrate?: { provider_id: number }[] }>;
};

export type TmdbVideo = { key: string; site: string; type: string; iso_639_1: string };

export type TmdbDetails = TmdbMovieResult & {
  overview?: string;
  runtime?: number | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[];
  credits?: { cast?: { name: string; order: number }[] };
  videos?: { results?: TmdbVideo[] };
  "watch/providers"?: TmdbProviders;
};
