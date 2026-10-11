import { jsonError, withSupabaseUser } from "@/lib/api/http";
import { addToList, getListItems, withAvailability } from "@/lib/lists/service";
import { addListItemSchema } from "@/lib/lists/validation";
import { getMovieService } from "@/lib/tmdb";

export async function GET() {
  return withSupabaseUser(async ({ supabase }) => {
    const movies = getMovieService();
    const items = await withAvailability(await getListItems(supabase), (id) => movies.getNetflixAvailability(id));
    return Response.json({ items });
  });
}

export async function POST(req: Request) {
  return withSupabaseUser(async ({ supabase }) => {
    const parsed = addListItemSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError(400, "invalid_body");
    const { listType, ...movie } = parsed.data;
    await addToList(supabase, movie, listType);
    return new Response(null, { status: 204 });
  });
}
