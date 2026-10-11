"use client";

import { useState } from "react";
import { Credits } from "@/components/Credits";
import { Dialog } from "@/components/Dialog";
import { TextField } from "@/components/TextField";
import { authErrorMessage, type AuthMode } from "@/lib/auth-messages";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppUser, AuthRequest } from "./AuthProvider";

const TITLES: Record<AuthMode, string> = { entrar: "Entrar", criar: "Criar conta", esqueci: "Esqueci minha senha" };

type Props = { request: AuthRequest | null; onClose: () => void; onSignedIn: (user: AppUser) => void };

export function AuthModal({ request, onClose, onSignedIn }: Props) {
  return (
    <Dialog open={request !== null} onClose={onClose} labelledBy="auth-modal-title" layer="top">
      {(close) =>
        request && (
          <AuthPanel
            initialMode={request.mode}
            onDone={(user) => {
              onSignedIn(user);
              const after = request.onSuccess;
              close(); // tira o login da tela antes de concluir a ação pendente
              after?.();
            }}
          />
        )
      }
    </Dialog>
  );
}

function AuthPanel({ initialMode, onDone }: { initialMode: AuthMode; onDone: (user: AppUser) => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  function switchTo(next: AuthMode) {
    setMode(next);
    setError(null);
    setSent(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password") ?? "");
    const supabase = getSupabaseBrowserClient();
    setError(null);
    if (mode === "criar" && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setPending(true);
    try {
      if (mode === "entrar") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(authErrorMessage(error, "entrar"));
        onDone({ id: data.user.id, email: data.user.email ?? email });
      } else if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return setError(authErrorMessage(error, "criar"));
        if (!data.user || !data.session) return setError("Não foi possível criar a conta. Tente de novo.");
        onDone({ id: data.user.id, email: data.user.email ?? email });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error?.status === 429) return setError("Muitas tentativas. Aguarde um minuto e tente de novo.");
        setSent(true); // mesma resposta exista ou não a conta
      }
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  const link = "text-sm text-red-400 underline";

  return (
    <div className="space-y-4">
      <h2 id="auth-modal-title" className="pr-8 text-lg font-semibold">
        {TITLES[mode]}
      </h2>

      {mode === "esqueci" && sent ? (
        <p role="status" className="text-sm text-neutral-300">
          Se o e-mail existir, enviamos o link.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
          {mode !== "esqueci" && (
            <TextField
              label="Senha"
              name="password"
              type="password"
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              required
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60">
            {pending ? "Aguarde..." : mode === "esqueci" ? "Enviar link" : TITLES[mode]}
          </button>
        </form>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        {mode === "entrar" && (
          <>
            <button type="button" onClick={() => switchTo("criar")} className={link}>
              Criar conta
            </button>
            <button type="button" onClick={() => switchTo("esqueci")} className={link}>
              Esqueci minha senha
            </button>
          </>
        )}
        {mode !== "entrar" && (
          <button type="button" onClick={() => switchTo("entrar")} className={link}>
            {mode === "criar" ? "Já tenho conta" : "Voltar para entrar"}
          </button>
        )}
      </div>

      <Credits />
    </div>
  );
}
