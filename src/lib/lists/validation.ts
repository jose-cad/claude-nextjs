import { z } from "zod";
import { LIST_TYPES, type ListType } from "./types";

export const addListItemSchema = z.object({
  tmdbMovieId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().startsWith("/").max(200).nullable(),
  listType: z.enum(LIST_TYPES),
});

export function parseListType(value: string | null): ListType | null {
  return (LIST_TYPES as readonly string[]).includes(value ?? "") ? (value as ListType) : null;
}
