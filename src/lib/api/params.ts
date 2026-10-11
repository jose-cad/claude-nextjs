import type { CatalogSort } from "@/lib/tmdb/types";

export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}

export function parseGenreId(value: string | null): number | undefined {
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : undefined;
}

export function parseSort(value: string | null): CatalogSort {
  return value === "top_rated" ? "top_rated" : "popular";
}

export function parseMovieId(value: string | null | undefined): number | null {
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : null;
}

export function parseQuery(value: string | null): string {
  return (value ?? "").trim().slice(0, 100);
}
