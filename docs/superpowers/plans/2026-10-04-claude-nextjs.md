# claude-nextjs — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** catálogo público dos filmes da Netflix Brasil, com listas "Quero assistir" e "Favoritos" para quem cria conta, publicado no Vercel com Supabase.

**Arquitetura:** um app Next.js (App Router) no Vercel, com telas em React + Tailwind e rotas `/api/*` em TypeScript. Só o servidor fala com o TMDB, e as respostas ficam no cache de dados do Next.js. Login e banco são do Supabase: Auth com e-mail e senha, e Postgres com RLS. Em desenvolvimento e nos testes, o Supabase roda localmente em Docker (`supabase start`).

**Stack (versões verificadas em 2026-10-04):** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · `@supabase/supabase-js` 2.117 · `@supabase/ssr` 0.12 · Supabase CLI 2.119 · Zod 4 · Vitest 5 · Playwright 1.63 · Node 22.

**Spec:** `docs/superpowers/specs/2026-10-03-claude-nextjs-design.md`. Leia junto com este plano.

## Restrições globais

- **Fluxo git (vale para toda tarefa):**
  - comece com `git switch main && git pull && git switch -c tarefa-NN-slug`;
  - faça commits pequenos durante a tarefa;
  - termine com `git push -u origin tarefa-NN-slug` e `gh pr create`;
  - **nunca faça push na `main`**;
  - depois de criar o PR, **pare e espere o usuário fazer "Squash and merge"**. Só então comece a tarefa seguinte.
- **Mensagens de commit:** terminam com a linha `Co-Authored-By:` do modelo que fez o commit, conforme a instrução de atribuição do harness. Descrições de PR terminam com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Supabase local:** precisa do Docker rodando. Sobe com `npx supabase start`. As portas são API `54321`, banco `54322`, painel (Studio) `54323` e caixa de e-mails de teste `54324`.
- **Outras portas:** app `3000` em desenvolvimento, app dos testes E2E `3100`, TMDB simulado `4010`.
- **Use sempre `localhost`**, nunca `127.0.0.1`, nas URLs do app e do Supabase local (os cookies dependem do nome do host).
- **Catálogo:** região `BR`, só filmes, Netflix com `flatrate`. Os IDs de provedor vêm de `NETFLIX_PROVIDER_IDS`.
- **Textos exatos da interface (pt-BR):**
  - `E-mail ou senha incorretos.`
  - `Este e-mail já tem conta.`
  - `Sem conexão. Verifique sua internet.`
  - `O serviço de filmes está indisponível no momento. Suas listas continuam funcionando normalmente.`
  - `Nenhum filme encontrado.`
  - `Se o e-mail existir, enviamos o link.`
  - `Não foi possível salvar. Tente de novo.`
  - `Link inválido ou expirado.`
- **Token do TMDB só no servidor:** `src/lib/tmdb/index.ts` e `src/lib/supabase/server.ts` começam com `import "server-only";`. Arquivos `"use client"` só fazem `import type` de `src/lib/tmdb/types`.
- **Supabase:** o app usa só a chave pública (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). **A chave `service_role` nunca entra no código.**
- **A nota nunca aparece na tela.** Serve só para ordenar.
- **Nenhum modal altera a posição de rolagem** da tela de baixo.
- **Navegação sempre visível:** barra inferior fixa no celular e barra superior fixa (`h-14`) no notebook.
- **Busca:** com texto na busca, os seletores de gênero e de ordenação ficam desativados.
- **Segredos:** ficam em `.env`, que está fora do git, e nas variáveis do Vercel. O `.env.example` traz só os nomes.
- **O TMDB é sempre simulado nos testes.**

## Foco de revisão

1. **Botão "voltar" com dois modais abertos** (detalhes + login): fecha só o de cima e mantém a posição. Teste na Tarefa 7.
2. **Toque duplo rápido em "Quero assistir" / "Favorito":** nunca duplica nem deixa um estado inconsistente. Testes nas Tarefas 6 (inserção concorrente no banco) e 7 (bloqueio enquanto a ação está pendente).
3. **Filmes repetidos entre páginas da rolagem infinita:** sem duplicatas na grade. Teste na Tarefa 3 (`mergeUnique`).
4. **Filme sem pôster, sinopse, duração ou trailer:** o card mostra o título no lugar do pôster e o modal não exibe campos vazios. Testes nas Tarefas 2 (conversão) e 4 (E2E).
5. **Sessão perdida ao salvar** (cookie apagado ou expirado com a tela ainda achando que está logada): o modal de login abre e, depois de entrar, o filme é salvo. Teste na Tarefa 7.

## Ações manuais do usuário (com o momento de cada uma)

| Tarefa | Ação |
|---|---|
| 1 | Criar conta no Vercel com o GitHub e importar o repositório `jose-cad/claude-nextjs` |
| 2 | Criar conta no TMDB e gerar o **Token de Leitura da API** |
| 3 | Cadastrar `TMDB_API_TOKEN` e `NETFLIX_PROVIDER_IDS` nas variáveis do Vercel |
| 5 | Criar o projeto Supabase na nuvem, configurar o Auth e cadastrar as variáveis do Supabase no Vercel |
| 6 | Rodar `npx supabase login` e `npx supabase link` para levar a tabela para a nuvem |

## Mapa de arquivos

```
.env.example
supabase/config.toml, supabase/templates/recovery.html
supabase/migrations/<timestamp>_list_items.sql
vitest.config.ts, vitest.integration.config.ts, playwright.config.ts
src/
  proxy.ts                     # renova a sessão do Supabase a cada requisição
  app/
    layout.tsx, globals.css
    page.tsx                   # catálogo
    listas/page.tsx, conta/page.tsx, redefinir-senha/page.tsx
    auth/confirmar/route.ts    # link do e-mail de recuperação
    api/catalogo/route.ts, api/busca/route.ts, api/generos/route.ts, api/filmes/[id]/route.ts
    api/listas/route.ts, api/listas/[movieId]/route.ts
  lib/
    env.ts, return-path.ts, images.ts, format.ts, infinite.ts, api-client.ts
    auth-messages.ts, modal-stack.ts
    api/params.ts, api/http.ts
    netflix.ts
    tmdb/types.ts, tmdb/client.ts, tmdb/movies.ts, tmdb/index.ts
    supabase/env.ts, supabase/server.ts, supabase/client.ts, supabase/database.types.ts
    lists/types.ts, lists/service.ts, lists/validation.ts, lists/toggle.ts
  hooks/
    useDebouncedValue.ts, useInfiniteMovies.ts, useBackToClose.ts, useScrollLock.ts
  components/
    NavBar.tsx, TextField.tsx, Credits.tsx, StatusMessage.tsx, Dialog.tsx
    NetflixBadge.tsx, MovieCard.tsx, MovieGrid.tsx, InfiniteSentinel.tsx
    CatalogToolbar.tsx, CatalogView.tsx, MovieModal.tsx
    auth/AuthProvider.tsx, auth/AuthModal.tsx, auth/AccountView.tsx, auth/ResetPasswordView.tsx
    lists/ListsProvider.tsx, lists/ListButtons.tsx, lists/ListsView.tsx
tests/
  stubs/empty.ts
  unit/*.test.ts
  integration/setup-env.ts, integration/helpers.ts, integration/*.test.ts
  mocks/tmdb-server.ts
  e2e/helpers.ts, e2e/*.spec.ts
```

---

### Tarefa 1: Base do projeto (Next.js, Vitest, Supabase local, Vercel)

**Branch:** `tarefa-01-base`

**Arquivos:**
- Criar (via create-next-app): `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*`, `public/`, `eslint.config.mjs`, `postcss.config.mjs`
- Criar: `vitest.config.ts`, `tests/stubs/empty.ts`, `src/lib/env.ts`, `tests/unit/env.test.ts`, `.env.example`, `.env` (fora do git), `supabase/` (via `supabase init`)
- Modificar: `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produz: `parseEnv(source): Env`, `getEnv(): Env` e o tipo `Env` com `TMDB_API_TOKEN`, `TMDB_BASE_URL` e `NETFLIX_PROVIDER_IDS: number[]`.

- [ ] **Passo 1: Criar a branch**

```bash
cd /home/jota/Desktop/dev/claude_renatoAsse
git switch main && git pull && git switch -c tarefa-01-base
```

- [ ] **Passo 2: Gerar o projeto Next.js numa pasta temporária e trazê-lo para o repositório**

A pasta não está vazia (`docs/`, `arquivos/`), e o create-next-app recusa pastas com arquivos.

```bash
cd /home/jota/Desktop/dev
npx create-next-app@16 claude-nextjs-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd /home/jota/Desktop/dev/claude_renatoAsse
rsync -a --exclude .git --exclude .gitignore --exclude node_modules ../claude-nextjs-scaffold/ ./
cat ../claude-nextjs-scaffold/.gitignore >> .gitignore
rm -rf ../claude-nextjs-scaffold
npm install
npm pkg set name=claude-nextjs
```

Depois, confira o `.gitignore`. Se o Next adicionou uma linha `.env*`, remova-a: ela ignoraria o `.env.example`, e as nossas linhas `.env`, `.env.*` e `!.env.example` já cobrem o caso.

- [ ] **Passo 3: Dependências de teste e o Supabase CLI**

```bash
npm install zod server-only
npm install -D vitest supabase
npm pkg set scripts.test="vitest run"
npm pkg set scripts.db:start="supabase start"
npm pkg set scripts.db:stop="supabase stop"
```

Criar `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
```

Criar `tests/stubs/empty.ts`:

```ts
// Substitui o pacote "server-only" nos testes (fora do Next ele lança erro de propósito).
export {};
```

- [ ] **Passo 4: Teste da validação do `.env` (falhando)**

Criar `tests/unit/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("aplica os valores padrão", () => {
    const env = parseEnv({ TMDB_API_TOKEN: "token" });
    expect(env.TMDB_BASE_URL).toBe("https://api.themoviedb.org/3");
    expect(env.NETFLIX_PROVIDER_IDS).toEqual([8]);
  });

  it("lê vários IDs de provedor da Netflix", () => {
    expect(parseEnv({ TMDB_API_TOKEN: "t", NETFLIX_PROVIDER_IDS: "8, 1796" }).NETFLIX_PROVIDER_IDS).toEqual([8, 1796]);
  });

  it("recusa configuração sem token do TMDB", () => {
    expect(() => parseEnv({ TMDB_API_TOKEN: "" })).toThrow();
    expect(() => parseEnv({})).toThrow();
  });
});
```

Rodar: `npm test`. Esperado: FALHA (módulo `@/lib/env` inexistente).

- [ ] **Passo 5: Implementar `src/lib/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  TMDB_API_TOKEN: z.string().min(1),
  TMDB_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  NETFLIX_PROVIDER_IDS: z
    .string()
    .default("8")
    .transform((value) =>
      value
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
});

export type Env = z.output<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

let cached: Env | undefined;

/** Variáveis do servidor, lidas só quando alguém precisa (o `next build` não exige segredos). */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
```

Rodar: `npm test`. Esperado: PASSA (3 testes).

- [ ] **Passo 6: Supabase local**

```bash
npx supabase init --yes
```

Em `supabase/config.toml`, ajuste estes valores (as seções já existem no arquivo gerado):

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3100"]
minimum_password_length = 8

[auth.rate_limit]
# valores altos só no local: os testes criam muitas contas seguidas
sign_in_sign_ups = 1000
token_verifications = 1000

[auth.email]
enable_confirmations = false
```

```bash
npx supabase start
npx supabase status
```

Esperado: o `status` lista `API URL` (`http://127.0.0.1:54321`), uma chave **Publishable** (ou "anon key", conforme a versão) e a URL da caixa de e-mails (`http://127.0.0.1:54324`). Abra http://localhost:54323 para ver o painel (Studio).

- [ ] **Passo 7: `.env.example` e `.env` local**

Criar `.env.example`:

```bash
# Supabase (local: valores do `npx supabase status`; produção: painel do Supabase)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# TMDB: Token de Leitura da API (themoviedb.org > Configurações > API)
TMDB_API_TOKEN=
TMDB_BASE_URL=https://api.themoviedb.org/3
NETFLIX_PROVIDER_IDS=8
```

```bash
cp .env.example .env
# Cole em NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY a chave publishable (ou anon) mostrada pelo `npx supabase status`.
# O TMDB_API_TOKEN fica vazio até a Tarefa 2.
```

- [ ] **Passo 8: Layout base e página provisória**

Substituir `src/app/globals.css` por:

```css
@import "tailwindcss";

html {
  color-scheme: dark;
}
```

Substituir `src/app/layout.tsx` por:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de Filmes",
  description: "Filmes da Netflix Brasil e suas listas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
```

Substituir `src/app/page.tsx` por (provisório; a Tarefa 3 substitui):

```tsx
export default function Home() {
  return <h1 className="p-6 text-2xl font-semibold">Catálogo de Filmes</h1>;
}
```

- [ ] **Passo 9: Conferir**

```bash
npm test
npm run lint
npm run build
```

Esperado: os testes passam, o lint não mostra erros e o build termina com sucesso. Rode `npm run dev`, abra http://localhost:3000, veja "Catálogo de Filmes" e encerre com Ctrl+C.

- [ ] **Passo 10: Commit**

```bash
git add -A
git status --short   # conferir: .env NÃO pode aparecer
git commit -m "chore: base do projeto com Next.js, Vitest e Supabase local"
```

(Adicione a linha `Co-Authored-By:` conforme a restrição global.)

- [ ] **Passo 11: Conectar o Vercel (ação manual do usuário)**

Peça ao usuário:
1. entrar em https://vercel.com com a conta do GitHub (**Sign up / Continue with GitHub**, plano **Hobby**);
2. clicar em **Add New → Project**, importar `jose-cad/claude-nextjs` e clicar em **Deploy**, sem alterar nada (o Vercel detecta o Next.js);
3. confirmar em **Settings → Git** que a **Production Branch** é `main`.

O primeiro deploy publica o que está na `main` (só documentos). Pode falhar por ainda não haver app, o que é esperado. Daqui em diante, cada PR recebe uma prévia.

Observação para o usuário: as prévias dos PRs vêm protegidas pelo login do Vercel. Para abrir no celular, faça login no Vercel pelo navegador do celular, ou desligue a proteção em **Settings → Deployment Protection**.

- [ ] **Passo 12: Push e PR**

```bash
git push -u origin tarefa-01-base
gh pr create --base main --head tarefa-01-base --title "Base do projeto: Next.js, Vitest e Supabase local" --body "$(cat <<'EOF'
## O que muda
- Projeto Next.js 16 (TypeScript, Tailwind, App Router) com página provisória
- Vitest e validação das variáveis do servidor
- Supabase local configurado (sem confirmação de e-mail, senha mínima de 8)

## Como testar
- Abra a prévia do Vercel (link no comentário do bot) e veja "Catálogo de Filmes"
- Local: `npx supabase start`, `npm test`, `npm run dev`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e avise o usuário que o PR está pronto para revisão e "Squash and merge".

