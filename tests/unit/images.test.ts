import { describe, expect, it } from "vitest";
import { posterUrl } from "@/lib/images";

describe("posterUrl", () => {
  it("monta a URL no tamanho pedido", () => {
    expect(posterUrl("/abc.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("devolve null sem pôster", () => {
    expect(posterUrl(null, "w342")).toBeNull();
  });
});
