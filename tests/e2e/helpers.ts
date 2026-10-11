import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PASSWORD = "senha-segura-123";
const MAILPIT = "http://localhost:54324";

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.com`;
}

export const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

const nav = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

export async function signUp(page: Page, email = uniqueEmail(), password = PASSWORD) {
  await nav(page).getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("dialog", { name: "Entrar" }).getByRole("button", { name: "Criar conta" }).click();
  const dialog = page.getByRole("dialog", { name: "Criar conta" });
  await dialog.getByLabel("E-mail").fill(email);
  await dialog.getByLabel("Senha").fill(password);
  await dialog.getByRole("button", { name: "Criar conta" }).click();
  await expect(nav(page).getByRole("link", { name: "Conta" })).toBeVisible();
  return { email, password };
}

export async function logIn(page: Page, email: string, password: string) {
  await nav(page).getByRole("button", { name: "Entrar" }).click();
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill(email);
  await dialog.getByLabel("Senha").fill(password);
  await dialog.getByRole("button", { name: "Entrar" }).click();
}

export async function logOut(page: Page) {
  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(nav(page).getByRole("button", { name: "Entrar" })).toBeVisible();
}

/** Busca na caixa de e-mails local o link de redefinição mais recente e aponta para o app dos testes. */
export async function resetLinkFor(request: APIRequestContext, email: string, baseURL: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = await (await request.get(`${MAILPIT}/api/v1/messages`)).json();
    const message = list.messages?.find((m: { To: { Address: string }[] }) => m.To.some((to) => to.Address === email));
    if (message) {
      const full = await (await request.get(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const href = (full.HTML as string).match(/href="([^"]*\/auth\/confirmar[^"]*)"/)?.[1];
      // o site_url local é a porta 3000; os testes rodam na 3100
      if (href) return href.replaceAll("&amp;", "&").replace("http://localhost:3000", baseURL);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Nenhum e-mail de redefinição para ${email}`);
}
