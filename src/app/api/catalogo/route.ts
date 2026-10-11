import { tmdbResponse } from "@/lib/api/http";
import { parseGenreId, parsePage, parseSort } from "@/lib/api/params";
import { getMovieService } from "@/lib/tmdb";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  return tmdbResponse(() =>
    getMovieService().discoverNetflix({
      page: parsePage(params.get("pagina")),
      genreId: parseGenreId(params.get("genero")),
      sort: parseSort(params.get("ordem")),
    }),
  );
}
