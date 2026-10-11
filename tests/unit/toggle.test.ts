import { describe, expect, it } from "vitest";
import { applyToggle } from "@/lib/lists/toggle";
import type { ListItemDto } from "@/lib/lists/types";

const now = new Date("2026-10-04T10:00:00Z");
const filme = { tmdbMovieId: 1, title: "Filme 1", posterPath: null };
const item = (id: number, listType: "want" | "favorite"): ListItemDto => ({
  tmdbMovieId: id,
  title: `Filme ${id}`,
  posterPath: null,
  listType,
  createdAt: "2026-10-01T00:00:00.000Z",
  onNetflix: true,
});

describe("applyToggle", () => {
  it("adiciona no topo da lista", () => {
    const result = applyToggle([item(2, "want")], filme, "want", true, now);
    expect(result.map((i) => i.tmdbMovieId)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({ listType: "want", createdAt: now.toISOString(), onNetflix: null });
  });

  it("favoritar tira de Quero assistir", () => {
    expect(applyToggle([item(1, "want")], filme, "favorite", true, now).map((i) => i.listType)).toEqual(["favorite"]);
  });

  it("não duplica se já estiver na lista", () => {
    expect(applyToggle([item(1, "want")], filme, "want", true, now)).toHaveLength(1);
  });

  it("remove da lista", () => {
    expect(applyToggle([item(1, "want"), item(1, "favorite")], filme, "want", false, now).map((i) => i.listType)).toEqual(["favorite"]);
  });
});
