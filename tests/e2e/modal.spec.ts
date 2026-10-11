import { expect, test, type Page } from "@playwright/test";

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test("abrir e fechar o modal não muda a posição da lista", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("button", { name: "Filme 115", exact: true });
  await card.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(300);
  const before = await scrollY(page);
  expect(before).toBeGreaterThan(0);
  const dialog = page.getByRole("dialog", { name: "Filme 115" });

  // abre e mostra os detalhes
  await card.click();
  await expect(dialog.getByText("Sinopse do filme 115.")).toBeVisible();
  await expect(dialog.getByText("2020 · 2h 05min")).toBeVisible();
  await expect(dialog.getByText("Elenco: Atriz Um, Ator Dois")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Ver trailer no YouTube" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=trailer115");

  // fecha clicando fora
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  expect(await scrollY(page)).toBe(before);

  // fecha com Esc
  await card.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await scrollY(page)).toBe(before);

  // fecha no X
  await card.click();
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).toBeHidden();
  expect(await scrollY(page)).toBe(before);

  // fecha com o "voltar" sem sair do catálogo
  await card.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL("/");
  expect(await scrollY(page)).toBe(before);
  await expect(card).toBeInViewport();
});

test("filme sem sinopse, duração e trailer não mostra campos vazios", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar filme pelo nome").fill("achado");
  await page.getByRole("button", { name: "Achado fora da Netflix" }).click();
  const dialog = page.getByRole("dialog", { name: "Achado fora da Netflix" });
  await expect(dialog.getByText("Sinopse indisponível.")).toBeVisible();
  await expect(dialog.getByText("Fora da Netflix", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Ver trailer no YouTube" })).toHaveCount(0);
  await expect(dialog.getByText(/Elenco:/)).toHaveCount(0);
  await expect(dialog.getByText(/min$/)).toHaveCount(0);
});
