"use client";

import { Credits } from "@/components/Credits";
import { useAuth } from "./AuthProvider";

export function AccountView() {
  const { user, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="text-sm text-neutral-300">Entre para ver sua conta.</p>
        <button type="button" onClick={() => openAuth()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Conta</h1>
      <dl className="text-sm">
        <dt className="text-neutral-400">E-mail</dt>
        <dd>{user.email}</dd>
      </dl>
      <button type="button" onClick={() => void signOut()} className="w-full rounded-md border border-neutral-700 py-2 text-sm">
        Sair
      </button>
      <Credits />
    </div>
  );
}
