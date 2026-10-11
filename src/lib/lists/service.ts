import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ListItemDto, ListType, MovieSnapshot, StoredListItem } from "./types";

type Client = SupabaseClient<Database>;

const UNIQUE_VIOLATION = "23505";

export async function getListItems(supabase: Client): Promise<StoredListItem[]> {
  const { data, error } = await supabase
    .from("list_items")
    .select("tmdb_movie_id, title, poster_path, list_type, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    tmdbMovieId: row.tmdb_movie_id,
    title: row.title,
    posterPath: row.poster_path,
    listType: row.list_type,
    createdAt: new Date(row.created_at),
  }));
}

/** Salva na lista. Repetir não duplica; o gatilho do banco tira de "want" ao favoritar. */
export async function addToList(supabase: Client, movie: MovieSnapshot, listType: ListType): Promise<void> {
  const { error } = await supabase
    .from("list_items")
    .insert({ tmdb_movie_id: movie.tmdbMovieId, title: movie.title, poster_path: movie.posterPath, list_type: listType });
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
}

export async function removeFromList(supabase: Client, tmdbMovieId: number, listType: ListType): Promise<void> {
  const { error } = await supabase.from("list_items").delete().eq("tmdb_movie_id", tmdbMovieId).eq("list_type", listType);
  if (error) throw new Error(error.message);
}

/** Acrescenta a disponibilidade na Netflix. Se o TMDB falhar, o item segue com onNetflix = null. */
export async function withAvailability(
  items: StoredListItem[],
  availability: (tmdbMovieId: number) => Promise<boolean>,
): Promise<ListItemDto[]> {
  const byMovie = new Map<number, Promise<boolean | null>>();
  for (const item of items) {
    if (!byMovie.has(item.tmdbMovieId)) {
      byMovie.set(item.tmdbMovieId, availability(item.tmdbMovieId).catch(() => null));
    }
  }
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      onNetflix: await byMovie.get(item.tmdbMovieId)!,
    })),
  );
}
