import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-messages";

describe("authErrorMessage", () => {
  it("login errado sempre dá a mesma mensagem", () => {
    expect(authErrorMessage({ status: 400, code: "invalid_credentials" }, "entrar")).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage({ status: 400, code: "qualquer_outro" }, "entrar")).toBe("E-mail ou senha incorretos.");
  });

  it("cadastro com e-mail já usado", () => {
    expect(authErrorMessage({ status: 422, code: "user_already_exists" }, "criar")).toBe("Este e-mail já tem conta.");
    expect(authErrorMessage({ status: 422, code: "email_exists" }, "criar")).toBe("Este e-mail já tem conta.");
  });

  it("senha fraca no cadastro", () => {
    expect(authErrorMessage({ status: 422, code: "weak_password" }, "criar")).toBe("A senha precisa ter pelo menos 8 caracteres.");
  });

  it("muitas tentativas", () => {
    expect(authErrorMessage({ status: 429, code: "over_request_rate_limit" }, "entrar")).toBe("Muitas tentativas. Aguarde um minuto e tente de novo.");
  });

  it("sem resposta do servidor é falta de conexão", () => {
    expect(authErrorMessage({ status: 0 }, "entrar")).toBe("Sem conexão. Verifique sua internet.");
  });
});
