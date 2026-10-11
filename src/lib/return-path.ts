/** Só permite voltar para caminhos deste site (evita redirecionar para sites externos). */
export function safeReturnPath(value: string | null | undefined): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
