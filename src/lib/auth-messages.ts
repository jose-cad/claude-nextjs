export type AuthMode = "entrar" | "criar" | "esqueci";

type AuthErrorLike = { status?: number; code?: string };

export function authErrorMessage(error: AuthErrorLike, mode: Exclude<AuthMode, "esqueci">): string {
  if (error.status === 429 || error.code === "over_request_rate_limit") return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (!error.status) return "Sem conexão. Verifique sua internet.";
  if (mode === "entrar") return "E-mail ou senha incorretos.";
  if (error.code === "user_already_exists" || error.code === "email_exists") return "Este e-mail já tem conta.";
  if (error.code === "weak_password") return "A senha precisa ter pelo menos 8 caracteres.";
  if (error.code === "email_address_invalid" || error.code === "validation_failed") return "E-mail inválido.";
  return "Não foi possível criar a conta. Tente de novo.";
}