---

### Tarefa 2: Camada do TMDB

**Branch:** `tarefa-02-tmdb`

**Arquivos:**
- Criar: `src/lib/tmdb/types.ts`, `src/lib/tmdb/client.ts`, `src/lib/netflix.ts`, `src/lib/tmdb/movies.ts`, `src/lib/tmdb/index.ts`, `src/lib/images.ts`
- Testes: `tests/unit/tmdb-client.test.ts`, `tests/unit/netflix.test.ts`, `tests/unit/movies.test.ts`, `tests/unit/images.test.ts`
- Modificar: `.env`, `.env.example`

**Interfaces:**
- Consome: `getEnv()`.
- Produz:
  - tipos `MovieSummary { id; title; posterPath: string|null; year: number|null; onNetflix: boolean|null }`, `MovieDetails` (= `MovieSummary` + `overview: string|null`, `runtimeMinutes: number|null`, `genres: string[]`, `cast: string[]`, `trailerUrl: string|null`, `backdropPath: string|null`), `Page<T> { items; page; totalPages }`, `Genre { id; name }` e `CatalogSort = "popular" | "top_rated"`;
  - `TmdbUnavailableError`, `TmdbNotFoundError`, `createTmdbFetch(opts): TmdbFetch` (com a assinatura `(path, params, revalidateSeconds) => Promise<unknown>`), `REVALIDATE` e `isOnNetflix(providers, netflixIds, region?)`;
  - `createMovieService({ tmdb, netflixIds })`, com `discoverNetflix({page, genreId?, sort})`, `searchMovies(query, page)`, `getMovieDetails(id)`, `getGenres()` e `getNetflixAvailability(id)`;
  - `getMovieService()` e `posterUrl(path, size)`.

- [ ] **Passo 1: Criar a branch**

```bash
git switch main && git pull && git switch -c tarefa-02-tmdb
```

- [ ] **Passo 2: Token do TMDB e IDs da Netflix (ação manual + conferência)**

Peça ao usuário para criar uma conta em https://www.themoviedb.org, abrir *Configurações → API*, solicitar uma chave de desenvolvedor (uso pessoal) e colar o **Token de Leitura da API** (o token longo) em `TMDB_API_TOKEN` no `.env`.

Depois confira os IDs da Netflix no Brasil:

```bash
source <(grep TMDB_API_TOKEN .env)
curl -s -H "Authorization: Bearer $TMDB_API_TOKEN" \
  "https://api.themoviedb.org/3/watch/providers/movie?watch_region=BR&language=pt-BR" \
  | python3 -c "import json,sys; [print(p['provider_id'], p['provider_name']) for p in json.load(sys.stdin)['results'] if 'netflix' in p['provider_name'].lower()]"
```

Esperado: uma ou mais linhas, por exemplo `8 Netflix` (e talvez `1796 Netflix Standard with Ads`). Coloque **todos** os IDs em `NETFLIX_PROVIDER_IDS` no `.env` e no `.env.example`, separados por vírgula.

- [ ] **Passo 3: Tipos**

Criar `src/lib/tmdb/types.ts`:

```ts
// ── Tipos do app ───────────────────────────────────────────────────
export type MovieSummary = {
  id: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  /** true/false = sabemos; null = não deu para verificar */
  onNetflix: boolean | null;
};

export type MovieDetails = MovieSummary & {
  overview: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  cast: string[];
  trailerUrl: string | null;
  backdropPath: string | null;
};

export type Page<T> = { items: T[]; page: number; totalPages: number };

export type Genre = { id: number; name: string };

export type CatalogSort = "popular" | "top_rated";

// ── Formato das respostas do TMDB ──────────────────────────────────
export type TmdbMovieResult = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
};

export type TmdbPaged<T> = { page: number; total_pages: number; results: T[] };

export type TmdbProviders = {
  results?: Record<string, { flatrate?: { provider_id: number }[] }>;
};

export type TmdbVideo = { key: string; site: string; type: string; iso_639_1: string };

export type TmdbDetails = TmdbMovieResult & {
  overview?: string;
  runtime?: number | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[];
  credits?: { cast?: { name: string; order: number }[] };
  videos?: { results?: TmdbVideo[] };
  "watch/providers"?: TmdbProviders;
};
```

- [ ] **Passo 4: Testes do cliente HTTP, da Netflix e das imagens (falhando)**

Criar `tests/unit/tmdb-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createTmdbFetch, TmdbNotFoundError, TmdbUnavailableError } from "@/lib/tmdb/client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createTmdbFetch", () => {
  it("envia o token, codifica parâmetros e pede cache com prazo", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl });
    await tmdb("/search/movie", { query: "Ação & Aventura", page: 2, ignorado: undefined }, 3600);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit & { next?: { revalidate?: number } }];
    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe("Ação & Aventura");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.has("ignorado")).toBe(false);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
    expect(init.next?.revalidate).toBe(3600);
  });

  it("falha de rede vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => { throw new TypeError("fetch failed"); } });
    await expect(tmdb("/x", {}, 60)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("timeout vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => { throw new DOMException("timeout", "TimeoutError"); } });
    await expect(tmdb("/x", {}, 60)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("erro 5xx vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => jsonResponse({}, 503) });
    await expect(tmdb("/x", {}, 60)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("404 vira TmdbNotFoundError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => jsonResponse({}, 404) });
    await expect(tmdb("/movie/1", {}, 60)).rejects.toBeInstanceOf(TmdbNotFoundError);
  });
});
```

Criar `tests/unit/netflix.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isOnNetflix } from "@/lib/netflix";

describe("isOnNetflix", () => {
  it("true quando a Netflix está na assinatura no Brasil", () => {
    expect(isOnNetflix({ results: { BR: { flatrate: [{ provider_id: 337 }, { provider_id: 8 }] } } }, [8])).toBe(true);
  });

  it("aceita qualquer um dos IDs configurados", () => {
    expect(isOnNetflix({ results: { BR: { flatrate: [{ provider_id: 1796 }] } } }, [8, 1796])).toBe(true);
  });

  it("false quando só está em outro país", () => {
    expect(isOnNetflix({ results: { US: { flatrate: [{ provider_id: 8 }] } } }, [8])).toBe(false);
  });

  it("false sem dados", () => {
    expect(isOnNetflix(undefined, [8])).toBe(false);
    expect(isOnNetflix({ results: {} }, [8])).toBe(false);
  });
});
```

Criar `tests/unit/images.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { posterUrl } from "@/lib/images";

describe("posterUrl", () => {
  it("monta a URL no tamanho pedido", () => {
    expect(posterUrl("/abc.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("devolve null sem pôster", () => {
    expect(posterUrl(null, "w342")).toBeNull();
  });
});
```

Rodar: `npm test`. Esperado: FALHA (módulos inexistentes).

- [ ] **Passo 5: Implementar o cliente, a Netflix e as imagens**

Criar `src/lib/tmdb/client.ts`:

```ts
export class TmdbUnavailableError extends Error {}
export class TmdbNotFoundError extends Error {}

export type TmdbParams = Record<string, string | number | undefined>;
export type TmdbFetch = (path: string, params: TmdbParams, revalidateSeconds: number) => Promise<unknown>;

export function createTmdbFetch(opts: {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): TmdbFetch {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, "");

  return async (path, params, revalidateSeconds) => {
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }

    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${opts.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
        // cache de dados do Next.js: a resposta é reaproveitada até vencer o prazo (também no Vercel)
        next: { revalidate: revalidateSeconds },
      } as RequestInit);
    } catch {
      throw new TmdbUnavailableError("O TMDB não respondeu");
    }

    if (res.status === 404) throw new TmdbNotFoundError(path);
    if (!res.ok) {
      console.error(`TMDB respondeu ${res.status} para ${path}`);
      throw new TmdbUnavailableError(`TMDB respondeu ${res.status}`);
    }
    return res.json();
  };
}
```

Criar `src/lib/netflix.ts`:

```ts
import type { TmdbProviders } from "@/lib/tmdb/types";

export function isOnNetflix(providers: TmdbProviders | undefined, netflixIds: number[], region = "BR"): boolean {
  return providers?.results?.[region]?.flatrate?.some((p) => netflixIds.includes(p.provider_id)) ?? false;
}
```

Criar `src/lib/images.ts`:

```ts
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500";

export function posterUrl(path: string | null, size: PosterSize): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 6: Testes do serviço de filmes (falhando)**

Criar `tests/unit/movies.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TmdbUnavailableError, type TmdbFetch } from "@/lib/tmdb/client";
import { createMovieService, MAX_PAGES, MIN_VOTES_TOP_RATED, pickTrailerUrl, REVALIDATE } from "@/lib/tmdb/movies";

function fakeTmdb(routes: Record<string, unknown>) {
  const calls: { path: string; params: Record<string, unknown>; revalidate: number }[] = [];
  const fn: TmdbFetch = async (path, params, revalidate) => {
    calls.push({ path, params, revalidate });
    const route = routes[path];
    if (route instanceof Error) throw route;
    if (route === undefined) throw new Error(`rota não simulada: ${path}`);
    return structuredClone(route);
  };
  return { fn, calls };
}

const onNetflix = { results: { BR: { flatrate: [{ provider_id: 8 }] } } };
const offNetflix = { results: {} };
const movie = (id: number, extra: object = {}) => ({ id, title: `Filme ${id}`, poster_path: `/p${id}.jpg`, release_date: "2021-03-04", ...extra });

function service(routes: Record<string, unknown>) {
  const tmdb = fakeTmdb(routes);
  return { svc: createMovieService({ tmdb: tmdb.fn, netflixIds: [8, 1796] }), calls: tmdb.calls };
}

describe("discoverNetflix", () => {
  it("filtra por Netflix no Brasil, só assinatura, em português, com cache de catálogo", async () => {
    const { svc, calls } = service({ "/discover/movie": { page: 1, total_pages: 3, results: [movie(1)] } });
    const page = await svc.discoverNetflix({ page: 1, sort: "popular", genreId: 35 });

    expect(calls[0].params).toMatchObject({
      watch_region: "BR",
      with_watch_providers: "8|1796",
      with_watch_monetization_types: "flatrate",
      language: "pt-BR",
      sort_by: "popularity.desc",
      with_genres: 35,
      page: 1,
    });
    expect(calls[0].params["vote_count.gte"]).toBeUndefined();
    expect(calls[0].revalidate).toBe(REVALIDATE.catalog);
    expect(page).toEqual({ items: [{ id: 1, title: "Filme 1", posterPath: "/p1.jpg", year: 2021, onNetflix: true }], page: 1, totalPages: 3 });
  });

  it("'mais bem avaliados' exige número mínimo de votos", async () => {
    const { svc, calls } = service({ "/discover/movie": { page: 1, total_pages: 1, results: [] } });
    await svc.discoverNetflix({ page: 1, sort: "top_rated" });
    expect(calls[0].params).toMatchObject({ sort_by: "vote_average.desc", "vote_count.gte": MIN_VOTES_TOP_RATED });
  });

  it("limita o total de páginas ao máximo do TMDB", async () => {
    const { svc } = service({ "/discover/movie": { page: 1, total_pages: 900, results: [] } });
    expect((await svc.discoverNetflix({ page: 1, sort: "popular" })).totalPages).toBe(MAX_PAGES);
  });
});

