import { isOnNetflix } from "@/lib/netflix";
import type { TmdbFetch } from "./client";
import type {
  CatalogSort,
  Genre,
  MovieDetails,
  MovieSummary,
  Page,
  TmdbDetails,
  TmdbMovieResult,
  TmdbPaged,
  TmdbProviders,
  TmdbVideo,
} from "./types";

export const MAX_PAGES = 500; // o TMDB não entrega além da página 500
export const MIN_VOTES_TOP_RATED = 200;
const LANGUAGE = "pt-BR";
const REGION = "BR";
const HOUR = 60 * 60;

/** Prazos (em segundos) do cache de dados do Next.js para cada tipo de resposta. */
export const REVALIDATE = {
  catalog: 6 * HOUR,
  search: 6 * HOUR,
  details: 24 * HOUR,
  providers: 24 * HOUR,
  genres: 7 * 24 * HOUR,
};

export function toYear(date: string | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export function toSummary(movie: TmdbMovieResult, onNetflix: boolean | null): MovieSummary {
  return { id: movie.id, title: movie.title, posterPath: movie.poster_path ?? null, year: toYear(movie.release_date), onNetflix };
}

export function pickTrailerUrl(videos: TmdbVideo[] | undefined): string | null {
  const trailers = (videos ?? []).filter((v) => v.site === "YouTube" && v.type === "Trailer");
  const best = trailers.find((v) => v.iso_639_1 === "pt") ?? trailers.find((v) => v.iso_639_1 === "en") ?? trailers[0];
  return best ? `https://www.youtube.com/watch?v=${best.key}` : null;
}

export type MovieService = ReturnType<typeof createMovieService>;

export function createMovieService({ tmdb, netflixIds }: { tmdb: TmdbFetch; netflixIds: number[] }) {
  async function getNetflixAvailability(movieId: number): Promise<boolean> {
    const providers = (await tmdb(`/movie/${movieId}/watch/providers`, {}, REVALIDATE.providers)) as TmdbProviders;
    return isOnNetflix(providers, netflixIds, REGION);
  }

  async function availabilityOrNull(movieId: number): Promise<boolean | null> {
    try {
      return await getNetflixAvailability(movieId);
    } catch {
      return null;
    }
  }

  return {
    getNetflixAvailability,

    async discoverNetflix({ page, genreId, sort }: { page: number; genreId?: number; sort: CatalogSort }): Promise<Page<MovieSummary>> {
      const data = (await tmdb(
        "/discover/movie",
        {
          language: LANGUAGE,
          watch_region: REGION,
          with_watch_providers: netflixIds.join("|"),
          with_watch_monetization_types: "flatrate",
          sort_by: sort === "top_rated" ? "vote_average.desc" : "popularity.desc",
          "vote_count.gte": sort === "top_rated" ? MIN_VOTES_TOP_RATED : undefined,
          with_genres: genreId,
          include_adult: "false",
          page,
        },
        REVALIDATE.catalog,
      )) as TmdbPaged<TmdbMovieResult>;
      return {
        items: data.results.map((m) => toSummary(m, true)),
        page: data.page,
        totalPages: Math.min(data.total_pages, MAX_PAGES),
      };
    },

    async searchMovies(query: string, page: number): Promise<Page<MovieSummary>> {
      const data = (await tmdb(
        "/search/movie",
        { query, language: LANGUAGE, include_adult: "false", page },
        REVALIDATE.search,
      )) as TmdbPaged<TmdbMovieResult>;
      const items = await Promise.all(data.results.map(async (m) => toSummary(m, await availabilityOrNull(m.id))));
      return { items, page: data.page, totalPages: Math.min(data.total_pages, MAX_PAGES) };
    },

    async getMovieDetails(movieId: number): Promise<MovieDetails> {
      const d = (await tmdb(
        `/movie/${movieId}`,
        { language: LANGUAGE, append_to_response: "credits,videos,watch/providers", include_video_language: "pt,en" },
        REVALIDATE.details,
      )) as TmdbDetails;
      return {
        ...toSummary(d, isOnNetflix(d["watch/providers"], netflixIds, REGION)),
        overview: d.overview?.trim() || null,
        runtimeMinutes: d.runtime || null,
        genres: (d.genres ?? []).map((g) => g.name),
        cast: [...(d.credits?.cast ?? [])]
          .sort((a, b) => a.order - b.order)
          .slice(0, 5)
          .map((c) => c.name),
        trailerUrl: pickTrailerUrl(d.videos?.results),
        backdropPath: d.backdrop_path ?? null,
      };
    },

    async getGenres(): Promise<Genre[]> {
      const data = (await tmdb("/genre/movie/list", { language: LANGUAGE }, REVALIDATE.genres)) as { genres: Genre[] };
      return [...data.genres].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  };
}
