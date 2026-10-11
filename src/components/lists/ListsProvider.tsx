"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ListMarks } from "@/components/MovieCard";
import { apiFetch, errorMessage, UnauthorizedError } from "@/lib/api-client";
import { applyToggle } from "@/lib/lists/toggle";
import type { ListItemDto, ListType, MovieSnapshot } from "@/lib/lists/types";

type ListsContextValue = {
  items: ListItemDto[];
  loaded: boolean;
  error: string | null;
  marksFor: (tmdbMovieId: number) => ListMarks;
  isPending: (tmdbMovieId: number, listType: ListType) => boolean;
  toggle: (movie: MovieSnapshot, listType: ListType) => void;
};

const ListsContext = createContext<ListsContextValue | null>(null);

export function useLists(): ListsContextValue {
  const value = useContext(ListsContext);
  if (!value) throw new Error("useLists precisa estar dentro de <ListsProvider>");
  return value;
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const { user, openAuth } = useAuth();
  const [items, setItems] = useState<ListItemDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const itemsRef = useRef(items);
  const retryRef = useRef<(movie: MovieSnapshot, listType: ListType, on: boolean) => Promise<void>>(async () => {});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: ListItemDto[] }>("/api/listas");
      setItems(data.items);
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) setItems([]);
      else setError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  // carrega ao entrar, limpa ao sair (sincroniza o estado com a sessão)
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial da lista ao entrar
      void refresh();
    } else {
      setItems([]);
      setLoaded(true);
    }
  }, [user, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const setMembership = useCallback(
    async (movie: MovieSnapshot, listType: ListType, on: boolean): Promise<void> => {
      const key = `${movie.tmdbMovieId}:${listType}`;
      if (pendingRef.current.has(key)) return; // ignora o segundo toque enquanto o primeiro não termina
      pendingRef.current.add(key);
      setPending(new Set(pendingRef.current));
      setItems((prev) => applyToggle(prev, movie, listType, on, new Date()));
      try {
        if (on) await apiFetch("/api/listas", { method: "POST", body: JSON.stringify({ ...movie, listType }) });
        else await apiFetch(`/api/listas/${movie.tmdbMovieId}?lista=${listType}`, { method: "DELETE" });
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          // sessão perdida: pede login e conclui a mesma ação depois
          openAuth({ onSuccess: () => void retryRef.current(movie, listType, on) });
        } else {
          setToast("Não foi possível salvar. Tente de novo.");
        }
      } finally {
        pendingRef.current.delete(key);
        setPending(new Set(pendingRef.current));
        void refresh(); // a verdade vem do servidor (datas, disponibilidade e, em caso de falha, o estado anterior)
      }
    },
    [openAuth, refresh],
  );

  useEffect(() => {
    retryRef.current = setMembership;
  }, [setMembership]);

  const toggle = useCallback(
    (movie: MovieSnapshot, listType: ListType) => {
      if (!user) {
        // sem login: abre o modal e, depois de entrar, só ADICIONA (nunca remove)
        openAuth({ onSuccess: () => void setMembership(movie, listType, true) });
        return;
      }
      const isIn = itemsRef.current.some((i) => i.tmdbMovieId === movie.tmdbMovieId && i.listType === listType);
      void setMembership(movie, listType, !isIn);
    },
    [user, openAuth, setMembership],
  );

  const marksFor = useCallback(
    (id: number): ListMarks => ({
      want: items.some((i) => i.tmdbMovieId === id && i.listType === "want"),
      favorite: items.some((i) => i.tmdbMovieId === id && i.listType === "favorite"),
    }),
    [items],
  );

  const isPending = useCallback((id: number, listType: ListType) => pending.has(`${id}:${listType}`), [pending]);

  const value = useMemo(() => ({ items, loaded, error, marksFor, isPending, toggle }), [items, loaded, error, marksFor, isPending, toggle]);

  return (
    <ListsContext.Provider value={value}>
      {children}
      {toast && (
        <div role="alert" className="fixed inset-x-4 bottom-20 z-[70] rounded-md bg-neutral-800 p-3 text-center text-sm shadow-lg md:bottom-4">
          {toast}
        </div>
      )}
    </ListsContext.Provider>
  );
}
