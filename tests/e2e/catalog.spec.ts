import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("o catálogo abre sem login e carrega mais filmes ao rolar", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Filme 100", exact: true })).toBeVisible();
  // não contar itens: a rolagem infinita pode já ter puxado a página 2 se a tela for alta
  await expect(page.getByRole("button", { name: "Filme 119", exact: true })).toBeAttached();
  await page.getByRole("button", { name: "Filme 119", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Filme 200", exact: true })).toBeAttached();
});

test("filtra por gênero e ordena por mais bem avaliados", async ({ page }) => {
  await page.getByLabel("Gênero").selectOption({ label: "Comédia" });
  await expect(page.getByRole("button", { name: "Comédia 100", exact: true })).toBeVisible();

  await page.getByLabel("Gênero").selectOption({ label: "Todos os gêneros" });
  await page.getByLabel("Ordenar").selectOption({ label: "Mais bem avaliados" });
  await expect(page.getByRole("button", { name: "Top 100", exact: true })).toBeVisible();
});

test("a busca mostra se o filme está ou não na Netflix e desativa os filtros", async ({ page }) => {
  await page.getByLabel("Buscar filme pelo nome").fill("achado");
  const dentro = page.getByRole("button", { name: "Achado na Netflix" });
  const fora = page.getByRole("button", { name: "Achado fora da Netflix" });
  await expect(dentro.getByText("Na Netflix", { exact: true })).toBeVisible();
  await expect(fora.getByText("Fora da Netflix", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Gênero")).toBeDisabled();
  await expect(page.getByLabel("Ordenar")).toBeDisabled();
});

test("busca sem resultados avisa", async ({ page }) => {
  await page.getByLabel("Buscar filme pelo nome").fill("nada");
  await expect(page.getByText("Nenhum filme encontrado.")).toBeVisible();
});

test("TMDB fora do ar mostra o aviso de serviço indisponível", async ({ page }) => {
  await page.getByLabel("Buscar filme pelo nome").fill("tmdb-fora");
  await expect(
    page.getByText("O serviço de filmes está indisponível no momento. Suas listas continuam funcionando normalmente."),
  ).toBeVisible();
});

test("navegação e busca continuam visíveis depois de rolar", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Filme 100", exact: true })).toBeVisible();
  await page.mouse.wheel(0, 3000);
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeInViewport();
  await expect(page.getByLabel("Buscar filme pelo nome")).toBeInViewport();
});
