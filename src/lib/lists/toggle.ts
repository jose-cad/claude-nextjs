import type { ListItemDto, ListType, MovieSnapshot } from "./types";

/** Atualização otimista da tela; espelha as regras do banco (o gatilho de favoritos). */
export function applyToggle(items: ListItemDto[], movie: MovieSnapshot, listType: ListType, on: boolean, now: Date): ListItemDto[] {
  const same = (i: ListItemDto, type: ListType) => i.tmdbMovieId === movie.tmdbMovieId && i.listType === type;
  if (!on) return items.filter((i) => !same(i, listType));
  if (items.some((i) => same(i, listType))) return items;
  const rest = listType === "favorite" ? items.filter((i) => !same(i, "want")) : items;
  return [{ ...movie, listType, createdAt: now.toISOString(), onNetflix: null }, ...rest];
}
