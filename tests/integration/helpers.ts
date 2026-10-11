import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type TestClient = SupabaseClient<Database>;

function newClient(): TestClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Variáveis do Supabase local ausentes no .env (rode `npx supabase status`)");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cria uma conta nova no Supabase local e devolve um cliente logado com ela. */
export async function newUser(): Promise<{ client: TestClient; userId: string }> {
  const client = newClient();
  const email = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.com`;
  const { data, error } = await client.auth.signUp({ email, password: "senha-segura-123" });
  if (error || !data.user || !data.session) throw error ?? new Error("cadastro sem sessão (confirmação de e-mail ligada?)");
  return { client, userId: data.user.id };
}

export function anonymousClient(): TestClient {
  return newClient();
}
