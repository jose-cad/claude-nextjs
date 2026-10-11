export function nextPage(current: number, totalPages: number): number | null {
  return current < totalPages ? current + 1 : null;
}

export function mergeUnique<T extends { id: number }>(previous: T[], incoming: T[]): T[] {
  const seen = new Set(previous.map((item) => item.id));
  return [...previous, ...incoming.filter((item) => !seen.has(item.id))];
}

export function withPageParam(url: string, page: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}pagina=${page}`;
}
