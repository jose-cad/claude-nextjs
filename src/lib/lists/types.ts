export const LIST_TYPES = ["want", "favorite"] as const;
export type ListType = (typeof LIST_TYPES)[number];

export type MovieSnapshot = { tmdbMovieId: number; title: string; posterPath: string | null };

export type StoredListItem = MovieSnapshot & { listType: ListType; createdAt: Date };

export type ListItemDto = MovieSnapshot & { listType: ListType; createdAt: string; onNetflix: boolean | null };
