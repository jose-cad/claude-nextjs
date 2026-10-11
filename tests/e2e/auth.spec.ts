import { expect, test } from "@playwright/test";
import { logIn, logOut, PASSWORD, resetLinkFor, signUp, uniqueEmail } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("criar conta, continuar logado depois de recarregar e sair", async ({ page }) => {
  const conta = await signUp(page);
  await page.reload();
  await expect(page.getByRole("link", { name: "Minhas listas" })).toBeVisible();
  await page.goto("/conta");
  await expect(page.getByText(conta.email)).toBeVisible();
  await expect(page.getByText("mas não é endossado nem certificado pelo TMDB")).toBeVisible();
  await logOut(page);
  await expect(page.getByRole("link", { name: "Minhas listas" })).toHaveCount(0);
});

test("senha errada e e-mail inexistente mostram a mesma mensagem", async ({ page }) => {
  const conta = await signUp(page);
  await logOut(page);

  await logIn(page, conta.email, "senha-errada-999");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await expect(dialog.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");

  await dialog.getByLabel("E-mail").fill("ninguem-aqui@teste.com");
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
});

test("cadastro com e-mail já usado avisa", async ({ page }) => {
  const conta = await signUp(page);
  await logOut(page);
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("dialog", { name: "Entrar" }).getByRole("button", { name: "Criar conta" }).click();
  const dialog = page.getByRole("dialog", { name: "Criar conta" });
  await dialog.getByLabel("E-mail").fill(conta.email);
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Criar conta" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Este e-mail já tem conta.");
});

test("o botão voltar fecha o modal de login sem sair da página", async ({ page }) => {
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeHidden();
  await expect(page).toHaveURL("/");
});

test("recuperar a senha pelo e-mail", async ({ page, request, baseURL }) => {
  const conta = await signUp(page, uniqueEmail());
  await logOut(page);

  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("dialog", { name: "Entrar" }).getByRole("button", { name: "Esqueci minha senha" }).click();
  const esqueci = page.getByRole("dialog", { name: "Esqueci minha senha" });
  await esqueci.getByLabel("E-mail").fill(conta.email);
  await esqueci.getByRole("button", { name: "Enviar link" }).click();
  await expect(esqueci.getByText("Se o e-mail existir, enviamos o link.")).toBeVisible();

  await page.goto(await resetLinkFor(request, conta.email, baseURL!));
  await expect(page).toHaveURL("/redefinir-senha");
  await page.getByLabel("Nova senha", { exact: true }).fill("senha-nova-456");
  await page.getByLabel("Confirmar nova senha").fill("senha-nova-456");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Conta" })).toBeVisible();

  await logOut(page);
  await logIn(page, conta.email, PASSWORD);
  await expect(page.getByRole("dialog", { name: "Entrar" }).getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("Senha").fill("senha-nova-456");
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("link", { name: "Conta" })).toBeVisible();
});

test("e-mail sem conta recebe a mesma resposta", async ({ page }) => {
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("dialog", { name: "Entrar" }).getByRole("button", { name: "Esqueci minha senha" }).click();
  const esqueci = page.getByRole("dialog", { name: "Esqueci minha senha" });
  await esqueci.getByLabel("E-mail").fill("ninguem-aqui@teste.com");
  await esqueci.getByRole("button", { name: "Enviar link" }).click();
  await expect(esqueci.getByText("Se o e-mail existir, enviamos o link.")).toBeVisible();
});

test("link inválido avisa e oferece pedir outro", async ({ page }) => {
  await page.goto("/redefinir-senha?erro=link");
  await expect(page.getByText("Link inválido ou expirado.")).toBeVisible();
  await page.getByRole("button", { name: "Pedir um novo link" }).click();
  await expect(page.getByRole("dialog", { name: "Esqueci minha senha" })).toBeVisible();
});