describe("searchMovies", () => {
  it("marca cada resultado como na Netflix, fora dela ou desconhecido", async () => {
    const { svc, calls } = service({
      "/search/movie": { page: 1, total_pages: 1, results: [movie(1), movie(2), movie(3)] },
      "/movie/1/watch/providers": onNetflix,
      "/movie/2/watch/providers": offNetflix,
      "/movie/3/watch/providers": new TmdbUnavailableError("fora"),
    });
    const page = await svc.searchMovies("filme", 1);
    expect(page.items.map((m) => m.onNetflix)).toEqual([true, false, null]);
    expect(calls.find((c) => c.path === "/search/movie")?.revalidate).toBe(REVALIDATE.search);
    expect(calls.find((c) => c.path === "/movie/1/watch/providers")?.revalidate).toBe(REVALIDATE.providers);
  });

  it("propaga a falha quando a própria busca falha", async () => {
    const { svc } = service({ "/search/movie": new TmdbUnavailableError("fora") });
    await expect(svc.searchMovies("x", 1)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });
});

describe("getMovieDetails", () => {
  it("converte os detalhes completos", async () => {
    const { svc, calls } = service({
      "/movie/7": {
        ...movie(7),
        overview: "Uma história.",
        runtime: 125,
        backdrop_path: "/b7.jpg",
        genres: [{ id: 1, name: "Drama" }],
        credits: { cast: [{ name: "B", order: 1 }, { name: "A", order: 0 }] },
        videos: { results: [{ key: "en1", site: "YouTube", type: "Trailer", iso_639_1: "en" }, { key: "pt1", site: "YouTube", type: "Trailer", iso_639_1: "pt" }] },
        "watch/providers": onNetflix,
      },
    });
    const details = await svc.getMovieDetails(7);
    expect(calls[0].params).toMatchObject({ append_to_response: "credits,videos,watch/providers", language: "pt-BR" });
    expect(calls[0].revalidate).toBe(REVALIDATE.details);
    expect(details).toEqual({
      id: 7,
      title: "Filme 7",
      posterPath: "/p7.jpg",
      year: 2021,
      onNetflix: true,
      overview: "Uma história.",
      runtimeMinutes: 125,
      genres: ["Drama"],
      cast: ["A", "B"],
      trailerUrl: "https://www.youtube.com/watch?v=pt1",
      backdropPath: "/b7.jpg",
    });
  });

  it("devolve null nos campos ausentes em vez de valores vazios", async () => {
    const { svc } = service({ "/movie/8": { id: 8, title: "Sem nada", poster_path: null, overview: "  ", runtime: 0 } });
    expect(await svc.getMovieDetails(8)).toEqual({
      id: 8,
      title: "Sem nada",
      posterPath: null,
      year: null,
      onNetflix: false,
      overview: null,
      runtimeMinutes: null,
      genres: [],
      cast: [],
      trailerUrl: null,
      backdropPath: null,
    });
  });
});

describe("pickTrailerUrl", () => {
  it("ignora vídeos que não são trailer do YouTube", () => {
    expect(pickTrailerUrl([{ key: "x", site: "Vimeo", type: "Trailer", iso_639_1: "pt" }, { key: "y", site: "YouTube", type: "Teaser", iso_639_1: "pt" }])).toBeNull();
  });
});

describe("getGenres", () => {
  it("ordena em ordem alfabética do português", async () => {
    const { svc } = service({ "/genre/movie/list": { genres: [{ id: 3, name: "Comédia" }, { id: 1, name: "Ação" }, { id: 2, name: "Animação" }] } });
    expect((await svc.getGenres()).map((g) => g.name)).toEqual(["Ação", "Animação", "Comédia"]);
  });
});
```

Rodar: `npm test`. Esperado: FALHA (`@/lib/tmdb/movies` inexistente).

- [ ] **Passo 7: Implementar o serviço de filmes**

Criar `src/lib/tmdb/movies.ts`:

```ts
import { isOnNetflix } from "@/lib/netflix";
import type { TmdbFetch } from "./client";
import type {
  CatalogSort,
  Genre,
  MovieDetails,
  MovieSummary,
  Page,
  TmdbDetails,
  TmdbMovieResult,
  TmdbPaged,
  TmdbProviders,
  TmdbVideo,
} from "./types";

export const MAX_PAGES = 500; // o TMDB não entrega além da página 500
export const MIN_VOTES_TOP_RATED = 200;
const LANGUAGE = "pt-BR";
const REGION = "BR";
const HOUR = 60 * 60;

/** Prazos (em segundos) do cache de dados do Next.js para cada tipo de resposta. */
export const REVALIDATE = {
  catalog: 6 * HOUR,
  search: 6 * HOUR,
  details: 24 * HOUR,
  providers: 24 * HOUR,
  genres: 7 * 24 * HOUR,
};

export function toYear(date: string | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export function toSummary(movie: TmdbMovieResult, onNetflix: boolean | null): MovieSummary {
  return { id: movie.id, title: movie.title, posterPath: movie.poster_path ?? null, year: toYear(movie.release_date), onNetflix };
}

export function pickTrailerUrl(videos: TmdbVideo[] | undefined): string | null {
  const trailers = (videos ?? []).filter((v) => v.site === "YouTube" && v.type === "Trailer");
  const best = trailers.find((v) => v.iso_639_1 === "pt") ?? trailers.find((v) => v.iso_639_1 === "en") ?? trailers[0];
  return best ? `https://www.youtube.com/watch?v=${best.key}` : null;
}

export type MovieService = ReturnType<typeof createMovieService>;

export function createMovieService({ tmdb, netflixIds }: { tmdb: TmdbFetch; netflixIds: number[] }) {
  async function getNetflixAvailability(movieId: number): Promise<boolean> {
    const providers = (await tmdb(`/movie/${movieId}/watch/providers`, {}, REVALIDATE.providers)) as TmdbProviders;
    return isOnNetflix(providers, netflixIds, REGION);
  }

  async function availabilityOrNull(movieId: number): Promise<boolean | null> {
    try {
      return await getNetflixAvailability(movieId);
    } catch {
      return null;
    }
  }

  return {
    getNetflixAvailability,

    async discoverNetflix({ page, genreId, sort }: { page: number; genreId?: number; sort: CatalogSort }): Promise<Page<MovieSummary>> {
      const data = (await tmdb(
        "/discover/movie",
        {
          language: LANGUAGE,
          watch_region: REGION,
          with_watch_providers: netflixIds.join("|"),
          with_watch_monetization_types: "flatrate",
          sort_by: sort === "top_rated" ? "vote_average.desc" : "popularity.desc",
          "vote_count.gte": sort === "top_rated" ? MIN_VOTES_TOP_RATED : undefined,
          with_genres: genreId,
          include_adult: "false",
          page,
        },
        REVALIDATE.catalog,
      )) as TmdbPaged<TmdbMovieResult>;
      return {
        items: data.results.map((m) => toSummary(m, true)),
        page: data.page,
        totalPages: Math.min(data.total_pages, MAX_PAGES),
      };
    },

    async searchMovies(query: string, page: number): Promise<Page<MovieSummary>> {
      const data = (await tmdb(
        "/search/movie",
        { query, language: LANGUAGE, include_adult: "false", page },
        REVALIDATE.search,
      )) as TmdbPaged<TmdbMovieResult>;
      const items = await Promise.all(data.results.map(async (m) => toSummary(m, await availabilityOrNull(m.id))));
      return { items, page: data.page, totalPages: Math.min(data.total_pages, MAX_PAGES) };
    },

    async getMovieDetails(movieId: number): Promise<MovieDetails> {
      const d = (await tmdb(
        `/movie/${movieId}`,
        { language: LANGUAGE, append_to_response: "credits,videos,watch/providers", include_video_language: "pt,en" },
        REVALIDATE.details,
      )) as TmdbDetails;
      return {
        ...toSummary(d, isOnNetflix(d["watch/providers"], netflixIds, REGION)),
        overview: d.overview?.trim() || null,
        runtimeMinutes: d.runtime || null,
        genres: (d.genres ?? []).map((g) => g.name),
        cast: [...(d.credits?.cast ?? [])]
          .sort((a, b) => a.order - b.order)
          .slice(0, 5)
          .map((c) => c.name),
        trailerUrl: pickTrailerUrl(d.videos?.results),
        backdropPath: d.backdrop_path ?? null,
      };
    },

    async getGenres(): Promise<Genre[]> {
      const data = (await tmdb("/genre/movie/list", { language: LANGUAGE }, REVALIDATE.genres)) as { genres: Genre[] };
      return [...data.genres].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  };
}
```

Criar `src/lib/tmdb/index.ts`:

```ts
import "server-only";
import { getEnv } from "@/lib/env";
import { createTmdbFetch } from "./client";
import { createMovieService, type MovieService } from "./movies";

let cached: MovieService | undefined;

export function getMovieService(): MovieService {
  if (!cached) {
    const env = getEnv();
    cached = createMovieService({
      tmdb: createTmdbFetch({ baseUrl: env.TMDB_BASE_URL, token: env.TMDB_API_TOKEN }),
      netflixIds: env.NETFLIX_PROVIDER_IDS,
    });
  }
  return cached;
}
```

- [ ] **Passo 8: Rodar os testes**

Rodar: `npm test && npm run lint`
Esperado: PASSA, sem erros de lint.

- [ ] **Passo 9: Commit, push e PR**

```bash
git add -A
git commit -m "feat: camada do TMDB com disponibilidade na Netflix e cache do Next.js"
git push -u origin tarefa-02-tmdb
gh pr create --base main --head tarefa-02-tmdb --title "Camada do TMDB" --body "$(cat <<'EOF'
## O que muda
- Cliente do TMDB com timeout, erros tipados e cache de dados do Next.js
- Serviço de filmes: catálogo da Netflix BR, busca com selo de disponibilidade, detalhes e gêneros
- Só testes unitários nesta etapa (ainda sem tela)

## Como testar
- `npm test`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e espere o "Squash and merge".

---

### Tarefa 3: Catálogo público (API, tela, rolagem infinita, busca)

**Branch:** `tarefa-03-catalogo`

**Arquivos:**
- Criar: `src/lib/api/params.ts`, `src/lib/api/http.ts`, `src/app/api/catalogo/route.ts`, `src/app/api/busca/route.ts`, `src/app/api/generos/route.ts`, `src/lib/api-client.ts`, `src/lib/infinite.ts`, `src/hooks/useDebouncedValue.ts`, `src/hooks/useInfiniteMovies.ts`, `src/components/NavBar.tsx`, `src/components/StatusMessage.tsx`, `src/components/NetflixBadge.tsx`, `src/components/MovieCard.tsx`, `src/components/MovieGrid.tsx`, `src/components/InfiniteSentinel.tsx`, `src/components/CatalogToolbar.tsx`, `src/components/CatalogView.tsx`, `tests/mocks/tmdb-server.ts`, `playwright.config.ts`
- Testes: `tests/unit/params.test.ts`, `tests/unit/infinite.test.ts`, `tests/e2e/catalog.spec.ts`
- Modificar: `src/app/page.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Consome: `getMovieService()`, `TmdbUnavailableError`, `TmdbNotFoundError`, `posterUrl`, `MovieSummary`, `Page`, `Genre` e `CatalogSort`.
- Produz:
  - funções puras `parsePage`, `parseGenreId`, `parseSort`, `parseMovieId`, `parseQuery`; `jsonError(status, code)` e `tmdbResponse(load)`;
  - `apiFetch<T>(url, init?)`, `NetworkError`, `ServiceUnavailableError`, `UnauthorizedError`, `ApiError` e `errorMessage(e)`;
  - `nextPage`, `mergeUnique`, `withPageParam`; `useInfiniteMovies(url)` e `useDebouncedValue(value, ms)`;
  - os tipos `ListMarks { want; favorite }` e os componentes `<MovieGrid movies showBadges getMarks? onSelect />`, `<NetflixBadge onNetflix />`, `<StatusMessage>`, `<NavBar />` e `<CatalogView />`;
  - rotas públicas `GET /api/catalogo?pagina&genero&ordem`, `GET /api/busca?q&pagina` e `GET /api/generos`, que devolvem 503 com `{error:"tmdb_unavailable"}` quando o TMDB cai.

- [ ] **Passo 1: Criar a branch**

```bash
git switch main && git pull && git switch -c tarefa-03-catalogo
```

- [ ] **Passo 2: Testes das funções puras (falhando)**

Criar `tests/unit/params.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseGenreId, parseMovieId, parsePage, parseQuery, parseSort } from "@/lib/api/params";

describe("parâmetros das rotas", () => {
  it("parsePage aceita 1..500 e usa 1 no resto", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(null)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("501")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });

  it("parseGenreId aceita inteiro positivo", () => {
    expect(parseGenreId("35")).toBe(35);
    expect(parseGenreId(null)).toBeUndefined();
    expect(parseGenreId("-1")).toBeUndefined();
  });

  it("parseSort só aceita top_rated como alternativa", () => {
    expect(parseSort("top_rated")).toBe("top_rated");
    expect(parseSort("qualquer")).toBe("popular");
    expect(parseSort(null)).toBe("popular");
  });

  it("parseMovieId aceita inteiro positivo", () => {
    expect(parseMovieId("550")).toBe(550);
    expect(parseMovieId("x")).toBeNull();
    expect(parseMovieId(undefined)).toBeNull();
  });

  it("parseQuery tira espaços e limita o tamanho", () => {
    expect(parseQuery("  matrix  ")).toBe("matrix");
    expect(parseQuery(null)).toBe("");
    expect(parseQuery("a".repeat(150))).toHaveLength(100);
  });
});
```

Criar `tests/unit/infinite.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mergeUnique, nextPage, withPageParam } from "@/lib/infinite";

const m = (id: number) => ({ id, title: `F${id}`, posterPath: null, year: null, onNetflix: true });

