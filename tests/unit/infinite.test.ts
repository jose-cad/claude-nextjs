import { describe, expect, it } from "vitest";
import { mergeUnique, nextPage, withPageParam } from "@/lib/infinite";

const m = (id: number) => ({ id, title: `F${id}`, posterPath: null, year: null, onNetflix: true });

describe("rolagem infinita", () => {
  it("nextPage avança até a última página", () => {
    expect(nextPage(0, 3)).toBe(1);
    expect(nextPage(2, 3)).toBe(3);
    expect(nextPage(3, 3)).toBeNull();
    expect(nextPage(1, 0)).toBeNull();
  });

  it("mergeUnique não repete filmes que aparecem em duas páginas", () => {
    expect(mergeUnique([m(1), m(2)], [m(2), m(3)]).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("withPageParam respeita parâmetros existentes", () => {
    expect(withPageParam("/api/catalogo?ordem=popular", 2)).toBe("/api/catalogo?ordem=popular&pagina=2");
    expect(withPageParam("/api/generos", 1)).toBe("/api/generos?pagina=1");
  });
});
