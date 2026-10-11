import { tmdbResponse } from "@/lib/api/http";
import { parsePage, parseQuery } from "@/lib/api/params";
import { getMovieService } from "@/lib/tmdb";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const query = parseQuery(params.get("q"));
  if (!query) return Response.json({ items: [], page: 1, totalPages: 1 });
  return tmdbResponse(() => getMovieService().searchMovies(query, parsePage(params.get("pagina"))));
}
