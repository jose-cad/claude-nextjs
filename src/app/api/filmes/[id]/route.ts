import { jsonError, tmdbResponse } from "@/lib/api/http";
import { parseMovieId } from "@/lib/api/params";
import { getMovieService } from "@/lib/tmdb";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const movieId = parseMovieId((await params).id);
  if (movieId === null) return jsonError(400, "invalid_id");
  return tmdbResponse(() => getMovieService().getMovieDetails(movieId));
}
