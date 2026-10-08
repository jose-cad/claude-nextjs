import { describe, expect, it } from "vitest";
import { TmdbUnavailableError, type TmdbFetch } from "@/lib/tmdb/client";
import { createMovieService, MAX_PAGES, MIN_VOTES_TOP_RATED, pickTrailerUrl, REVALIDATE } from "@/lib/tmdb/movies";

function fakeTmdb(routes: Record<string, unknown>) {
  const calls: { path: string; params: Record<string, unknown>; revalidate: number }[] = [];
  const fn: TmdbFetch = async (path, params, revalidate) => {
    calls.push({ path, params, revalidate });
    const route = routes[path];
    if (route instanceof Error) throw route;
    if (route === undefined) throw new Error(`rota não simulada: ${path}`);
    return structuredClone(route);
  };
  return { fn, calls };
}

const onNetflix = { results: { BR: { flatrate: [{ provider_id: 8 }] } } };
const offNetflix = { results: {} };
const movie = (id: number, extra: object = {}) => ({ id, title: `Filme ${id}`, poster_path: `/p${id}.jpg`, release_date: "2021-03-04", ...extra });

function service(routes: Record<string, unknown>) {
  const tmdb = fakeTmdb(routes);
  return { svc: createMovieService({ tmdb: tmdb.fn, netflixIds: [8, 1796] }), calls: tmdb.calls };
}

describe("discoverNetflix", () => {
  it("filtra por Netflix no Brasil, só assinatura, em português, com cache de catálogo", async () => {
    const { svc, calls } = service({ "/discover/movie": { page: 1, total_pages: 3, results: [movie(1)] } });
    const page = await svc.discoverNetflix({ page: 1, sort: "popular", genreId: 35 });

    expect(calls[0].params).toMatchObject({
      watch_region: "BR",
      with_watch_providers: "8|1796",
      with_watch_monetization_types: "flatrate",
      language: "pt-BR",
      sort_by: "popularity.desc",
      with_genres: 35,
      page: 1,
    });
    expect(calls[0].params["vote_count.gte"]).toBeUndefined();
    expect(calls[0].revalidate).toBe(REVALIDATE.catalog);
    expect(page).toEqual({ items: [{ id: 1, title: "Filme 1", posterPath: "/p1.jpg", year: 2021, onNetflix: true }], page: 1, totalPages: 3 });
  });

  it("'mais bem avaliados' exige número mínimo de votos", async () => {
    const { svc, calls } = service({ "/discover/movie": { page: 1, total_pages: 1, results: [] } });
    await svc.discoverNetflix({ page: 1, sort: "top_rated" });
    expect(calls[0].params).toMatchObject({ sort_by: "vote_average.desc", "vote_count.gte": MIN_VOTES_TOP_RATED });
  });

  it("limita o total de páginas ao máximo do TMDB", async () => {
    const { svc } = service({ "/discover/movie": { page: 1, total_pages: 900, results: [] } });
    expect((await svc.discoverNetflix({ page: 1, sort: "popular" })).totalPages).toBe(MAX_PAGES);
  });
});

describe("searchMovies", () => {
  it("marca cada resultado como na Netflix, fora dela ou desconhecido", async () => {
    const { svc, calls } = service({
      "/search/movie": { page: 1, total_pages: 1, results: [movie(1), movie(2), movie(3)] },
      "/movie/1/watch/providers": onNetflix,
      "/movie/2/watch/providers": offNetflix,
      "/movie/3/watch/providers": new TmdbUnavailableError("fora"),
    });
    const page = await svc.searchMovies("filme", 1);
    expect(page.items.map((m) => m.onNetflix)).toEqual([true, false, null]);
    expect(calls.find((c) => c.path === "/search/movie")?.revalidate).toBe(REVALIDATE.search);
    expect(calls.find((c) => c.path === "/movie/1/watch/providers")?.revalidate).toBe(REVALIDATE.providers);
  });

  it("propaga a falha quando a própria busca falha", async () => {
    const { svc } = service({ "/search/movie": new TmdbUnavailableError("fora") });
    await expect(svc.searchMovies("x", 1)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });
});

describe("getMovieDetails", () => {
  it("converte os detalhes completos", async () => {
    const { svc, calls } = service({
      "/movie/7": {
        ...movie(7),
        overview: "Uma história.",
        runtime: 125,
        backdrop_path: "/b7.jpg",
        genres: [{ id: 1, name: "Drama" }],
        credits: { cast: [{ name: "B", order: 1 }, { name: "A", order: 0 }] },
        videos: { results: [{ key: "en1", site: "YouTube", type: "Trailer", iso_639_1: "en" }, { key: "pt1", site: "YouTube", type: "Trailer", iso_639_1: "pt" }] },
        "watch/providers": onNetflix,
      },
    });
    const details = await svc.getMovieDetails(7);
    expect(calls[0].params).toMatchObject({ append_to_response: "credits,videos,watch/providers", language: "pt-BR" });
    expect(calls[0].revalidate).toBe(REVALIDATE.details);
    expect(details).toEqual({
      id: 7,
      title: "Filme 7",
      posterPath: "/p7.jpg",
      year: 2021,
      onNetflix: true,
      overview: "Uma história.",
      runtimeMinutes: 125,
      genres: ["Drama"],
      cast: ["A", "B"],
      trailerUrl: "https://www.youtube.com/watch?v=pt1",
      backdropPath: "/b7.jpg",
    });
  });

  it("devolve null nos campos ausentes em vez de valores vazios", async () => {
    const { svc } = service({ "/movie/8": { id: 8, title: "Sem nada", poster_path: null, overview: "  ", runtime: 0 } });
    expect(await svc.getMovieDetails(8)).toEqual({
      id: 8,
      title: "Sem nada",
      posterPath: null,
      year: null,
      onNetflix: false,
      overview: null,
      runtimeMinutes: null,
      genres: [],
      cast: [],
      trailerUrl: null,
      backdropPath: null,
    });
  });
});

describe("pickTrailerUrl", () => {
  it("ignora vídeos que não são trailer do YouTube", () => {
    expect(pickTrailerUrl([{ key: "x", site: "Vimeo", type: "Trailer", iso_639_1: "pt" }, { key: "y", site: "YouTube", type: "Teaser", iso_639_1: "pt" }])).toBeNull();
  });
});

describe("getGenres", () => {
  it("ordena em ordem alfabética do português", async () => {
    const { svc } = service({ "/genre/movie/list": { genres: [{ id: 3, name: "Comédia" }, { id: 1, name: "Ação" }, { id: 2, name: "Animação" }] } });
    expect((await svc.getGenres()).map((g) => g.name)).toEqual(["Ação", "Animação", "Comédia"]);
  });
});
