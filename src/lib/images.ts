const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500";

export function posterUrl(path: string | null, size: PosterSize): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