describe("rolagem infinita", () => {
  it("nextPage avança até a última página", () => {
    expect(nextPage(0, 3)).toBe(1);
    expect(nextPage(2, 3)).toBe(3);
    expect(nextPage(3, 3)).toBeNull();
    expect(nextPage(1, 0)).toBeNull();
  });

  it("mergeUnique não repete filmes que aparecem em duas páginas", () => {
    expect(mergeUnique([m(1), m(2)], [m(2), m(3)]).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("withPageParam respeita parâmetros existentes", () => {
    expect(withPageParam("/api/catalogo?ordem=popular", 2)).toBe("/api/catalogo?ordem=popular&pagina=2");
    expect(withPageParam("/api/generos", 1)).toBe("/api/generos?pagina=1");
  });
});
```

Rodar: `npm test`. Esperado: FALHA (módulos inexistentes).

- [ ] **Passo 3: Implementar as funções puras**

Criar `src/lib/api/params.ts`:

```ts
import type { CatalogSort } from "@/lib/tmdb/types";

export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}

export function parseGenreId(value: string | null): number | undefined {
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : undefined;
}

export function parseSort(value: string | null): CatalogSort {
  return value === "top_rated" ? "top_rated" : "popular";
}

export function parseMovieId(value: string | null | undefined): number | null {
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : null;
}

export function parseQuery(value: string | null): string {
  return (value ?? "").trim().slice(0, 100);
}
```

Criar `src/lib/infinite.ts`:

```ts
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
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 4: Rotas da API (públicas)**

Criar `src/lib/api/http.ts`:

```ts
import { TmdbNotFoundError, TmdbUnavailableError } from "@/lib/tmdb/client";

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Responde com os dados do TMDB ou traduz a falha em um código HTTP. */
export async function tmdbResponse(load: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await load());
  } catch (error) {
    if (error instanceof TmdbUnavailableError) return jsonError(503, "tmdb_unavailable");
    if (error instanceof TmdbNotFoundError) return jsonError(404, "not_found");
    console.error(error);
    return jsonError(500, "internal_error");
  }
}
```

Criar `src/app/api/catalogo/route.ts`:

```ts
import { tmdbResponse } from "@/lib/api/http";
import { parseGenreId, parsePage, parseSort } from "@/lib/api/params";
import { getMovieService } from "@/lib/tmdb";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  return tmdbResponse(() =>
    getMovieService().discoverNetflix({
      page: parsePage(params.get("pagina")),
      genreId: parseGenreId(params.get("genero")),
      sort: parseSort(params.get("ordem")),
    }),
  );
}
```

Criar `src/app/api/busca/route.ts`:

```ts
import { tmdbResponse } from "@/lib/api/http";
import { parsePage, parseQuery } from "@/lib/api/params";
import { getMovieService } from "@/lib/tmdb";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const query = parseQuery(params.get("q"));
  if (!query) return Response.json({ items: [], page: 1, totalPages: 1 });
  return tmdbResponse(() => getMovieService().searchMovies(query, parsePage(params.get("pagina"))));
}
```

Criar `src/app/api/generos/route.ts`:

```ts
import { tmdbResponse } from "@/lib/api/http";
import { getMovieService } from "@/lib/tmdb";

export async function GET() {
  return tmdbResponse(async () => ({ genres: await getMovieService().getGenres() }));
}
```

- [ ] **Passo 5: Cliente de API do navegador e hooks**

Criar `src/lib/api-client.ts`:

```ts
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
```

Criar `src/hooks/useDebouncedValue.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

Criar `src/hooks/useInfiniteMovies.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { mergeUnique, nextPage, withPageParam } from "@/lib/infinite";
import type { MovieSummary, Page } from "@/lib/tmdb/types";

type State = { items: MovieSummary[]; page: number; totalPages: number; loading: boolean; error: string | null };

const EMPTY: State = { items: [], page: 0, totalPages: 1, loading: false, error: null };

export function useInfiniteMovies(baseUrl: string) {
  const [state, setState] = useState<State>({ ...EMPTY, loading: true });
  const stateRef = useRef(state);
  const requestId = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const load = useCallback(
    async (page: number, reset: boolean) => {
      const id = ++requestId.current;
      setState((s) => ({ ...(reset ? EMPTY : s), loading: true, error: null }));
      try {
        const data = await apiFetch<Page<MovieSummary>>(withPageParam(baseUrl, page));
        if (id !== requestId.current) return; // resposta de uma busca antiga
        setState((s) => ({
          items: reset ? data.items : mergeUnique(s.items, data.items),
          page: data.page,
          totalPages: data.totalPages,
          loading: false,
          error: null,
        }));
      } catch (error) {
        if (id !== requestId.current) return;
        setState((s) => ({ ...s, loading: false, error: errorMessage(error) }));
      }
    },
    [baseUrl],
  );

  useEffect(() => {
    void load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    const s = stateRef.current;
    const next = nextPage(s.page, s.totalPages);
    if (next === null || s.loading || s.error) return;
    stateRef.current = { ...s, loading: true };
    void load(next, false);
  }, [load]);

  const hasMore = nextPage(state.page, state.totalPages) !== null;
  return { ...state, hasMore, loadMore };
}
```

- [ ] **Passo 6: Componentes visuais**

Criar `src/components/NavBar.tsx` (a Tarefa 5 acrescenta Entrar, Minhas listas e Conta):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex h-full max-w-5xl">
        <li className="flex-1">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex h-full items-center justify-center text-sm font-medium text-white"
          >
            Catálogo
          </Link>
        </li>
      </ul>
    </nav>
  );
}
```

Criar `src/components/StatusMessage.tsx`:

```tsx
export function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="p-6 text-center text-sm text-neutral-400">
      {children}
    </p>
  );
}
```

Criar `src/components/NetflixBadge.tsx`:

```tsx
export function NetflixBadge({ onNetflix }: { onNetflix: boolean }) {
  return onNetflix ? (
    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Na Netflix</span>
  ) : (
    <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-100">Fora da Netflix</span>
  );
}
```

Criar `src/components/MovieCard.tsx`:

```tsx
"use client";

import { posterUrl } from "@/lib/images";
import type { MovieSummary } from "@/lib/tmdb/types";
import { NetflixBadge } from "./NetflixBadge";

export type ListMarks = { want: boolean; favorite: boolean };

type Props = {
  movie: MovieSummary;
  showBadge: boolean;
  marks?: ListMarks;
  onSelect: (movie: MovieSummary) => void;
};

export function MovieCard({ movie, showBadge, marks, onSelect }: Props) {
  const src = posterUrl(movie.posterPath, "w342");
  const mark = marks?.favorite ? "favorite" : marks?.want ? "want" : null;

  return (
    <li>
      <button
        type="button"
        aria-label={movie.title}
        onClick={() => onSelect(movie)}
        className="relative block w-full overflow-hidden rounded-md bg-neutral-800 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <div className="aspect-[2/3] w-full">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- pôsteres já vêm no tamanho certo do TMDB
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-neutral-200">{movie.title}</div>
          )}
        </div>
        {mark && (
          <span data-mark={mark} aria-hidden className="absolute right-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-xs">
            {mark === "favorite" ? "★" : "＋"}
          </span>
        )}
        {showBadge && movie.onNetflix !== null && (
          <span className="absolute bottom-1 left-1">
            <NetflixBadge onNetflix={movie.onNetflix} />
          </span>
        )}
      </button>
    </li>
  );
}
```

Criar `src/components/MovieGrid.tsx`:

```tsx
"use client";

import type { MovieSummary } from "@/lib/tmdb/types";
import { MovieCard, type ListMarks } from "./MovieCard";

type Props = {
  movies: MovieSummary[];
  showBadges: boolean;
  getMarks?: (movieId: number) => ListMarks;
  onSelect: (movie: MovieSummary) => void;
};

export function MovieGrid({ movies, showBadges, getMarks, onSelect }: Props) {
  return (
    <ul className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} showBadge={showBadges} marks={getMarks?.(movie.id)} onSelect={onSelect} />
      ))}
    </ul>
  );
}
```

Criar `src/components/InfiniteSentinel.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

type Props = { onVisible: () => void; disabled: boolean; watchKey: number };

/** Chama onVisible quando o fim da lista se aproxima. watchKey recria o observador após cada carga. */
export function InfiniteSentinel({ onVisible, disabled, watchKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);

  useEffect(() => {
    callback.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const node = ref.current;
    if (disabled || !node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) callback.current();
    }, { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled, watchKey]);

  return <div ref={ref} aria-hidden className="h-1" />;
}
```

Criar `src/components/CatalogToolbar.tsx`:

```tsx
"use client";

import type { CatalogSort, Genre } from "@/lib/tmdb/types";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  genreId: number | null;
  onGenreChange: (value: number | null) => void;
  sort: CatalogSort;
  onSortChange: (value: CatalogSort) => void;
  genres: Genre[];
};

const control = "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm disabled:opacity-50";

export function CatalogToolbar({ query, onQueryChange, genreId, onGenreChange, sort, onSortChange, genres }: Props) {
  const searching = query.trim() !== "";
  return (
    <div className="sticky top-0 z-30 space-y-2 border-b border-neutral-800 bg-neutral-950/95 p-2 backdrop-blur md:top-14">
      <input
        type="search"
        aria-label="Buscar filme pelo nome"
        placeholder="Buscar filme pelo nome"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className={`${control} w-full`}
      />
      <div className="flex gap-2">
        <select
          aria-label="Gênero"
          value={genreId ?? ""}
          onChange={(e) => onGenreChange(e.target.value ? Number(e.target.value) : null)}
          disabled={searching}
          className={`${control} flex-1`}
        >
          <option value="">Todos os gêneros</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CatalogSort)}
          disabled={searching}
          className={`${control} flex-1`}
        >
          <option value="popular">Populares</option>
          <option value="top_rated">Mais bem avaliados</option>
        </select>
      </div>
    </div>
  );
}
```

Criar `src/components/CatalogView.tsx` (a Tarefa 4 acrescenta o modal):

```tsx
"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteMovies } from "@/hooks/useInfiniteMovies";
import { apiFetch } from "@/lib/api-client";
import type { CatalogSort, Genre } from "@/lib/tmdb/types";
import { CatalogToolbar } from "./CatalogToolbar";
import { InfiniteSentinel } from "./InfiniteSentinel";
import { MovieGrid } from "./MovieGrid";
import { StatusMessage } from "./StatusMessage";

export function CatalogView() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [sort, setSort] = useState<CatalogSort>("popular");
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    apiFetch<{ genres: Genre[] }>("/api/generos")
      .then((data) => setGenres(data.genres))
      .catch(() => setGenres([])); // sem gêneros, o filtro mostra só "Todos os gêneros"
  }, []);

  const searching = debouncedQuery !== "";
  const url = searching
    ? `/api/busca?q=${encodeURIComponent(debouncedQuery)}`
    : `/api/catalogo?ordem=${sort}${genreId ? `&genero=${genreId}` : ""}`;
  const { items, loading, error, hasMore, loadMore } = useInfiniteMovies(url);

  return (
    <>
      <CatalogToolbar
        query={query}
        onQueryChange={setQuery}
        genreId={genreId}
        onGenreChange={setGenreId}
        sort={sort}
        onSortChange={setSort}
        genres={genres}
      />
      <MovieGrid movies={items} showBadges={searching} onSelect={() => {}} />
      {error && <StatusMessage>{error}</StatusMessage>}
      {!error && !loading && items.length === 0 && <StatusMessage>Nenhum filme encontrado.</StatusMessage>}
      {loading && <StatusMessage>Carregando...</StatusMessage>}
      <InfiniteSentinel onVisible={loadMore} disabled={Boolean(error) || loading || !hasMore} watchKey={items.length} />
    </>
  );
}
```

Substituir `src/app/page.tsx` por:

```tsx
import { CatalogView } from "@/components/CatalogView";

export default function CatalogoPage() {
  return <CatalogView />;
}
```

Em `src/app/layout.tsx`, adicionar o import `import { NavBar } from "@/components/NavBar";` e trocar o `<body>` por:

```tsx
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        <NavBar />
        <main className="pb-16 md:pb-0">{children}</main>
      </body>
```

- [ ] **Passo 7: TMDB simulado e Playwright**

```bash
npm install -D @playwright/test tsx
npx playwright install chromium
npm pkg set scripts.test:e2e="playwright test"
```

Criar `tests/mocks/tmdb-server.ts`:

```ts
// TMDB falso para os testes E2E. Dados determinísticos:
// - catálogo: 3 páginas de 20 filmes; página p tem ids p*100 .. p*100+19 ("Filme 100"...)
// - com gênero 35 os títulos começam com "Comédia"; com "mais bem avaliados", com "Top"
// - busca: "tmdb-fora" responde 500; "nada" volta vazio; o resto devolve 9001 (na Netflix) e 9002 (fora)
// - o filme 9002 não tem pôster, sinopse, duração nem trailer
import { createServer, type ServerResponse } from "node:http";

const PORT = 4010;
const NETFLIX = 8;
const OFF_NETFLIX_ID = 9002;

const movie = (id: number, title: string) => ({ id, title, poster_path: null, release_date: "2020-05-01" });

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.headers.authorization !== "Bearer test-token") return json(res, 401, { status_message: "token inválido" });
  const path = url.pathname;

  if (path === "/3/genre/movie/list") {
    return json(res, 200, { genres: [{ id: 35, name: "Comédia" }, { id: 28, name: "Ação" }] });
  }

  if (path === "/3/discover/movie") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const prefix = url.searchParams.get("with_genres") === "35" ? "Comédia" : url.searchParams.get("sort_by") === "vote_average.desc" ? "Top" : "Filme";
    const results = Array.from({ length: 20 }, (_, i) => movie(page * 100 + i, `${prefix} ${page * 100 + i}`));
    return json(res, 200, { page, total_pages: 3, total_results: 60, results });
  }

  if (path === "/3/search/movie") {
    const query = url.searchParams.get("query") ?? "";
    if (query === "tmdb-fora") return json(res, 500, { status_message: "fora do ar" });
    if (query === "nada") return json(res, 200, { page: 1, total_pages: 1, results: [] });
    return json(res, 200, { page: 1, total_pages: 1, results: [movie(9001, "Achado na Netflix"), movie(OFF_NETFLIX_ID, "Achado fora da Netflix")] });
  }

  const providers = path.match(/^\/3\/movie\/(\d+)\/watch\/providers$/);
  if (providers) {
    const id = Number(providers[1]);
    return json(res, 200, { id, results: id === OFF_NETFLIX_ID ? {} : { BR: { flatrate: [{ provider_id: NETFLIX }] } } });
  }

  const details = path.match(/^\/3\/movie\/(\d+)$/);
  if (details) {
    const id = Number(details[1]);
    if (id === OFF_NETFLIX_ID) {
      return json(res, 200, { ...movie(id, "Achado fora da Netflix"), overview: "", runtime: null, genres: [], credits: { cast: [] }, videos: { results: [] }, "watch/providers": { results: {} } });
    }
    return json(res, 200, {
      ...movie(id, id === 9001 ? "Achado na Netflix" : `Filme ${id}`),
      overview: `Sinopse do filme ${id}.`,
      runtime: 125,
      genres: [{ id: 28, name: "Ação" }],
      credits: { cast: [{ name: "Atriz Um", order: 0 }, { name: "Ator Dois", order: 1 }] },
      videos: { results: [{ key: `trailer${id}`, site: "YouTube", type: "Trailer", iso_639_1: "pt" }] },
      "watch/providers": { results: { BR: { flatrate: [{ provider_id: NETFLIX }] } } },
    });
  }

  json(res, 404, { status_message: "não encontrado" });
}).listen(PORT, () => console.log(`TMDB simulado em http://localhost:${PORT}`));
```

Criar `playwright.config.ts`:

```ts
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 30_000,
  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npx tsx tests/mocks/tmdb-server.ts",
      port: 4010,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        ...(process.env as Record<string, string>),
        TMDB_API_TOKEN: "test-token",
        TMDB_BASE_URL: "http://localhost:4010/3",
        NETFLIX_PROVIDER_IDS: "8",
      },
    },
  ],
});
```

Observações:
- o `npm run dev` e os testes E2E disputam a pasta `.next`. **Pare o `npm run dev` antes de rodar `npm run test:e2e`**;
- o cache de dados do Next guarda as respostas do TMDB simulado em `.next/cache`. Como o simulado é determinístico, isso não atrapalha.

- [ ] **Passo 8: Testes E2E do catálogo**

Criar `tests/e2e/catalog.spec.ts`:

```ts
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
```

- [ ] **Passo 9: Rodar todos os testes**

```bash
npm test
npm run lint
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 10: Conferir com o TMDB real**

Rode `npm run dev`, abra http://localhost:3000 e confira: os pôsteres da Netflix aparecem, a rolagem carrega mais, os filtros funcionam e uma busca (ex.: "Matrix") mostra os selos.

- [ ] **Passo 11: Variáveis do TMDB no Vercel (ação manual do usuário)**

Peça ao usuário para abrir, no Vercel, *Project → Settings → Environment Variables* e cadastrar, marcando **Production** e **Preview**:
- `TMDB_API_TOKEN` = o token do `.env`;
- `NETFLIX_PROVIDER_IDS` = o mesmo valor do `.env`.

- [ ] **Passo 12: Commit, push e PR**

```bash
git add -A
git commit -m "feat: catálogo público da Netflix com busca, filtros e rolagem infinita"
git push -u origin tarefa-03-catalogo
gh pr create --base main --head tarefa-03-catalogo --title "Catálogo público" --body "$(cat <<'EOF'
## O que muda
- Catálogo da Netflix BR aberto a qualquer pessoa, com rolagem infinita
- Busca no TMDB inteiro com selo "Na Netflix" / "Fora da Netflix"
- Filtro por gênero e ordenação (Populares / Mais bem avaliados)
- Avisos de serviço indisponível, sem conexão e busca vazia

## Como testar
- Abra a prévia do Vercel no celular: role, filtre, busque um filme
- Local: `npm run test:e2e` (TMDB simulado)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e espere o "Squash and merge".

---

### Tarefa 4: Modal de detalhes

**Branch:** `tarefa-04-modal`

**Arquivos:**
- Criar: `src/lib/format.ts`, `src/lib/modal-stack.ts`, `src/hooks/useBackToClose.ts`, `src/hooks/useScrollLock.ts`, `src/components/Dialog.tsx`, `src/components/MovieModal.tsx`, `src/app/api/filmes/[id]/route.ts`
- Testes: `tests/unit/format.test.ts`, `tests/unit/modal-stack.test.ts`, `tests/e2e/modal.spec.ts`
- Modificar: `src/components/CatalogView.tsx`

**Interfaces:**
- Consome: `apiFetch`, `errorMessage`, `posterUrl`, `NetflixBadge`, `MovieSummary`, `MovieDetails`, `parseMovieId` e `tmdbResponse`.
- Produz:
  - `formatRuntime(minutes)`, a classe `ModalStack` (`push`, `remove`, `closeTop`, `size`), `useBackToClose(open, onClose): () => void` e `useScrollLock(active)`;
  - `<Dialog open onClose labelledBy layer?="base"|"top">{(close) => ...}</Dialog>`;
  - `<MovieModal movie onClose actions? />`, onde `actions` é `(movie: { tmdbMovieId; title; posterPath }) => ReactNode`;
  - a rota `GET /api/filmes/{id}`.

- [ ] **Passo 1: Criar a branch**

```bash
git switch main && git pull && git switch -c tarefa-04-modal
```

- [ ] **Passo 2: Testes de `formatRuntime` e da pilha de modais (falhando)**

Criar `tests/unit/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatRuntime } from "@/lib/format";

