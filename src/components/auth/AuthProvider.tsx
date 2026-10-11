"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthMode } from "@/lib/auth-messages";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthModal } from "./AuthModal";

export type AppUser = { id: string; email: string };
export type OpenAuthOptions = { mode?: AuthMode; onSuccess?: () => void };
export type AuthRequest = { mode: AuthMode; onSuccess?: () => void };

type AuthContextValue = {
  user: AppUser | null;
  openAuth: (options?: OpenAuthOptions) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return value;
}

export function AuthProvider({ initialUser, children }: { initialUser: AppUser | null; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [request, setRequest] = useState<AuthRequest | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const openAuth = useCallback((options: OpenAuthOptions = {}) => {
    setRequest({ mode: options.mode ?? "entrar", onSuccess: options.onSuccess });
  }, []);

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ user, openAuth, signOut }), [user, openAuth, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal request={request} onClose={() => setRequest(null)} onSignedIn={setUser} />
    </AuthContext.Provider>
  );
}
