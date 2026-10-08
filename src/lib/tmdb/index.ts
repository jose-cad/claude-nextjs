import "server-only";
import { getEnv } from "@/lib/env";
import { createTmdbFetch } from "./client";
import { createMovieService, type MovieService } from "./movies";

let cached: MovieService | undefined;

export function getMovieService(): MovieService {
  if (!cached) {
    const env = getEnv();
    cached = createMovieService({
      tmdb: createTmdbFetch({ baseUrl: env.TMDB_BASE_URL, token: env.TMDB_API_TOKEN }),
      netflixIds: env.NETFLIX_PROVIDER_IDS,
    });
  }
  return cached;
}