describe("formatRuntime", () => {
  it("formata horas e minutos", () => {
    expect(formatRuntime(125)).toBe("2h 05min");
    expect(formatRuntime(60)).toBe("1h 00min");
  });

  it("formata só minutos abaixo de uma hora", () => {
    expect(formatRuntime(45)).toBe("45min");
  });

  it("devolve null sem duração", () => {
    expect(formatRuntime(null)).toBeNull();
  });
});
```

Criar `tests/unit/modal-stack.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { ModalStack } from "@/lib/modal-stack";

describe("ModalStack", () => {
  it("fecha só o modal do topo", () => {
    const stack = new ModalStack();
    const fecharDetalhes = vi.fn();
    const fecharLogin = vi.fn();
    stack.push(fecharDetalhes);
    stack.push(fecharLogin);

    expect(stack.closeTop()).toBe(true);
    expect(fecharLogin).toHaveBeenCalledTimes(1);
    expect(fecharDetalhes).not.toHaveBeenCalled();
    expect(stack.size).toBe(1);
  });

  it("remover um modal tira só ele da pilha", () => {
    const stack = new ModalStack();
    const a = vi.fn();
    const b = vi.fn();
    stack.push(a);
    stack.push(b);
    stack.remove(a);
    stack.closeTop();
    expect(b).toHaveBeenCalled();
    expect(stack.size).toBe(0);
  });

  it("pilha vazia não faz nada", () => {
    expect(new ModalStack().closeTop()).toBe(false);
  });
});
```

Rodar: `npm test`. Esperado: FALHA.

- [ ] **Passo 3: Implementar `format`, `modal-stack` e os hooks**

Criar `src/lib/format.ts`:

```ts
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, "0")}min` : `${rest}min`;
}
```

Criar `src/lib/modal-stack.ts`:

```ts
/** Pilha dos modais abertos: o "voltar" e o Esc fecham só o do topo. */
export class ModalStack {
  private entries: Array<() => void> = [];

  push(close: () => void): void {
    this.entries.push(close);
  }

  remove(close: () => void): void {
    const index = this.entries.lastIndexOf(close);
    if (index >= 0) this.entries.splice(index, 1);
  }

  closeTop(): boolean {
    const top = this.entries.pop();
    top?.();
    return top !== undefined;
  }

  get size(): number {
    return this.entries.length;
  }
}
```

Rodar: `npm test`. Esperado: PASSA.

Criar `src/hooks/useBackToClose.ts`. Ao abrir, o modal empilha no histórico uma **cópia do estado atual** (mesma URL, mesmo estado do Next). O "voltar" desfaz só essa cópia e dispara `popstate`, sem navegar. Fechar por X, Esc ou clique fora chama `history.back()`, então o histórico fica sempre limpo.

```ts
"use client";

import { useEffect, useRef } from "react";
import { ModalStack } from "@/lib/modal-stack";

const stack = new ModalStack();
let listening = false;

function listenOnce() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", () => {
    stack.closeTop();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && stack.size > 0) window.history.back();
  });
}

/** Enquanto o modal está aberto, "voltar" e Esc o fecham (só o do topo). Devolve a função de fechar. */
export function useBackToClose(open: boolean, onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  const pushed = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      pushed.current = false;
      return;
    }
    listenOnce();
    if (!pushed.current) {
      window.history.pushState(window.history.state, "");
      pushed.current = true;
    }
    const entry = () => onCloseRef.current();
    stack.push(entry);
    return () => stack.remove(entry);
  }, [open]);

  return () => window.history.back();
}
```

Criar `src/hooks/useScrollLock.ts`:

```ts
"use client";

import { useEffect } from "react";

let locks = 0;

/** Trava a rolagem do fundo sem mudar a posição; funciona com modais empilhados. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    document.documentElement.style.overflow = "hidden";
    return () => {
      locks -= 1;
      if (locks === 0) document.documentElement.style.overflow = "";
    };
  }, [active]);
}
```

- [ ] **Passo 4: Componente `Dialog` (base de todos os modais)**

Criar `src/components/Dialog.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useScrollLock } from "@/hooks/useScrollLock";

type Props = {
  open: boolean;
  onClose: () => void;
  /** id do título do modal: vira o nome acessível do diálogo */
  labelledBy: string;
  /** "top" fica acima de outro modal aberto (ex.: login por cima dos detalhes) */
  layer?: "base" | "top";
  children: (close: () => void) => React.ReactNode;
};

export function Dialog({ open, onClose, labelledBy, layer = "base", children }: Props) {
  const close = useBackToClose(open, onClose);
  useScrollLock(open);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${layer === "top" ? "z-[60]" : "z-50"} flex items-center justify-center bg-black/70 p-4`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-neutral-900 p-4 shadow-xl"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute right-2 top-2 rounded p-2 text-neutral-300 hover:text-white"
        >
          ✕
        </button>
        {children(close)}
      </div>
    </div>
  );
}
```

- [ ] **Passo 5: Teste E2E do modal (falhando)**

Criar `tests/e2e/modal.spec.ts`:

```ts
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
```

Rodar: `npm run test:e2e -- modal`. Esperado: FALHA (o clique no card ainda não abre nada).

- [ ] **Passo 6: Rota de detalhes e o modal**

Criar `src/app/api/filmes/[id]/route.ts`:

```ts
import { jsonError, tmdbResponse } from "@/lib/api/http";
import { parseMovieId } from "@/lib/api/params";
import { getMovieService } from "@/lib/tmdb";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const movieId = parseMovieId((await params).id);
  if (movieId === null) return jsonError(400, "invalid_id");
  return tmdbResponse(() => getMovieService().getMovieDetails(movieId));
}
```

Criar `src/components/MovieModal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatRuntime } from "@/lib/format";
import { posterUrl } from "@/lib/images";
import type { MovieDetails, MovieSummary } from "@/lib/tmdb/types";
import { Dialog } from "./Dialog";
import { NetflixBadge } from "./NetflixBadge";

export type ModalMovie = { tmdbMovieId: number; title: string; posterPath: string | null };

type Props = {
  movie: MovieSummary | null;
  onClose: () => void;
  actions?: (movie: ModalMovie) => React.ReactNode;
};

export function MovieModal({ movie, onClose, actions }: Props) {
  return (
    <Dialog open={movie !== null} onClose={onClose} labelledBy="movie-modal-title">
      {() => movie && <MovieModalContent movie={movie} actions={actions} />}
    </Dialog>
  );
}

function MovieModalContent({ movie, actions }: { movie: MovieSummary; actions?: Props["actions"] }) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<MovieDetails>(`/api/filmes/${movie.id}`)
      .then((data) => active && setDetails(data))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [movie.id]);

  const shown = details ?? movie;
  const onNetflix = details ? details.onNetflix : movie.onNetflix;
  const poster = posterUrl(shown.posterPath, "w342");
  const meta = [shown.year, details ? formatRuntime(details.runtimeMinutes) : null].filter(Boolean).join(" · ");

  return (
    <>
      <div className="flex gap-4">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element -- imagem do TMDB no tamanho certo
          <img src={poster} alt="" className="w-24 shrink-0 self-start rounded" />
        )}
        <div className="min-w-0 space-y-1 pr-8">
          <h2 id="movie-modal-title" className="text-lg font-semibold">
            {shown.title}
          </h2>
          {meta && <p className="text-sm text-neutral-400">{meta}</p>}
          {details && details.genres.length > 0 && <p className="text-sm text-neutral-400">{details.genres.join(", ")}</p>}
          {onNetflix !== null && <NetflixBadge onNetflix={onNetflix} />}
        </div>
      </div>

      {error && (
        <p role="status" className="mt-4 text-sm text-neutral-400">
          {error}
        </p>
      )}
      {!details && !error && (
        <p role="status" className="mt-4 text-sm text-neutral-400">
          Carregando...
        </p>
      )}
      {details && (
        <div className="mt-4 space-y-3 text-sm">
          <p>{details.overview ?? "Sinopse indisponível."}</p>
          {details.cast.length > 0 && <p className="text-neutral-400">Elenco: {details.cast.join(", ")}</p>}
          {details.trailerUrl && (
            <a href={details.trailerUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-red-400 underline">
              Ver trailer no YouTube
            </a>
          )}
        </div>
      )}

      {actions?.({ tmdbMovieId: movie.id, title: shown.title, posterPath: shown.posterPath })}
    </>
  );
}
```

- [ ] **Passo 7: Ligar o modal ao catálogo**

Em `src/components/CatalogView.tsx`:
- adicionar o import `import { MovieModal } from "./MovieModal";`;
- trocar o import de tipos por `import type { CatalogSort, Genre, MovieSummary } from "@/lib/tmdb/types";`;
- dentro do componente, adicionar `const [selected, setSelected] = useState<MovieSummary | null>(null);`;
- trocar `onSelect={() => {}}` por `onSelect={setSelected}`;
- logo antes do `</>` final, adicionar `<MovieModal movie={selected} onClose={() => setSelected(null)} />`.

- [ ] **Passo 8: Rodar todos os testes**

```bash
npm test
npm run lint
npm run test:e2e
```

Esperado: todos PASSAM, incluindo `modal.spec.ts`.

- [ ] **Passo 9: Commit, push e PR**

```bash
git add -A
git commit -m "feat: modal de detalhes que preserva a posição da lista"
git push -u origin tarefa-04-modal
gh pr create --base main --head tarefa-04-modal --title "Modal de detalhes" --body "$(cat <<'EOF'
## O que muda
- Tocar num pôster abre os detalhes (sinopse, duração, gêneros, elenco, trailer, selo da Netflix)
- Fecha com clique fora, X, Esc ou o botão "voltar" do celular, sem mexer na rolagem

## Como testar
- Na prévia do Vercel, pelo celular: role bastante, abra um filme e use o "voltar" do Android
- Local: `npm run test:e2e -- modal`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e espere o "Squash and merge".

---

### Tarefa 5: Contas (modal de login, Conta, Sair, Redefinir senha)

**Branch:** `tarefa-05-contas`

**Arquivos:**
- Criar: `src/lib/supabase/env.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/proxy.ts`, `src/lib/return-path.ts`, `src/lib/auth-messages.ts`, `src/components/TextField.tsx`, `src/components/Credits.tsx`, `src/components/auth/AuthProvider.tsx`, `src/components/auth/AuthModal.tsx`, `src/components/auth/AccountView.tsx`, `src/components/auth/ResetPasswordView.tsx`, `src/app/conta/page.tsx`, `src/app/redefinir-senha/page.tsx`, `src/app/auth/confirmar/route.ts`, `supabase/templates/recovery.html`
- Testes: `tests/unit/return-path.test.ts`, `tests/unit/auth-messages.test.ts`, `tests/e2e/helpers.ts`, `tests/e2e/auth.spec.ts`
- Modificar: `src/app/layout.tsx`, `src/components/NavBar.tsx`, `supabase/config.toml`

**Interfaces:**
- Consome: `Dialog`, `useBackToClose` (via `Dialog`) e `StatusMessage`.
- Produz:
  - `supabaseUrl()`, `supabaseKey()`, `createSupabaseServerClient()` e `getSupabaseBrowserClient()`;
  - `safeReturnPath(value)`, `authErrorMessage(error, mode)` e o tipo `AppUser { id; email }`;
  - `<AuthProvider initialUser>` e `useAuth()` → `{ user: AppUser|null, openAuth(opts?: { mode?: "entrar"|"criar"|"esqueci"; onSuccess?: () => void }), signOut() }`;
  - `<TextField label ...inputProps />` e `<Credits />`;
  - helpers E2E `uniqueEmail()`, `PASSWORD`, `scrollY(page)`, `signUp(page)`, `logIn(page, email, password)` e `logOut(page)`.

- [ ] **Passo 1: Criar a branch e instalar o Supabase**

```bash
git switch main && git pull && git switch -c tarefa-05-contas
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Passo 2: Testes das funções puras (falhando)**

Criar `tests/unit/return-path.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/return-path";

describe("safeReturnPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeReturnPath("/redefinir-senha")).toBe("/redefinir-senha");
  });

  it("usa / quando não há valor", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath("")).toBe("/");
  });

  it("recusa endereços externos", () => {
    expect(safeReturnPath("https://site-externo.com")).toBe("/");
    expect(safeReturnPath("//site-externo.com")).toBe("/");
    expect(safeReturnPath("/\\site-externo.com")).toBe("/");
  });
});
```

Criar `tests/unit/auth-messages.test.ts`:

```ts
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
```

Rodar: `npm test`. Esperado: FALHA.

- [ ] **Passo 3: Implementar as funções puras**

Criar `src/lib/return-path.ts`:

```ts
/** Só permite voltar para caminhos deste site (evita redirecionar para sites externos). */
export function safeReturnPath(value: string | null | undefined): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
```

Criar `src/lib/auth-messages.ts`:

```ts
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
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 4: Clientes do Supabase e o proxy de sessão**

Criar `src/lib/supabase/env.ts`. As variáveis `NEXT_PUBLIC_*` precisam ser lidas por nome literal, porque o Next as embute no código do navegador durante o build:

```ts
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL não definida");
  return value;
}

export function supabaseKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não definida");
  return value;
}
```

Criar `src/lib/supabase/server.ts`:

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";

/** Cliente do Supabase no servidor, com a sessão de quem fez a requisição (o RLS vale para ela). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component, que não pode gravar cookies: o proxy renova a sessão.
        }
      },
    },
  });
}
```

Criar `src/lib/supabase/client.ts`:

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Cliente do Supabase no navegador; guarda a sessão em cookies que o servidor também lê. */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient(supabaseUrl(), supabaseKey());
  return client;
}
```

Criar `src/proxy.ts`. No Next 16, o antigo `middleware.ts` se chama `proxy.ts`. Se o build reclamar do nome, confira a documentação da versão instalada:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Renova a sessão do Supabase a cada navegação, antes das páginas lerem o usuário. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // pula arquivos estáticos e as rotas públicas do TMDB, que não usam sessão
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/catalogo|api/busca|api/generos|api/filmes|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Passo 5: Componentes de formulário e créditos**

Criar `src/components/TextField.tsx`:

```tsx
"use client";

import { useId } from "react";

type Props = { label: string } & React.InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, ...inputProps }: Props) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-neutral-300">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-red-500 focus:outline-none"
      />
    </div>
  );
}
```

Criar `src/components/Credits.tsx`:

```tsx
export function Credits() {
  return (
    <footer className="space-y-1 text-center text-xs text-neutral-500">
      <p>
        Este produto usa a API do{" "}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
          TMDB
        </a>
        , mas não é endossado nem certificado pelo TMDB.
      </p>
      <p>
        Dados de onde assistir fornecidos pela{" "}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline">
          JustWatch
        </a>
        .
      </p>
    </footer>
  );
}
```

- [ ] **Passo 6: Provider de autenticação e modal de login**

Criar `src/components/auth/AuthProvider.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthMode } from "@/lib/auth-messages";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthModal } from "./AuthModal";

