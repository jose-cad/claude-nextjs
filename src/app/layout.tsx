import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ListsProvider } from "@/components/lists/ListsProvider";
import { NavBar } from "@/components/NavBar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de Filmes",
  description: "Filmes da Netflix Brasil e suas listas",
};

// Com cacheComponents, ler cookies (a sessão) exige um limite de Suspense.
async function AuthShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthProvider initialUser={user ? { id: user.id, email: user.email ?? "" } : null}>
      <ListsProvider>
        <NavBar />
        <main className="pb-16 md:pb-0">{children}</main>
      </ListsProvider>
    </AuthProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        <Suspense fallback={null}>
          <AuthShell>{children}</AuthShell>
        </Suspense>
      </body>
    </html>
  );
}
