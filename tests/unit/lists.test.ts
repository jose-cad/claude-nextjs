import { describe, expect, it, vi } from "vitest";
import { withAvailability } from "@/lib/lists/service";
import { addListItemSchema, parseListType } from "@/lib/lists/validation";

const item = (id: number, listType: "want" | "favorite" = "want") => ({
  tmdbMovieId: id,
  title: `Filme ${id}`,
  posterPath: null,
  listType,
  createdAt: new Date("2026-10-01T12:00:00Z"),
});

describe("withAvailability", () => {
  it("marca cada item e consulta cada filme uma vez só", async () => {
    const availability = vi.fn(async (id: number) => id === 1);
    const result = await withAvailability([item(1, "want"), item(1, "favorite"), item(2)], availability);
    expect(result.map((r) => r.onNetflix)).toEqual([true, true, false]);
    expect(availability).toHaveBeenCalledTimes(2);
    expect(result[0].createdAt).toBe("2026-10-01T12:00:00.000Z");
  });

  it("com o TMDB fora do ar, a lista continua funcionando", async () => {
    const result = await withAvailability([item(1)], async () => {
      throw new Error("TMDB fora");
    });
    expect(result).toEqual([expect.objectContaining({ tmdbMovieId: 1, onNetflix: null })]);
  });
});

describe("validação", () => {
  it("aceita um item válido", () => {
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: "/a.jpg", listType: "want" }).success).toBe(true);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: null, listType: "favorite" }).success).toBe(true);
  });

  it("recusa dados inválidos", () => {
    expect(addListItemSchema.safeParse({ tmdbMovieId: -1, title: "X", posterPath: null, listType: "want" }).success).toBe(false);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "", posterPath: null, listType: "want" }).success).toBe(false);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: "http://x", listType: "want" }).success).toBe(false);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: null, listType: "outra" }).success).toBe(false);
  });

  it("parseListType", () => {
    expect(parseListType("want")).toBe("want");
    expect(parseListType("favorite")).toBe("favorite");
    expect(parseListType("x")).toBeNull();
    expect(parseListType(null)).toBeNull();
  });
});
