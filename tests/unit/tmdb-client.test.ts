import { describe, expect, it, vi } from "vitest";
import { createTmdbFetch, TmdbNotFoundError, TmdbUnavailableError } from "@/lib/tmdb/client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createTmdbFetch", () => {
  it("envia o token, codifica parâmetros e pede cache com prazo", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl });
    await tmdb("/search/movie", { query: "Ação & Aventura", page: 2, ignorado: undefined }, 3600);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit & { next?: { revalidate?: number } }];
    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe("Ação & Aventura");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.has("ignorado")).toBe(false);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
    expect(init.next?.revalidate).toBe(3600);
  });

  it("falha de rede vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => { throw new TypeError("fetch failed"); } });
    await expect(tmdb("/x", {}, 60)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("timeout vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => { throw new DOMException("timeout", "TimeoutError"); } });
    await expect(tmdb("/x", {}, 60)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("erro 5xx vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => jsonResponse({}, 503) });
    await expect(tmdb("/x", {}, 60)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("404 vira TmdbNotFoundError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => jsonResponse({}, 404) });
    await expect(tmdb("/movie/1", {}, 60)).rejects.toBeInstanceOf(TmdbNotFoundError);
  });
});
