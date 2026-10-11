"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export function ResetPasswordView({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const { user, openAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== String(form.get("confirm"))) return setError("As senhas não são iguais.");
    setPending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.code === "same_password" ? "A nova senha precisa ser diferente da atual." : "Não foi possível salvar. Peça um novo link.");
        return;
      }
      await supabase.auth.signOut({ scope: "others" }); // os outros aparelhos caem em até 1 hora
      router.replace("/");
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  if (linkError || !user) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p role="alert" className="text-sm text-red-400">
          Link inválido ou expirado.
        </p>
        <button type="button" onClick={() => openAuth({ mode: "esqueci" })} className="text-sm text-red-400 underline">
          Pedir um novo link
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Criar nova senha</h1>
      <TextField label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <TextField label="Confirmar nova senha" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
