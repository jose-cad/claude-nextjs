export class TmdbUnavailableError extends Error {}
export class TmdbNotFoundError extends Error {}

export type TmdbParams = Record<string, string | number | undefined>;
export type TmdbFetch = (path: string, params: TmdbParams, revalidateSeconds: number) => Promise<unknown>;

export function createTmdbFetch(opts: {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): TmdbFetch {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, "");

  return async (path, params, revalidateSeconds) => {
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }

    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${opts.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
        // cache de dados do Next.js: a resposta é reaproveitada até vencer o prazo (também no Vercel)
        next: { revalidate: revalidateSeconds },
      } as RequestInit);
    } catch {
      throw new TmdbUnavailableError("O TMDB não respondeu");
    }

    if (res.status === 404) throw new TmdbNotFoundError(path);
    if (!res.ok) {
      console.error(`TMDB respondeu ${res.status} para ${path}`);
      throw new TmdbUnavailableError(`TMDB respondeu ${res.status}`);
    }
    return res.json();
  };
}
