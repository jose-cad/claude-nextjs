"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Cliente do Supabase no navegador; guarda a sessão em cookies que o servidor também lê. */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient(supabaseUrl(), supabaseKey());
  return client;
}
