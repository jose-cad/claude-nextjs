import type { TmdbProviders } from "@/lib/tmdb/types";

export function isOnNetflix(providers: TmdbProviders | undefined, netflixIds: number[], region = "BR"): boolean {
  return providers?.results?.[region]?.flatrate?.some((p) => netflixIds.includes(p.provider_id)) ?? false;
}
