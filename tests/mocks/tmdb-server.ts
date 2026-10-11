// TMDB falso para os testes E2E. Dados determinísticos:
// - catálogo: 3 páginas de 20 filmes; página p tem ids p*100 .. p*100+19 ("Filme 100"...)
// - com gênero 35 os títulos começam com "Comédia"; com "mais bem avaliados", com "Top"
// - busca: "tmdb-fora" responde 500; "nada" volta vazio; o resto devolve 9001 (na Netflix) e 9002 (fora)
// - o filme 9002 não tem pôster, sinopse, duração nem trailer
import { createServer, type ServerResponse } from "node:http";

const PORT = 4010;
const NETFLIX = 8;
const OFF_NETFLIX_ID = 9002;

const movie = (id: number, title: string) => ({ id, title, poster_path: null, release_date: "2020-05-01" });

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.headers.authorization !== "Bearer test-token") return json(res, 401, { status_message: "token inválido" });
  const path = url.pathname;

  if (path === "/3/genre/movie/list") {
    return json(res, 200, { genres: [{ id: 35, name: "Comédia" }, { id: 28, name: "Ação" }] });
  }

  if (path === "/3/discover/movie") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const prefix = url.searchParams.get("with_genres") === "35" ? "Comédia" : url.searchParams.get("sort_by") === "vote_average.desc" ? "Top" : "Filme";
    const results = Array.from({ length: 20 }, (_, i) => movie(page * 100 + i, `${prefix} ${page * 100 + i}`));
    return json(res, 200, { page, total_pages: 3, total_results: 60, results });
  }

  if (path === "/3/search/movie") {
    const query = url.searchParams.get("query") ?? "";
    if (query === "tmdb-fora") return json(res, 500, { status_message: "fora do ar" });
    if (query === "nada") return json(res, 200, { page: 1, total_pages: 1, results: [] });
    return json(res, 200, { page: 1, total_pages: 1, results: [movie(9001, "Achado na Netflix"), movie(OFF_NETFLIX_ID, "Achado fora da Netflix")] });
  }

  const providers = path.match(/^\/3\/movie\/(\d+)\/watch\/providers$/);
  if (providers) {
    const id = Number(providers[1]);
    return json(res, 200, { id, results: id === OFF_NETFLIX_ID ? {} : { BR: { flatrate: [{ provider_id: NETFLIX }] } } });
  }

  const details = path.match(/^\/3\/movie\/(\d+)$/);
  if (details) {
    const id = Number(details[1]);
    if (id === OFF_NETFLIX_ID) {
      return json(res, 200, { ...movie(id, "Achado fora da Netflix"), overview: "", runtime: null, genres: [], credits: { cast: [] }, videos: { results: [] }, "watch/providers": { results: {} } });
    }
    return json(res, 200, {
      ...movie(id, id === 9001 ? "Achado na Netflix" : `Filme ${id}`),
      overview: `Sinopse do filme ${id}.`,
      runtime: 125,
      genres: [{ id: 28, name: "Ação" }],
      credits: { cast: [{ name: "Atriz Um", order: 0 }, { name: "Ator Dois", order: 1 }] },
      videos: { results: [{ key: `trailer${id}`, site: "YouTube", type: "Trailer", iso_639_1: "pt" }] },
      "watch/providers": { results: { BR: { flatrate: [{ provider_id: NETFLIX }] } } },
    });
  }

  json(res, 404, { status_message: "não encontrado" });
}).listen(PORT, () => console.log(`TMDB simulado em http://localhost:${PORT}`));
