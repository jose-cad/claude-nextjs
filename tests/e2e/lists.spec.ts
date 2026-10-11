import { expect, test } from "@playwright/test";
import { logIn, logOut, PASSWORD, scrollY, signUp, uniqueEmail } from "./helpers";

test("salvar sem estar logado: login no modal, filme salvo e lista no mesmo lugar", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("button", { name: "Filme 115", exact: true });
  await card.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(300);
  const before = await scrollY(page);

  await card.click();
  const detalhes = page.getByRole("dialog", { name: "Filme 115" });
  await detalhes.getByRole("button", { name: "Quero assistir" }).click();

  await page.getByRole("dialog", { name: "Entrar" }).getByRole("button", { name: "Criar conta" }).click();
  const criar = page.getByRole("dialog", { name: "Criar conta" });
  await criar.getByLabel("E-mail").fill(uniqueEmail());
  await criar.getByLabel("Senha").fill(PASSWORD);
  await criar.getByRole("button", { name: "Criar conta" }).click();

  await expect(criar).toBeHidden();
  await expect(detalhes).toBeVisible();
  await expect(detalhes.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "true");

  await detalhes.getByRole("button", { name: "Fechar" }).click();
  await expect(detalhes).toBeHidden();
  expect(await scrollY(page)).toBe(before);
  await expect(card.locator('[data-mark="want"]')).toBeVisible();
});

test("voltar com dois modais abertos fecha só o de cima", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Filme 105", exact: true }).click();
  const detalhes = page.getByRole("dialog", { name: "Filme 105" });
  await detalhes.getByRole("button", { name: "Quero assistir" }).click();
  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeHidden();
  await expect(detalhes).toBeVisible();

  await page.goBack();
  await expect(detalhes).toBeHidden();
  await expect(page).toHaveURL("/");
});

test("marcar Favorito move o filme para Favoritos", async ({ page }) => {
  await page.goto("/");
  await signUp(page);
  await page.getByRole("button", { name: "Filme 102", exact: true }).click();
  const detalhes = page.getByRole("dialog", { name: "Filme 102" });
  await detalhes.getByRole("button", { name: "Quero assistir" }).click();
  await expect(detalhes.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "true");
  await detalhes.getByRole("button", { name: "Favorito" }).click();
  await expect(detalhes.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "false");
  await expect(detalhes.getByRole("button", { name: "Favorito" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Minhas listas" }).click();
  await expect(page.getByText("Nenhum filme aqui ainda.")).toBeVisible();
  await page.getByRole("tab", { name: "Favoritos" }).click();
  const card = page.getByRole("button", { name: "Filme 102", exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByText("Na Netflix", { exact: true })).toBeVisible();
});

test("filme fora da Netflix também pode ser salvo", async ({ page }) => {
  await page.goto("/");
  await signUp(page);
  await page.getByLabel("Buscar filme pelo nome").fill("achado");
  await page.getByRole("button", { name: "Achado fora da Netflix" }).click();
  const detalhes = page.getByRole("dialog", { name: "Achado fora da Netflix" });
  await detalhes.getByRole("button", { name: "Quero assistir" }).click();
  await expect(detalhes.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Minhas listas" }).click();
  await expect(page.getByRole("button", { name: "Achado fora da Netflix" }).getByText("Fora da Netflix", { exact: true })).toBeVisible();
});

test("cada pessoa só vê a própria lista, e ela continua depois de sair", async ({ page, browser }) => {
  await page.goto("/");
  const ana = await signUp(page);
  await page.getByRole("button", { name: "Filme 103", exact: true }).click();
  const detalhes = page.getByRole("dialog", { name: "Filme 103" });
  await detalhes.getByRole("button", { name: "Quero assistir" }).click();
  await expect(detalhes.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  const outro = await browser.newContext();
  const biaPage = await outro.newPage();
  await biaPage.goto("/");
  await signUp(biaPage);
  await biaPage.goto("/listas");
  await expect(biaPage.getByText("Nenhum filme aqui ainda.")).toBeVisible();
  await outro.close();

  await logOut(page);
  await logIn(page, ana.email, ana.password);
  await expect(page.getByRole("link", { name: "Conta" })).toBeVisible(); // espera o login terminar antes de recarregar
  await page.goto("/listas");
  await expect(page.getByRole("button", { name: "Filme 103", exact: true })).toBeVisible();
});

test("Minhas listas sem login convida a entrar", async ({ page }) => {
  await page.goto("/listas");
  await expect(page.getByText("Entre para ver suas listas.")).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible();
});

test("sessão perdida ao salvar: o login abre e o filme é salvo depois", async ({ page, context }) => {
  await page.goto("/");
  const conta = await signUp(page);
  await context.clearCookies(); // a tela ainda acha que está logada, mas o servidor não

  await page.getByRole("button", { name: "Filme 104", exact: true }).click();
  const detalhes = page.getByRole("dialog", { name: "Filme 104" });
  await detalhes.getByRole("button", { name: "Quero assistir" }).click();

  const entrar = page.getByRole("dialog", { name: "Entrar" });
  await expect(entrar).toBeVisible();
  await entrar.getByLabel("E-mail").fill(conta.email);
  await entrar.getByLabel("Senha").fill(conta.password);
  await entrar.getByRole("button", { name: "Entrar" }).click();

  await expect(entrar).toBeHidden();
  await expect(detalhes.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "true");
});