export type AppUser = { id: string; email: string };
export type OpenAuthOptions = { mode?: AuthMode; onSuccess?: () => void };
export type AuthRequest = { mode: AuthMode; onSuccess?: () => void };

type AuthContextValue = {
  user: AppUser | null;
  openAuth: (options?: OpenAuthOptions) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return value;
}

export function AuthProvider({ initialUser, children }: { initialUser: AppUser | null; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [request, setRequest] = useState<AuthRequest | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const openAuth = useCallback((options: OpenAuthOptions = {}) => {
    setRequest({ mode: options.mode ?? "entrar", onSuccess: options.onSuccess });
  }, []);

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ user, openAuth, signOut }), [user, openAuth, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal request={request} onClose={() => setRequest(null)} onSignedIn={setUser} />
    </AuthContext.Provider>
  );
}
```

Criar `src/components/auth/AuthModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Credits } from "@/components/Credits";
import { Dialog } from "@/components/Dialog";
import { TextField } from "@/components/TextField";
import { authErrorMessage, type AuthMode } from "@/lib/auth-messages";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppUser, AuthRequest } from "./AuthProvider";

const TITLES: Record<AuthMode, string> = { entrar: "Entrar", criar: "Criar conta", esqueci: "Esqueci minha senha" };

type Props = { request: AuthRequest | null; onClose: () => void; onSignedIn: (user: AppUser) => void };

export function AuthModal({ request, onClose, onSignedIn }: Props) {
  return (
    <Dialog open={request !== null} onClose={onClose} labelledBy="auth-modal-title" layer="top">
      {(close) =>
        request && (
          <AuthPanel
            initialMode={request.mode}
            onDone={(user) => {
              onSignedIn(user);
              const after = request.onSuccess;
              close(); // tira o login da tela antes de concluir a ação pendente
              after?.();
            }}
          />
        )
      }
    </Dialog>
  );
}

function AuthPanel({ initialMode, onDone }: { initialMode: AuthMode; onDone: (user: AppUser) => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  function switchTo(next: AuthMode) {
    setMode(next);
    setError(null);
    setSent(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password") ?? "");
    const supabase = getSupabaseBrowserClient();
    setError(null);
    if (mode === "criar" && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setPending(true);
    try {
      if (mode === "entrar") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(authErrorMessage(error, "entrar"));
        onDone({ id: data.user.id, email: data.user.email ?? email });
      } else if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return setError(authErrorMessage(error, "criar"));
        if (!data.user || !data.session) return setError("Não foi possível criar a conta. Tente de novo.");
        onDone({ id: data.user.id, email: data.user.email ?? email });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error?.status === 429) return setError("Muitas tentativas. Aguarde um minuto e tente de novo.");
        setSent(true); // mesma resposta exista ou não a conta
      }
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  const link = "text-sm text-red-400 underline";

  return (
    <div className="space-y-4">
      <h2 id="auth-modal-title" className="pr-8 text-lg font-semibold">
        {TITLES[mode]}
      </h2>

      {mode === "esqueci" && sent ? (
        <p role="status" className="text-sm text-neutral-300">
          Se o e-mail existir, enviamos o link.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
          {mode !== "esqueci" && (
            <TextField
              label="Senha"
              name="password"
              type="password"
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              required
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60">
            {pending ? "Aguarde..." : mode === "esqueci" ? "Enviar link" : TITLES[mode]}
          </button>
        </form>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        {mode === "entrar" && (
          <>
            <button type="button" onClick={() => switchTo("criar")} className={link}>
              Criar conta
            </button>
            <button type="button" onClick={() => switchTo("esqueci")} className={link}>
              Esqueci minha senha
            </button>
          </>
        )}
        {mode !== "entrar" && (
          <button type="button" onClick={() => switchTo("entrar")} className={link}>
            {mode === "criar" ? "Já tenho conta" : "Voltar para entrar"}
          </button>
        )}
      </div>

      <Credits />
    </div>
  );
}
```

- [ ] **Passo 7: Navegação, Conta, layout**

Substituir `src/components/NavBar.tsx` por:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth/AuthProvider";

const item = "flex h-full w-full items-center justify-center text-sm font-medium";

export function NavBar() {
  const pathname = usePathname();
  const { user, openAuth } = useAuth();
  const links = user
    ? [
        { href: "/", label: "Catálogo" },
        { href: "/listas", label: "Minhas listas" },
        { href: "/conta", label: "Conta" },
      ]
    : [{ href: "/", label: "Catálogo" }];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex h-full max-w-5xl">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link href={link.href} aria-current={active ? "page" : undefined} className={`${item} ${active ? "text-white" : "text-neutral-400"}`}>
                {link.label}
              </Link>
            </li>
          );
        })}
        {!user && (
          <li className="flex-1">
            <button type="button" onClick={() => openAuth()} className={`${item} text-neutral-400`}>
              Entrar
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
```

Criar `src/components/auth/AccountView.tsx`:

```tsx
"use client";

import { Credits } from "@/components/Credits";
import { useAuth } from "./AuthProvider";

export function AccountView() {
  const { user, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="text-sm text-neutral-300">Entre para ver sua conta.</p>
        <button type="button" onClick={() => openAuth()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Conta</h1>
      <dl className="text-sm">
        <dt className="text-neutral-400">E-mail</dt>
        <dd>{user.email}</dd>
      </dl>
      <button type="button" onClick={() => void signOut()} className="w-full rounded-md border border-neutral-700 py-2 text-sm">
        Sair
      </button>
      <Credits />
    </div>
  );
}
```

Criar `src/app/conta/page.tsx`:

```tsx
import { AccountView } from "@/components/auth/AccountView";

export default function ContaPage() {
  return <AccountView />;
}
```

Substituir `src/app/layout.tsx` por:

```tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { NavBar } from "@/components/NavBar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de Filmes",
  description: "Filmes da Netflix Brasil e suas listas",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        <AuthProvider initialUser={user ? { id: user.id, email: user.email ?? "" } : null}>
          <NavBar />
          <main className="pb-16 md:pb-0">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Passo 8: Recuperação de senha (e-mail, link e tela)**

Criar `supabase/templates/recovery.html`. O link usa `token_hash`, e não o fluxo padrão com código, para funcionar mesmo se a pessoa abrir o e-mail em outro aparelho:

```html
<h2>Redefinir sua senha</h2>
<p>Recebemos um pedido para redefinir a senha da sua conta. O link vale por 1 hora:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">Criar nova senha</a>
</p>
<p>Se não foi você, ignore este e-mail. Sua senha continua a mesma.</p>
```

Em `supabase/config.toml`, acrescentar (o arquivo gerado tem exemplos comentados de templates; adicione esta seção):

```toml
[auth.email.template.recovery]
subject = "Redefinir sua senha"
content_path = "./supabase/templates/recovery.html"
```

```bash
npx supabase stop && npx supabase start
```

Criar `src/app/auth/confirmar/route.ts`:

```ts
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Destino do link do e-mail: valida o token, cria a sessão e segue para a próxima tela. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeReturnPath(params.get("next"));

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }
  redirect("/redefinir-senha?erro=link");
}
```

Criar `src/components/auth/ResetPasswordView.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export function ResetPasswordView({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const { user, openAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== String(form.get("confirm"))) return setError("As senhas não são iguais.");
    setPending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.code === "same_password" ? "A nova senha precisa ser diferente da atual." : "Não foi possível salvar. Peça um novo link.");
        return;
      }
      await supabase.auth.signOut({ scope: "others" }); // os outros aparelhos caem em até 1 hora
      router.replace("/");
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  if (linkError || !user) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p role="alert" className="text-sm text-red-400">
          Link inválido ou expirado.
        </p>
        <button type="button" onClick={() => openAuth({ mode: "esqueci" })} className="text-sm text-red-400 underline">
          Pedir um novo link
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Criar nova senha</h1>
      <TextField label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <TextField label="Confirmar nova senha" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
```

Criar `src/app/redefinir-senha/page.tsx`:

```tsx
import { ResetPasswordView } from "@/components/auth/ResetPasswordView";

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <ResetPasswordView linkError={erro === "link"} />;
}
```

- [ ] **Passo 9: Helpers e testes E2E de contas**

Antes, confira a caixa de e-mails local: abra http://localhost:54324. A interface deve ser a do **Mailpit**, que tem a API `/api/v1/messages`. Se for o antigo **Inbucket**, ajuste `resetLinkFor` para a API dele (`/api/v1/mailbox/<nome>`).

Criar `tests/e2e/helpers.ts`:

```ts
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
```

Criar `tests/e2e/auth.spec.ts`:

```ts
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
```

- [ ] **Passo 10: Rodar todos os testes**

```bash
npx supabase status   # o Supabase local precisa estar rodando
npm test
npm run lint
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 11: Supabase na nuvem e variáveis no Vercel (ação manual do usuário)**

Peça ao usuário, explicando cada passo:
1. Entrar em https://supabase.com com a conta do GitHub e criar um projeto **claude-nextjs** na região **South America (São Paulo)**. Gerar uma senha forte para o banco e guardá-la num gerenciador de senhas.
2. Em *Project Settings → API Keys*, copiar a **Project URL** e a **Publishable key**.
3. No Vercel, em *Settings → Environment Variables*, cadastrar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, marcando **Production** e **Preview**.
4. No Supabase, em *Authentication → Sign In / Providers → Email*: desligar **Confirm email** e colocar a senha mínima em **8**.
5. Em *Authentication → URL Configuration*: **Site URL** = o endereço de produção do Vercel (ex.: `https://claude-nextjs.vercel.app`). Em **Redirect URLs**, acrescentar `http://localhost:3000/**`.
6. Em *Authentication → Email Templates → Reset Password*: assunto "Redefinir sua senha", e colar no corpo o conteúdo de `supabase/templates/recovery.html`.

- [ ] **Passo 12: Commit, push e PR**

```bash
git add -A
git commit -m "feat: contas com Supabase Auth, modal de login e recuperação de senha"
git push -u origin tarefa-05-contas
gh pr create --base main --head tarefa-05-contas --title "Contas com Supabase Auth" --body "$(cat <<'EOF'
## O que muda
- Modal de login com três modos: Entrar, Criar conta e Esqueci minha senha (sem sair da tela)
- Conta só com e-mail e senha, sem confirmação de e-mail
- Tela Conta (e-mail, Sair, créditos) e tela de nova senha pelo link do e-mail
- "Voltar" fecha só o modal do topo

## Como testar
- Na prévia: criar conta, recarregar (continua logado), sair, entrar de novo
- Esqueci minha senha: o e-mail chega pelo Supabase (limite de poucos envios por hora no plano gratuito)
- Local: `npm run test:e2e -- auth`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e espere o "Squash and merge".

---

### Tarefa 6: Listas: banco, regras de acesso e API

**Branch:** `tarefa-06-listas-api`

**Arquivos:**
- Criar: `supabase/migrations/<timestamp>_list_items.sql`, `src/lib/supabase/database.types.ts` (gerado), `src/lib/lists/types.ts`, `src/lib/lists/service.ts`, `src/lib/lists/validation.ts`, `src/app/api/listas/route.ts`, `src/app/api/listas/[movieId]/route.ts`, `vitest.integration.config.ts`, `tests/integration/setup-env.ts`, `tests/integration/helpers.ts`
- Testes: `tests/integration/lists.test.ts`, `tests/unit/lists.test.ts`
- Modificar: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/api/http.ts`

**Interfaces:**
- Consome: `createSupabaseServerClient()`, `getMovieService().getNetflixAvailability`, `jsonError` e `parseMovieId`.
- Produz:
  - o tipo `Database` (gerado);
  - `LIST_TYPES`, `ListType`, `MovieSnapshot { tmdbMovieId; title; posterPath }`, `StoredListItem` e `ListItemDto` (= snapshot + `listType` + `createdAt: string` + `onNetflix: boolean|null`);
  - `getListItems(supabase)`, `addToList(supabase, movie, listType)`, `removeFromList(supabase, tmdbMovieId, listType)` e `withAvailability(items, availability)`;
  - `addListItemSchema`, `parseListType(value)` e `withSupabaseUser(handler)`;
  - rotas `GET /api/listas` → `{ items: ListItemDto[] }`, `POST /api/listas` (corpo = snapshot + `listType`) → 204, e `DELETE /api/listas/{movieId}?lista=want|favorite` → 204, todas com 401 sem sessão.

- [ ] **Passo 1: Criar a branch**

```bash
git switch main && git pull && git switch -c tarefa-06-listas-api
```

- [ ] **Passo 2: Migração da tabela, RLS e gatilho**

```bash
npx supabase migration new list_items
```

Colocar no arquivo criado (`supabase/migrations/<timestamp>_list_items.sql`):

```sql
-- Listas pessoais: "Quero assistir" e "Favoritos"
create type public.list_type as enum ('want', 'favorite');

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_movie_id integer not null check (tmdb_movie_id > 0),
  list_type public.list_type not null,
  title text not null check (char_length(title) between 1 and 300),
  poster_path text check (poster_path is null or poster_path like '/%'),
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_movie_id, list_type)
);

create index list_items_user_created_idx on public.list_items (user_id, created_at desc);

-- RLS: cada pessoa só enxerga, cria e apaga as próprias linhas (não há update)
alter table public.list_items enable row level security;

create policy "cada um lê os próprios itens" on public.list_items
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "cada um cria os próprios itens" on public.list_items
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "cada um apaga os próprios itens" on public.list_items
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.list_items to authenticated;

-- Regra de negócio no próprio banco: marcar como favorito tira de "quero assistir"
create function public.remove_want_when_favorite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.list_type = 'favorite' then
    delete from public.list_items
    where user_id = new.user_id
      and tmdb_movie_id = new.tmdb_movie_id
      and list_type = 'want';
  end if;
  return new;
end;
$$;

create trigger list_items_favorite_removes_want
  after insert on public.list_items
  for each row execute function public.remove_want_when_favorite();
```

```bash
npx supabase db reset   # recria o banco local aplicando as migrações
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
npm pkg set scripts.db:types="supabase gen types typescript --local > src/lib/supabase/database.types.ts"
```

Esperado: `db reset` termina sem erro, e `database.types.ts` contém `list_items` e o enum `list_type`.

- [ ] **Passo 3: Tipar os clientes do Supabase**

Em `src/lib/supabase/server.ts`:
- adicionar o import `import type { Database } from "./database.types";`;
- trocar `createServerClient(` por `createServerClient<Database>(`.

Em `src/lib/supabase/client.ts`:
- adicionar o import `import type { Database } from "./database.types";`;
- trocar a declaração de `client` e a criação por:

```ts
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  client ??= createBrowserClient<Database>(supabaseUrl(), supabaseKey());
  return client;
}
```

- [ ] **Passo 4: Tipos e testes de integração (falhando)**

Criar `src/lib/lists/types.ts`:

```ts
export const LIST_TYPES = ["want", "favorite"] as const;
export type ListType = (typeof LIST_TYPES)[number];

export type MovieSnapshot = { tmdbMovieId: number; title: string; posterPath: string | null };

export type StoredListItem = MovieSnapshot & { listType: ListType; createdAt: Date };

export type ListItemDto = MovieSnapshot & { listType: ListType; createdAt: string; onNetflix: boolean | null };
```

```bash
npm pkg set scripts.test:integration="vitest run --config vitest.integration.config.ts"
```

Criar `vitest.integration.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
```

Criar `tests/integration/setup-env.ts`:

```ts
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
```

Criar `tests/integration/helpers.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type TestClient = SupabaseClient<Database>;

function newClient(): TestClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Variáveis do Supabase local ausentes no .env (rode `npx supabase status`)");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cria uma conta nova no Supabase local e devolve um cliente logado com ela. */
export async function newUser(): Promise<{ client: TestClient; userId: string }> {
  const client = newClient();
  const email = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.com`;
  const { data, error } = await client.auth.signUp({ email, password: "senha-segura-123" });
  if (error || !data.user || !data.session) throw error ?? new Error("cadastro sem sessão (confirmação de e-mail ligada?)");
  return { client, userId: data.user.id };
}

export function anonymousClient(): TestClient {
  return newClient();
}
```

Criar `tests/integration/lists.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addToList, getListItems, removeFromList } from "@/lib/lists/service";
import { anonymousClient, newUser } from "./helpers";

const filme = (id: number) => ({ tmdbMovieId: id, title: `Filme ${id}`, posterPath: `/p${id}.jpg` });

describe("listas no Supabase", () => {
  it("salva em Quero assistir guardando título e pôster", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    const items = await getListItems(client);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ tmdbMovieId: 1, title: "Filme 1", posterPath: "/p1.jpg", listType: "want" });
  });

  it("toque duplo (duas inserções ao mesmo tempo) não duplica", async () => {
    const { client } = await newUser();
    await Promise.all([addToList(client, filme(1), "want"), addToList(client, filme(1), "want")]);
    expect(await getListItems(client)).toHaveLength(1);
  });

  it("marcar Favorito tira de Quero assistir (gatilho no banco)", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    await addToList(client, filme(1), "favorite");
    expect((await getListItems(client)).map((i) => i.listType)).toEqual(["favorite"]);
  });

  it("remove da lista", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    await removeFromList(client, 1, "want");
    expect(await getListItems(client)).toHaveLength(0);
  });

  it("devolve os mais recentes primeiro", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    await addToList(client, filme(2), "want");
    expect((await getListItems(client)).map((i) => i.tmdbMovieId)).toEqual([2, 1]);
  });

  it("RLS: cada pessoa só vê e apaga a própria lista", async () => {
    const ana = await newUser();
    const bia = await newUser();
    await addToList(ana.client, filme(1), "want");

    expect(await getListItems(bia.client)).toHaveLength(0);
    await removeFromList(bia.client, 1, "want");
    expect(await getListItems(ana.client)).toHaveLength(1);
  });

  it("RLS: ninguém consegue gravar na lista de outra pessoa", async () => {
    const ana = await newUser();
    const bia = await newUser();
    const { error } = await bia.client
      .from("list_items")
      .insert({ user_id: ana.userId, tmdb_movie_id: 5, list_type: "want", title: "Invasão" });
    expect(error?.code).toBe("42501");
    expect(await getListItems(ana.client)).toHaveLength(0);
  });

  it("RLS: visitante sem login não lê nada", async () => {
    const ana = await newUser();
    await addToList(ana.client, filme(1), "want");
    const { data } = await anonymousClient().from("list_items").select("*");
    expect(data ?? []).toHaveLength(0);
  });
});
```

Rodar: `npm run test:integration`. Esperado: FALHA (`@/lib/lists/service` inexistente).

- [ ] **Passo 5: Implementar o serviço**

Criar `src/lib/lists/service.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ListItemDto, ListType, MovieSnapshot, StoredListItem } from "./types";

