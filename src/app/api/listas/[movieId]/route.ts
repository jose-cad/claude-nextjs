import { jsonError, withSupabaseUser } from "@/lib/api/http";
import { parseMovieId } from "@/lib/api/params";
import { removeFromList } from "@/lib/lists/service";
import { parseListType } from "@/lib/lists/validation";

export async function DELETE(req: Request, { params }: { params: Promise<{ movieId: string }> }) {
  return withSupabaseUser(async ({ supabase }) => {
    const movieId = parseMovieId((await params).movieId);
    const listType = parseListType(new URL(req.url).searchParams.get("lista"));
    if (movieId === null || listType === null) return jsonError(400, "invalid_params");
    await removeFromList(supabase, movieId, listType);
    return new Response(null, { status: 204 });
  });
}
