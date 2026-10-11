import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

type UserContext = { supabase: SupabaseClient<Database>; userId: string };

/** Exige sessão do Supabase; as consultas usam o cliente da própria pessoa (o RLS se aplica). */
export async function withSupabaseUser(handler: (ctx: UserContext) => Promise<Response>): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "unauthorized");
  try {
    return await handler({ supabase, userId: user.id });
  } catch (error) {
    console.error(error);
    return jsonError(500, "internal_error");
  }
}