type Client = SupabaseClient<Database>;

const UNIQUE_VIOLATION = "23505";

export async function getListItems(supabase: Client): Promise<StoredListItem[]> {
  const { data, error } = await supabase
    .from("list_items")
    .select("tmdb_movie_id, title, poster_path, list_type, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    tmdbMovieId: row.tmdb_movie_id,
    title: row.title,
    posterPath: row.poster_path,
    listType: row.list_type,
    createdAt: new Date(row.created_at),
  }));
}

/** Salva na lista. Repetir não duplica; o gatilho do banco tira de "want" ao favoritar. */
export async function addToList(supabase: Client, movie: MovieSnapshot, listType: ListType): Promise<void> {
  const { error } = await supabase
    .from("list_items")
    .insert({ tmdb_movie_id: movie.tmdbMovieId, title: movie.title, poster_path: movie.posterPath, list_type: listType });
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
}

export async function removeFromList(supabase: Client, tmdbMovieId: number, listType: ListType): Promise<void> {
  const { error } = await supabase.from("list_items").delete().eq("tmdb_movie_id", tmdbMovieId).eq("list_type", listType);
  if (error) throw new Error(error.message);
}

/** Acrescenta a disponibilidade na Netflix. Se o TMDB falhar, o item segue com onNetflix = null. */
export async function withAvailability(
  items: StoredListItem[],
  availability: (tmdbMovieId: number) => Promise<boolean>,
): Promise<ListItemDto[]> {
  const byMovie = new Map<number, Promise<boolean | null>>();
  for (const item of items) {
    if (!byMovie.has(item.tmdbMovieId)) {
      byMovie.set(item.tmdbMovieId, availability(item.tmdbMovieId).catch(() => null));
    }
  }
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      onNetflix: await byMovie.get(item.tmdbMovieId)!,
    })),
  );
}
```

Rodar: `npm run test:integration`. Esperado: PASSA (8 testes).

- [ ] **Passo 6: Testes unitários de validação e disponibilidade (falhando)**

Criar `tests/unit/lists.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { withAvailability } from "@/lib/lists/service";
import { addListItemSchema, parseListType } from "@/lib/lists/validation";

const item = (id: number, listType: "want" | "favorite" = "want") => ({
  tmdbMovieId: id,
  title: `Filme ${id}`,
  posterPath: null,
  listType,
  createdAt: new Date("2026-10-01T12:00:00Z"),
});

describe("withAvailability", () => {
  it("marca cada item e consulta cada filme uma vez só", async () => {
    const availability = vi.fn(async (id: number) => id === 1);
    const result = await withAvailability([item(1, "want"), item(1, "favorite"), item(2)], availability);
    expect(result.map((r) => r.onNetflix)).toEqual([true, true, false]);
    expect(availability).toHaveBeenCalledTimes(2);
    expect(result[0].createdAt).toBe("2026-10-01T12:00:00.000Z");
  });

  it("com o TMDB fora do ar, a lista continua funcionando", async () => {
    const result = await withAvailability([item(1)], async () => {
      throw new Error("TMDB fora");
    });
    expect(result).toEqual([expect.objectContaining({ tmdbMovieId: 1, onNetflix: null })]);
  });
});

describe("validação", () => {
  it("aceita um item válido", () => {
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: "/a.jpg", listType: "want" }).success).toBe(true);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: null, listType: "favorite" }).success).toBe(true);
  });

  it("recusa dados inválidos", () => {
    expect(addListItemSchema.safeParse({ tmdbMovieId: -1, title: "X", posterPath: null, listType: "want" }).success).toBe(false);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "", posterPath: null, listType: "want" }).success).toBe(false);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: "http://x", listType: "want" }).success).toBe(false);
    expect(addListItemSchema.safeParse({ tmdbMovieId: 5, title: "X", posterPath: null, listType: "outra" }).success).toBe(false);
  });

  it("parseListType", () => {
    expect(parseListType("want")).toBe("want");
    expect(parseListType("favorite")).toBe("favorite");
    expect(parseListType("x")).toBeNull();
    expect(parseListType(null)).toBeNull();
  });
});
```

Rodar: `npm test`. Esperado: FALHA (`validation` inexistente).

- [ ] **Passo 7: Validação e rotas**

Criar `src/lib/lists/validation.ts`:

```ts
import { z } from "zod";
import { LIST_TYPES, type ListType } from "./types";

export const addListItemSchema = z.object({
  tmdbMovieId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().startsWith("/").max(200).nullable(),
  listType: z.enum(LIST_TYPES),
});

export function parseListType(value: string | null): ListType | null {
  return (LIST_TYPES as readonly string[]).includes(value ?? "") ? (value as ListType) : null;
}
```

Rodar: `npm test`. Esperado: PASSA.

Em `src/lib/api/http.ts`, acrescentar no fim:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UserContext = { supabase: SupabaseClient<Database>; userId: string };

/** Exige sessão do Supabase; as consultas usam o cliente da própria pessoa (o RLS se aplica). */
export async function withSupabaseUser(handler: (ctx: UserContext) => Promise<Response>): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "unauthorized");
  try {
    return await handler({ supabase, userId: user.id });
  } catch (error) {
    console.error(error);
    return jsonError(500, "internal_error");
  }
}
```

(Mova os novos `import` para o topo do arquivo, junto com o existente.)

Criar `src/app/api/listas/route.ts`:

```ts
import { jsonError, withSupabaseUser } from "@/lib/api/http";
import { addToList, getListItems, withAvailability } from "@/lib/lists/service";
import { addListItemSchema } from "@/lib/lists/validation";
import { getMovieService } from "@/lib/tmdb";

export async function GET() {
  return withSupabaseUser(async ({ supabase }) => {
    const movies = getMovieService();
    const items = await withAvailability(await getListItems(supabase), (id) => movies.getNetflixAvailability(id));
    return Response.json({ items });
  });
}

export async function POST(req: Request) {
  return withSupabaseUser(async ({ supabase }) => {
    const parsed = addListItemSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError(400, "invalid_body");
    const { listType, ...movie } = parsed.data;
    await addToList(supabase, movie, listType);
    return new Response(null, { status: 204 });
  });
}
```

Criar `src/app/api/listas/[movieId]/route.ts`:

```ts
import { jsonError, withSupabaseUser } from "@/lib/api/http";
import { parseMovieId } from "@/lib/api/params";
import { removeFromList } from "@/lib/lists/service";
import { parseListType } from "@/lib/lists/validation";

export async function DELETE(req: Request, { params }: { params: Promise<{ movieId: string }> }) {
  return withSupabaseUser(async ({ supabase }) => {
    const movieId = parseMovieId((await params).movieId);
    const listType = parseListType(new URL(req.url).searchParams.get("lista"));
    if (movieId === null || listType === null) return jsonError(400, "invalid_params");
    await removeFromList(supabase, movieId, listType);
    return new Response(null, { status: 204 });
  });
}
```

- [ ] **Passo 8: Conferir as rotas sem login (401)**

Com `npm run dev` rodando:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/listas
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/listas -H "Content-Type: application/json" -d '{}'
```

Esperado: `401` nas duas.

- [ ] **Passo 9: Rodar todos os testes**

```bash
npm test
npm run test:integration
npm run lint
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 10: Levar a tabela para o Supabase da nuvem (ação manual do usuário + comando)**

Peça ao usuário para rodar, no terminal dele (os dois comandos são interativos):

```bash
npx supabase login                      # abre o navegador para autorizar
npx supabase link --project-ref <ref>   # o <ref> está na URL do projeto no painel; pede a senha do banco
```

Depois (pode ser o agente):

```bash
npx supabase db push
```

Esperado: a migração `list_items` aplicada na nuvem. Confira no painel do Supabase, em *Table Editor*, que a tabela existe e mostra "RLS enabled".

- [ ] **Passo 11: Commit, push e PR**

```bash
git add -A
git commit -m "feat: tabela das listas com RLS, gatilho de favoritos e API"
git push -u origin tarefa-06-listas-api
gh pr create --base main --head tarefa-06-listas-api --title "Listas: banco, RLS e API" --body "$(cat <<'EOF'
## O que muda
- Tabela `list_items` no Supabase com RLS: cada pessoa só lê, cria e apaga as próprias linhas
- Gatilho no banco: favoritar tira o filme de "Quero assistir"
- Rotas `/api/listas` (listar com selo da Netflix, adicionar e remover)
- Testes de integração contra o Supabase local (inclusive tentativas de acessar a lista de outra pessoa)

## Como testar
- `npm run test:integration` (Supabase local rodando)
- Painel do Supabase: tabela `list_items` com "RLS enabled"

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e espere o "Squash and merge".

---

### Tarefa 7: Listas: telas e "salvar depois do login"

**Branch:** `tarefa-07-listas-telas`

**Arquivos:**
- Criar: `src/lib/lists/toggle.ts`, `src/components/lists/ListsProvider.tsx`, `src/components/lists/ListButtons.tsx`, `src/components/lists/ListsView.tsx`, `src/app/listas/page.tsx`
- Testes: `tests/unit/toggle.test.ts`, `tests/e2e/lists.spec.ts`
- Modificar: `src/app/layout.tsx`, `src/components/CatalogView.tsx`

**Interfaces:**
- Consome: `useAuth()`, `apiFetch`, `UnauthorizedError`, `errorMessage`, `ListItemDto`, `ListType`, `MovieSnapshot`, `MovieGrid`, `MovieModal` (prop `actions`), `ListMarks`, `StatusMessage`, e os helpers E2E.
- Produz: `applyToggle(items, movie, listType, on, now)`; `<ListsProvider>` e `useLists()` → `{ items, loaded, error, marksFor(id), isPending(id, listType), toggle(movie, listType) }`; `<ListButtons movie />`; a página `/listas`.

- [ ] **Passo 1: Criar a branch**

```bash
git switch main && git pull && git switch -c tarefa-07-listas-telas
```

- [ ] **Passo 2: Teste de `applyToggle` (falhando)**

Criar `tests/unit/toggle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyToggle } from "@/lib/lists/toggle";
import type { ListItemDto } from "@/lib/lists/types";

const now = new Date("2026-10-04T10:00:00Z");
const filme = { tmdbMovieId: 1, title: "Filme 1", posterPath: null };
const item = (id: number, listType: "want" | "favorite"): ListItemDto => ({
  tmdbMovieId: id,
  title: `Filme ${id}`,
  posterPath: null,
  listType,
  createdAt: "2026-10-01T00:00:00.000Z",
  onNetflix: true,
});

