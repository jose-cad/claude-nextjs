import { TmdbNotFoundError, TmdbUnavailableError } from "@/lib/tmdb/client";

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Responde com os dados do TMDB ou traduz a falha em um código HTTP. */
export async function tmdbResponse(load: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await load());
  } catch (error) {
    if (error instanceof TmdbUnavailableError) return jsonError(503, "tmdb_unavailable");
    if (error instanceof TmdbNotFoundError) return jsonError(404, "not_found");
    console.error(error);
    return jsonError(500, "internal_error");
  }
}
