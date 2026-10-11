export class NetworkError extends Error {}
export class ServiceUnavailableError extends Error {}
export class UnauthorizedError extends Error {}
export class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new NetworkError();
  }
  if (res.status === 401) throw new UnauthorizedError();
  if (res.status === 503) throw new ServiceUnavailableError();
  if (!res.ok) throw new ApiError(res.status);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof NetworkError) return "Sem conexão. Verifique sua internet.";
  if (error instanceof ServiceUnavailableError) {
    return "O serviço de filmes está indisponível no momento. Suas listas continuam funcionando normalmente.";
  }
  if (error instanceof ApiError && error.status === 404) return "Filme não encontrado.";
  return "Algo deu errado. Tente de novo mais tarde.";
}