describe("applyToggle", () => {
  it("adiciona no topo da lista", () => {
    const result = applyToggle([item(2, "want")], filme, "want", true, now);
    expect(result.map((i) => i.tmdbMovieId)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({ listType: "want", createdAt: now.toISOString(), onNetflix: null });
  });

  it("favoritar tira de Quero assistir", () => {
    expect(applyToggle([item(1, "want")], filme, "favorite", true, now).map((i) => i.listType)).toEqual(["favorite"]);
  });

  it("não duplica se já estiver na lista", () => {
    expect(applyToggle([item(1, "want")], filme, "want", true, now)).toHaveLength(1);
  });

  it("remove da lista", () => {
    expect(applyToggle([item(1, "want"), item(1, "favorite")], filme, "want", false, now).map((i) => i.listType)).toEqual(["favorite"]);
  });
});
```

Rodar: `npm test`. Esperado: FALHA.

- [ ] **Passo 3: Implementar `src/lib/lists/toggle.ts`**

```ts
import type { ListItemDto, ListType, MovieSnapshot } from "./types";

/** Atualização otimista da tela; espelha as regras do banco (o gatilho de favoritos). */
export function applyToggle(items: ListItemDto[], movie: MovieSnapshot, listType: ListType, on: boolean, now: Date): ListItemDto[] {
  const same = (i: ListItemDto, type: ListType) => i.tmdbMovieId === movie.tmdbMovieId && i.listType === type;
  if (!on) return items.filter((i) => !same(i, listType));
  if (items.some((i) => same(i, listType))) return items;
  const rest = listType === "favorite" ? items.filter((i) => !same(i, "want")) : items;
  return [{ ...movie, listType, createdAt: now.toISOString(), onNetflix: null }, ...rest];
}
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 4: Teste E2E das listas (falhando)**

Criar `tests/e2e/lists.spec.ts`:

```ts
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
```

Rodar: `npm run test:e2e -- lists`. Esperado: FALHA.

- [ ] **Passo 5: Provider das listas**

Criar `src/components/lists/ListsProvider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ListMarks } from "@/components/MovieCard";
import { apiFetch, errorMessage, UnauthorizedError } from "@/lib/api-client";
import { applyToggle } from "@/lib/lists/toggle";
import type { ListItemDto, ListType, MovieSnapshot } from "@/lib/lists/types";

type ListsContextValue = {
  items: ListItemDto[];
  loaded: boolean;
  error: string | null;
  marksFor: (tmdbMovieId: number) => ListMarks;
  isPending: (tmdbMovieId: number, listType: ListType) => boolean;
  toggle: (movie: MovieSnapshot, listType: ListType) => void;
};

const ListsContext = createContext<ListsContextValue | null>(null);

export function useLists(): ListsContextValue {
  const value = useContext(ListsContext);
  if (!value) throw new Error("useLists precisa estar dentro de <ListsProvider>");
  return value;
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const { user, openAuth } = useAuth();
  const [items, setItems] = useState<ListItemDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const itemsRef = useRef(items);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: ListItemDto[] }>("/api/listas");
      setItems(data.items);
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) setItems([]);
      else setError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  // carrega ao entrar, limpa ao sair
  useEffect(() => {
    if (user) {
      void refresh();
    } else {
      setItems([]);
      setLoaded(true);
    }
  }, [user, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const setMembership = useCallback(
    async (movie: MovieSnapshot, listType: ListType, on: boolean): Promise<void> => {
      const key = `${movie.tmdbMovieId}:${listType}`;
      if (pendingRef.current.has(key)) return; // ignora o segundo toque enquanto o primeiro não termina
      pendingRef.current.add(key);
      setPending(new Set(pendingRef.current));
      setItems((prev) => applyToggle(prev, movie, listType, on, new Date()));
      try {
        if (on) await apiFetch("/api/listas", { method: "POST", body: JSON.stringify({ ...movie, listType }) });
        else await apiFetch(`/api/listas/${movie.tmdbMovieId}?lista=${listType}`, { method: "DELETE" });
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          // sessão perdida: pede login e conclui a mesma ação depois
          openAuth({ onSuccess: () => void setMembership(movie, listType, on) });
        } else {
          setToast("Não foi possível salvar. Tente de novo.");
        }
      } finally {
        pendingRef.current.delete(key);
        setPending(new Set(pendingRef.current));
        void refresh(); // a verdade vem do servidor (datas, disponibilidade e, em caso de falha, o estado anterior)
      }
    },
    [openAuth, refresh],
  );

  const toggle = useCallback(
    (movie: MovieSnapshot, listType: ListType) => {
      if (!user) {
        // sem login: abre o modal e, depois de entrar, só ADICIONA (nunca remove)
        openAuth({ onSuccess: () => void setMembership(movie, listType, true) });
        return;
      }
      const isIn = itemsRef.current.some((i) => i.tmdbMovieId === movie.tmdbMovieId && i.listType === listType);
      void setMembership(movie, listType, !isIn);
    },
    [user, openAuth, setMembership],
  );

  const marksFor = useCallback(
    (id: number): ListMarks => ({
      want: items.some((i) => i.tmdbMovieId === id && i.listType === "want"),
      favorite: items.some((i) => i.tmdbMovieId === id && i.listType === "favorite"),
    }),
    [items],
  );

  const isPending = useCallback((id: number, listType: ListType) => pending.has(`${id}:${listType}`), [pending]);

  const value = useMemo(() => ({ items, loaded, error, marksFor, isPending, toggle }), [items, loaded, error, marksFor, isPending, toggle]);

  return (
    <ListsContext.Provider value={value}>
      {children}
      {toast && (
        <div role="alert" className="fixed inset-x-4 bottom-20 z-[70] rounded-md bg-neutral-800 p-3 text-center text-sm shadow-lg md:bottom-4">
          {toast}
        </div>
      )}
    </ListsContext.Provider>
  );
}
```

- [ ] **Passo 6: Botões, tela das listas e ligações**

Criar `src/components/lists/ListButtons.tsx`:

```tsx
"use client";

import type { ListType, MovieSnapshot } from "@/lib/lists/types";
import { useLists } from "./ListsProvider";

const BUTTONS: { listType: ListType; label: string; on: string; off: string }[] = [
  { listType: "want", label: "Quero assistir", on: "✓", off: "+" },
  { listType: "favorite", label: "Favorito", on: "★", off: "☆" },
];

export function ListButtons({ movie }: { movie: MovieSnapshot }) {
  const { marksFor, isPending, toggle } = useLists();
  const marks = marksFor(movie.tmdbMovieId);

  return (
    <div className="mt-4 flex gap-2">
      {BUTTONS.map((b) => {
        const active = marks[b.listType];
        return (
          <button
            key={b.listType}
            type="button"
            aria-pressed={active}
            disabled={isPending(movie.tmdbMovieId, b.listType)}
            onClick={() => toggle(movie, b.listType)}
            className={`flex-1 rounded-md border py-2 text-sm font-medium disabled:opacity-60 ${
              active ? "border-red-600 bg-red-600 text-white" : "border-neutral-700 text-neutral-200"
            }`}
          >
            <span aria-hidden>{active ? b.on : b.off}</span> {b.label}
          </button>
        );
      })}
    </div>
  );
}
```

Criar `src/components/lists/ListsView.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieModal } from "@/components/MovieModal";
import { StatusMessage } from "@/components/StatusMessage";
import type { ListType } from "@/lib/lists/types";
import type { MovieSummary } from "@/lib/tmdb/types";
import { ListButtons } from "./ListButtons";
import { useLists } from "./ListsProvider";

const TABS: { listType: ListType; label: string }[] = [
  { listType: "want", label: "Quero assistir" },
  { listType: "favorite", label: "Favoritos" },
];

export function ListsView() {
  const { user, openAuth } = useAuth();
  const { items, loaded, error, marksFor } = useLists();
  const [tab, setTab] = useState<ListType>("want");
  const [selected, setSelected] = useState<MovieSummary | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="text-sm text-neutral-300">Entre para ver suas listas.</p>
        <button type="button" onClick={() => openAuth()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
          Entrar
        </button>
      </div>
    );
  }

  const movies: MovieSummary[] = items
    .filter((i) => i.listType === tab)
    .map((i) => ({ id: i.tmdbMovieId, title: i.title, posterPath: i.posterPath, year: null, onNetflix: i.onNetflix }));

  return (
    <>
      <div role="tablist" aria-label="Minhas listas" className="sticky top-0 z-30 flex border-b border-neutral-800 bg-neutral-950/95 backdrop-blur md:top-14">
        {TABS.map((t) => (
          <button
            key={t.listType}
            type="button"
            role="tab"
            aria-selected={tab === t.listType}
            onClick={() => setTab(t.listType)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t.listType ? "border-b-2 border-red-600 text-white" : "text-neutral-400"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <StatusMessage>{error}</StatusMessage>}
      {!error && !loaded && <StatusMessage>Carregando...</StatusMessage>}
      {!error && loaded && movies.length === 0 && <StatusMessage>Nenhum filme aqui ainda.</StatusMessage>}
      <MovieGrid movies={movies} showBadges getMarks={marksFor} onSelect={setSelected} />
      <MovieModal movie={selected} onClose={() => setSelected(null)} actions={(movie) => <ListButtons movie={movie} />} />
    </>
  );
}
```

Criar `src/app/listas/page.tsx`:

```tsx
import { ListsView } from "@/components/lists/ListsView";

export default function ListasPage() {
  return <ListsView />;
}
```

Em `src/app/layout.tsx`:
- adicionar o import `import { ListsProvider } from "@/components/lists/ListsProvider";`;
- envolver `<NavBar />` e `<main>` com `<ListsProvider>`, por dentro do `<AuthProvider>`:

```tsx
        <AuthProvider initialUser={user ? { id: user.id, email: user.email ?? "" } : null}>
          <ListsProvider>
            <NavBar />
            <main className="pb-16 md:pb-0">{children}</main>
          </ListsProvider>
        </AuthProvider>
```

Em `src/components/CatalogView.tsx`:
- adicionar os imports `import { ListButtons } from "./lists/ListButtons";` e `import { useLists } from "./lists/ListsProvider";`;
- dentro do componente, adicionar `const { marksFor } = useLists();`;
- trocar `<MovieGrid movies={items} showBadges={searching} onSelect={setSelected} />` por `<MovieGrid movies={items} showBadges={searching} getMarks={marksFor} onSelect={setSelected} />`;
- trocar `<MovieModal movie={selected} onClose={() => setSelected(null)} />` por `<MovieModal movie={selected} onClose={() => setSelected(null)} actions={(movie) => <ListButtons movie={movie} />} />`.

- [ ] **Passo 7: Rodar todos os testes**

```bash
npm test
npm run test:integration
npm run lint
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 8: Commit, push e PR**

```bash
git add -A
git commit -m "feat: telas das listas e salvar filme depois do login"
git push -u origin tarefa-07-listas-telas
gh pr create --base main --head tarefa-07-listas-telas --title "Listas: telas e salvar depois do login" --body "$(cat <<'EOF'
## O que muda
- Botões "Quero assistir" e "Favorito" no modal de detalhes
- Sem login: o modal de login abre por cima, e depois de entrar o filme é salvo (a rolagem não sai do lugar)
- Tela "Minhas listas" com abas, selo da Netflix e o mesmo modal do catálogo
- Ícone nos pôsteres dos filmes que já estão nas listas

## Como testar
- Na prévia pelo celular: sem login, role, abra um filme, toque em "Quero assistir", crie a conta e veja o filme salvo
- Local: `npm run test:e2e -- lists`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui** e espere o "Squash and merge".

---

### Tarefa 8: Produção e acabamento

**Branch:** `tarefa-08-producao`

**Arquivos:**
- Criar: `README.md`
- Modificar: `.env.example` (comentários finais, se necessário)

**Interfaces:**
- Consome: tudo das tarefas anteriores.
- Produz: o README e a verificação final em produção.

- [ ] **Passo 1: Criar a branch**

```bash
git switch main && git pull && git switch -c tarefa-08-producao
```

- [ ] **Passo 2: README**

Criar `README.md`:

````markdown
# claude-nextjs

Catálogo dos filmes da Netflix Brasil, aberto a todos, com listas pessoais ("Quero assistir" e "Favoritos")
para quem cria conta. Projeto de estudo de **Claude Code** com **Next.js**, **Supabase** e **Vercel**.

## Stack

Next.js 16 (React 19, TypeScript) · Tailwind CSS 4 · Supabase (Auth + Postgres com RLS) · Vercel ·
Vitest + Playwright · dados do TMDB.

## Como rodar

Pré-requisitos: Docker e Node 22.

```bash
npm install
npx supabase start            # Supabase local em Docker
cp .env.example .env          # cole a chave do `npx supabase status` e o token do TMDB
npm run dev                   # http://localhost:3000
```

- Painel do Supabase local: http://localhost:54323
- E-mails de teste: http://localhost:54324

## Testes

```bash
npm test                  # unitários
npm run test:integration  # contra o Supabase local (inclui RLS)
npm run test:e2e          # navegador, TMDB simulado
```

## Banco

A estrutura fica em `supabase/migrations/`. Depois de criar uma migração:

```bash
npx supabase db reset     # aplica no banco local
npm run db:types          # atualiza os tipos TypeScript
npx supabase db push      # aplica no Supabase da nuvem
```

## Deploy

O Vercel publica cada merge na `main` e gera uma prévia para cada PR. As variáveis
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `TMDB_API_TOKEN` e `NETFLIX_PROVIDER_IDS`
ficam em *Settings → Environment Variables*.

Plano gratuito: o Supabase pausa o projeto após cerca de 7 dias sem uso (reativação no painel) e o e-mail
embutido envia poucas mensagens por hora.

## Créditos

Este produto usa a API do [TMDB](https://www.themoviedb.org), mas não é endossado nem certificado
pelo TMDB. Dados de onde assistir fornecidos pela [JustWatch](https://www.justwatch.com).
````

- [ ] **Passo 3: Bateria completa**

```bash
npm test
npm run test:integration
npm run lint
npm run build
npm run test:e2e
```

Esperado: tudo PASSA.

- [ ] **Passo 4: Commit, push e PR**

```bash
git add -A
git commit -m "docs: README com como rodar, testar e publicar"
git push -u origin tarefa-08-producao
gh pr create --base main --head tarefa-08-producao --title "README e verificação final" --body "$(cat <<'EOF'
## O que muda
- README: como rodar, testar, mexer no banco e publicar

## Checklist de produção (fazer na URL de produção depois do merge)
- [ ] Catálogo abre sem login no celular
- [ ] Criar conta, salvar um filme, ver em "Minhas listas"
- [ ] Entrar no notebook com a mesma conta e ver a mesma lista
- [ ] "Esqueci minha senha" chega por e-mail e o link abre a tela de nova senha
- [ ] Rodapé de créditos visível em Conta e no modal de login

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pare aqui.** Depois do merge, percorra com o usuário o checklist do PR na URL de produção. Se algo falhar em produção mas passar localmente, a causa mais provável é configuração: as variáveis do Vercel ou a *URL Configuration* e os *Email Templates* do Supabase (Tarefa 5, Passo 11).
