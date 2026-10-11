"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { mergeUnique, nextPage, withPageParam } from "@/lib/infinite";
import type { MovieSummary, Page } from "@/lib/tmdb/types";

type State = { items: MovieSummary[]; page: number; totalPages: number; loading: boolean; error: string | null };

const EMPTY: State = { items: [], page: 0, totalPages: 1, loading: false, error: null };

export function useInfiniteMovies(baseUrl: string) {
  const [state, setState] = useState<State>({ ...EMPTY, loading: true });
  const stateRef = useRef(state);
  const requestId = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const load = useCallback(
    async (page: number, reset: boolean) => {
      const id = ++requestId.current;
      setState((s) => ({ ...(reset ? EMPTY : s), loading: true, error: null }));
      try {
        const data = await apiFetch<Page<MovieSummary>>(withPageParam(baseUrl, page));
        if (id !== requestId.current) return; // resposta de uma busca antiga
        setState((s) => ({
          items: reset ? data.items : mergeUnique(s.items, data.items),
          page: data.page,
          totalPages: data.totalPages,
          loading: false,
          error: null,
        }));
      } catch (error) {
        if (id !== requestId.current) return;
        setState((s) => ({ ...s, loading: false, error: errorMessage(error) }));
      }
    },
    [baseUrl],
  );

  useEffect(() => {
    void load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    const s = stateRef.current;
    const next = nextPage(s.page, s.totalPages);
    if (next === null || s.loading || s.error) return;
    stateRef.current = { ...s, loading: true };
    void load(next, false);
  }, [load]);

  const hasMore = nextPage(state.page, state.totalPages) !== null;
  return { ...state, hasMore, loadMore };
}
