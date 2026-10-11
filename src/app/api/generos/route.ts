import { tmdbResponse } from "@/lib/api/http";
import { getMovieService } from "@/lib/tmdb";

export async function GET() {
  return tmdbResponse(async () => ({ genres: await getMovieService().getGenres() }));
}
