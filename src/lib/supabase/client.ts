"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Cliente do Supabase no navegador; guarda a sessão em cookies que o servidor também lê. */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient<Database>(supabaseUrl(), supabaseKey());
  return client;
}
