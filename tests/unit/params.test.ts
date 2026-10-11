import { describe, expect, it } from "vitest";
import { parseGenreId, parseMovieId, parsePage, parseQuery, parseSort } from "@/lib/api/params";

describe("parâmetros das rotas", () => {
  it("parsePage aceita 1..500 e usa 1 no resto", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(null)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("501")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });

  it("parseGenreId aceita inteiro positivo", () => {
    expect(parseGenreId("35")).toBe(35);
    expect(parseGenreId(null)).toBeUndefined();
    expect(parseGenreId("-1")).toBeUndefined();
  });

  it("parseSort só aceita top_rated como alternativa", () => {
    expect(parseSort("top_rated")).toBe("top_rated");
    expect(parseSort("qualquer")).toBe("popular");
    expect(parseSort(null)).toBe("popular");
  });

  it("parseMovieId aceita inteiro positivo", () => {
    expect(parseMovieId("550")).toBe(550);
    expect(parseMovieId("x")).toBeNull();
    expect(parseMovieId(undefined)).toBeNull();
  });

  it("parseQuery tira espaços e limita o tamanho", () => {
    expect(parseQuery("  matrix  ")).toBe("matrix");
    expect(parseQuery(null)).toBe("");
    expect(parseQuery("a".repeat(150))).toHaveLength(100);
  });
});
