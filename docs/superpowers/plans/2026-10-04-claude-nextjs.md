# claude-nextjs — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** catálogo dos filmes da Netflix Brasil com contas individuais e listas "Quero assistir" e "Favoritos", rodando em Docker.

**Arquitetura:** um app Next.js (App Router) faz as telas (React + Tailwind) e o servidor (rotas `/api/*` em TypeScript). O servidor guarda o token do TMDB, faz a autenticação com Better Auth e mantém um cache em memória das respostas do TMDB. O PostgreSQL guarda contas e listas, acessado via Drizzle. Em desenvolvimento, o Mailpit captura os e-mails.

**Stack (versões verificadas em 2026-10-04):** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Better Auth 1.7 · Drizzle ORM 0.45 / drizzle-kit 0.31 · PostgreSQL 17 · Zod 4 · Nodemailer 10 · Vitest 5 · Playwright 1.63 · Node 22 · Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-03-claude-nextjs-design.md`. Leia junto com este plano.

## Restrições globais

- **Node desta máquina:** o atalho `~/.local/bin/node` entra em loop e trava. **Todo terminal usado neste plano começa com** `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"`.
- **Portas (a 5432 já está ocupada por outro projeto):** banco de desenvolvimento em `127.0.0.1:5442`, banco de testes em `127.0.0.1:5443`, Mailpit em `1025` (SMTP) e `8025` (web), app em `3000`, app dos testes E2E em `3100`, TMDB simulado em `4010`.
- **Catálogo:** região `BR`, só filmes, Netflix com monetização `flatrate`. Os IDs de provedor vêm de `NETFLIX_PROVIDER_IDS`.
- **Textos exatos da interface (pt-BR):**
  - `E-mail ou senha incorretos.`
  - `Sem conexão. Verifique sua internet.`
  - `O serviço de filmes está indisponível no momento. Suas listas continuam funcionando normalmente.`
  - `Nenhum filme encontrado.`
  - `Se o e-mail existir, enviamos o link.`
  - `Não foi possível salvar. Tente de novo.`
- **Token do TMDB só no servidor:** `src/lib/tmdb/index.ts` e `src/lib/auth.ts` começam com `import "server-only";`. Arquivos `"use client"` só fazem `import type` de `src/lib/tmdb/types`.
- **Sessão:** `expiresIn = 604800` (7 dias) e `updateAge = 86400`, ou seja, renovada a cada uso, no máximo uma vez por dia.
- **Login obrigatório:** vale para todas as páginas do app e todas as rotas `/api/*`, exceto `/api/auth/*`.
- **A nota nunca aparece na tela.** Serve só para ordenar.
- **O modal nunca altera a posição de rolagem** da tela de baixo.
- **A navegação fica sempre visível:** barra inferior fixa no celular e barra superior fixa (`h-14`) no notebook.
- **Busca:** com texto na busca, os seletores de gênero e de ordenação ficam desativados, porque a busca do TMDB não aceita esses filtros.
- **Segredos:** ficam só em `.env`, que está fora do git. O `.env.example` traz só nomes e valores de exemplo.
- **O TMDB é sempre simulado nos testes.** Nenhum teste chama a API real.
- **Ao fim de cada tarefa:** commit e `git push`. A mensagem de commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Foco de revisão

1. **Botão "voltar" do celular com o modal aberto:** fecha o modal e mantém a posição, sem sair do catálogo. Teste na Tarefa 6.
2. **Toque duplo rápido em "Quero assistir" / "Favorito":** nunca duplica nem deixa um estado inconsistente. Testes nas Tarefas 7 (inserção concorrente) e 8 (bloqueio enquanto a ação está pendente).
3. **Filmes repetidos entre páginas da rolagem infinita** (o TMDB reordena por popularidade entre uma página e outra): sem duplicatas na grade. Teste na Tarefa 5 (`mergeUnique`).
4. **Filme sem pôster, sinopse, duração ou trailer:** o card mostra o título no lugar do pôster e o modal não exibe campos vazios. Testes nas Tarefas 4 (conversão) e 6 (E2E).
5. **Parâmetro `volta` malicioso** (`//site-externo.com`) no login: redireciona só para caminhos internos. Teste na Tarefa 3 (`safeReturnPath`).

## Desvio consciente da spec

**Créditos TMDB/JustWatch:** com rolagem infinita, um rodapé no fim do catálogo nunca é alcançado. Por isso os créditos ficam no rodapé das telas de login/cadastro e na tela **Conta** (Tarefa 10).

## Mapa de arquivos

```
docker-compose.yml            # db (+ app na Tarefa 10)
docker-compose.override.yml   # só desenvolvimento: mailpit, db-test
Dockerfile, .dockerignore     # Tarefa 10
.env.example
drizzle.config.ts
drizzle/                      # migrações geradas
vitest.config.ts              # testes unitários
vitest.integration.config.ts  # testes com Postgres real
playwright.config.ts          # E2E
src/
  instrumentation.ts          # roda migrações ao subir o servidor
  lib/
    env.ts                    # validação do .env (lazy)
    return-path.ts            # safeReturnPath
    images.ts                 # URLs de pôster
    format.ts                 # formatRuntime
    infinite.ts               # nextPage, mergeUnique, withPageParam
    api-client.ts             # fetch do navegador + mensagens de erro
    mailer.ts                 # SMTP
    auth.ts                   # Better Auth (servidor)
    auth-client.ts            # Better Auth (navegador)
    session.ts                # sessão em páginas e rotas
    api/params.ts             # leitura de query params (pura)
    api/http.ts               # withUser, jsonError
    db/schema.ts, db/index.ts, db/migrate.ts
    netflix.ts                # isOnNetflix
    tmdb/types.ts, tmdb/client.ts, tmdb/cache.ts, tmdb/movies.ts, tmdb/index.ts
    lists/types.ts, lists/service.ts, lists/validation.ts, lists/toggle.ts
  hooks/useDebouncedValue.ts, hooks/useInfiniteMovies.ts
  components/
    TextField.tsx, NavBar.tsx, Credits.tsx, StatusMessage.tsx
    NetflixBadge.tsx, MovieCard.tsx, MovieGrid.tsx, InfiniteSentinel.tsx
    CatalogToolbar.tsx, CatalogView.tsx, MovieModal.tsx
    lists/ListsProvider.tsx, lists/ListButtons.tsx, lists/ListsView.tsx
  app/
    layout.tsx, globals.css
    (auth)/layout.tsx
    (auth)/entrar/page.tsx + LoginForm.tsx
    (auth)/criar-conta/page.tsx + SignUpForm.tsx
    (auth)/esqueci-senha/page.tsx + ForgotPasswordForm.tsx
    (auth)/redefinir-senha/page.tsx + ResetPasswordForm.tsx
    (app)/layout.tsx, (app)/page.tsx, (app)/listas/page.tsx
    (app)/conta/page.tsx + SignOutButton.tsx
    api/auth/[...all]/route.ts
    api/catalogo/route.ts, api/busca/route.ts, api/generos/route.ts
    api/filmes/[id]/route.ts
    api/listas/route.ts, api/listas/[movieId]/route.ts
tests/
  stubs/empty.ts
  unit/*.test.ts
  integration/global-setup.ts, setup-env.ts, helpers.ts, *.test.ts
  mocks/tmdb-server.ts
  e2e/helpers.ts, *.spec.ts
```

---

### Tarefa 1: Base do projeto (Next.js, Vitest, Docker, `.env`)

**Arquivos:**
- Criar (via create-next-app): `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*`, `public/`, `eslint.config.mjs`, `postcss.config.mjs`
- Criar: `docker-compose.yml`, `docker-compose.override.yml`, `.env.example`, `.env` (local, fora do git), `vitest.config.ts`, `tests/stubs/empty.ts`, `src/lib/env.ts`, `tests/unit/env.test.ts`
- Modificar: `.gitignore`

**Interfaces:**
- Produz: `parseEnv(source): Env`, `getEnv(): Env` e o tipo `Env` com os campos `DATABASE_URL`, `TMDB_API_TOKEN`, `TMDB_BASE_URL`, `NETFLIX_PROVIDER_IDS: number[]`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_RATE_LIMIT_ENABLED: boolean`, `SMTP_HOST`, `SMTP_PORT: number`, `SMTP_USER?`, `SMTP_PASS?`, `SMTP_FROM`.

- [ ] **Passo 1: Gerar o projeto Next.js numa pasta temporária e trazê-lo para o repositório**

A pasta do repositório não está vazia (`docs/`, `arquivos/`), e o create-next-app recusa pastas com arquivos. Por isso o projeto é gerado ao lado e copiado para cá.

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"
cd /home/jota/Desktop/dev
npx create-next-app@16 claude-nextjs-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd /home/jota/Desktop/dev/claude_renatoAsse
rsync -a --exclude .git --exclude .gitignore --exclude node_modules ../claude-nextjs-scaffold/ ./
cat ../claude-nextjs-scaffold/.gitignore >> .gitignore
rm -rf ../claude-nextjs-scaffold
npm install
npm pkg set name=claude-nextjs
```

Resultado esperado: `package.json` com `next` 16.x, `src/app/page.tsx` e `src/app/layout.tsx` existindo, e `.gitignore` contendo as linhas originais (`arquivos/`, `.env`...) seguidas das do Next (`node_modules`, `.next`...).

Depois, confira se o `.gitignore` do Next tem uma linha `.env*`. Ela ignoraria o `.env.example`. Se existir, remova essa linha, porque as nossas regras `.env`, `.env.*` e `!.env.example` já cobrem o caso.

- [ ] **Passo 2: Instalar as dependências de teste e validação**

```bash
npm install zod server-only
npm install -D vitest
```

- [ ] **Passo 3: Configurar o Vitest e os scripts**

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

```bash
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
```

- [ ] **Passo 4: Escrever o teste da validação do `.env` (falhando)**

Criar `tests/unit/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const base = {
  DATABASE_URL: "postgres://app:senha@localhost:5442/claude_nextjs",
  TMDB_API_TOKEN: "token",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_FROM: "claude-nextjs <nao-responda@localhost>",
};

describe("parseEnv", () => {
  it("aplica os valores padrão", () => {
    const env = parseEnv(base);
    expect(env.TMDB_BASE_URL).toBe("https://api.themoviedb.org/3");
    expect(env.NETFLIX_PROVIDER_IDS).toEqual([8]);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.AUTH_RATE_LIMIT_ENABLED).toBe(true);
  });

  it("lê vários IDs de provedor da Netflix", () => {
    expect(parseEnv({ ...base, NETFLIX_PROVIDER_IDS: "8, 1796" }).NETFLIX_PROVIDER_IDS).toEqual([8, 1796]);
  });

  it("desliga o limite de tentativas quando pedido", () => {
    expect(parseEnv({ ...base, AUTH_RATE_LIMIT_ENABLED: "false" }).AUTH_RATE_LIMIT_ENABLED).toBe(false);
  });

  it("recusa configuração sem token do TMDB", () => {
    expect(() => parseEnv({ ...base, TMDB_API_TOKEN: "" })).toThrow();
  });

  it("recusa segredo de autenticação curto", () => {
    expect(() => parseEnv({ ...base, BETTER_AUTH_SECRET: "curto" })).toThrow();
  });
});
```

- [ ] **Passo 5: Rodar o teste e ver que falha**

Rodar: `npm test`
Esperado: FALHA com erro de importação de `@/lib/env`.

- [ ] **Passo 6: Implementar `src/lib/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
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
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  AUTH_RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().min(1),
});

export type Env = z.output<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

let cached: Env | undefined;

/** Lê o .env só quando alguém precisa (assim o `next build` não exige segredos). */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
```

- [ ] **Passo 7: Rodar os testes e ver que passam**

Rodar: `npm test`
Esperado: PASSA (5 testes).

- [ ] **Passo 8: Docker Compose do banco, do banco de testes e do Mailpit**

Criar `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: claude_nextjs
    ports:
      - "127.0.0.1:5442:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d claude_nextjs"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

volumes:
  db-data:
```

Criar `docker-compose.override.yml`. Ele é carregado automaticamente pelo `docker compose up` e só existe em desenvolvimento:

```yaml
services:
  db-test:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: claude_nextjs_test
    ports:
      - "127.0.0.1:5443:5432"
    tmpfs:
      - /var/lib/postgresql/data

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "127.0.0.1:1025:1025"
      - "127.0.0.1:8025:8025"
```

- [ ] **Passo 9: `.env.example` e `.env` local**

Criar `.env.example`:

```bash
# Banco (docker-compose.yml usa POSTGRES_PASSWORD)
POSTGRES_PASSWORD=troque-esta-senha
DATABASE_URL=postgres://app:troque-esta-senha@localhost:5442/claude_nextjs
DATABASE_URL_TEST=postgres://app:app@localhost:5443/claude_nextjs_test

# TMDB: Token de Leitura da API (themoviedb.org > Configurações > API)
TMDB_API_TOKEN=
TMDB_BASE_URL=https://api.themoviedb.org/3
NETFLIX_PROVIDER_IDS=8

# Autenticação: gere com `openssl rand -base64 32`
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
AUTH_RATE_LIMIT_ENABLED=true

# E-mail (Mailpit em desenvolvimento)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM="claude-nextjs <nao-responda@localhost>"
```

**Ação manual do usuário:** criar uma conta em https://www.themoviedb.org, ir em *Configurações → API*, solicitar uma chave de desenvolvedor (uso pessoal) e copiar o **Token de Leitura da API** (o token longo, não a "API Key" curta).

```bash
cp .env.example .env
SENHA_DB=$(openssl rand -hex 16)
sed -i "s/troque-esta-senha/$SENHA_DB/g" .env
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" .env
# Cole o token do TMDB na linha TMDB_API_TOKEN= do .env
```

- [ ] **Passo 10: Subir os containers e conferir**

```bash
docker compose up -d
docker compose ps
```

Esperado: `db`, `db-test` e `mailpit` com status `running` (o `db` como `healthy`), e http://localhost:8025 abrindo a interface do Mailpit.

- [ ] **Passo 11: Conferir que o app sobe**

Rodar: `npm run dev`, abrir http://localhost:3000 (a página inicial padrão do Next deve aparecer) e encerrar com Ctrl+C.

- [ ] **Passo 12: Commit e push**

```bash
git add -A
git status --short   # conferir: .env NÃO pode aparecer
git commit -m "chore: base do projeto com Next.js, Vitest, Docker e validação do .env

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 2: Banco de dados (schema, migrações, migração automática)

**Arquivos:**
- Criar: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/db/migrate.ts`, `src/instrumentation.ts`, `drizzle.config.ts`, `vitest.integration.config.ts`, `tests/integration/global-setup.ts`, `tests/integration/setup-env.ts`, `tests/integration/helpers.ts`, `tests/integration/schema.test.ts`
- Gerar: `drizzle/` (migrações)

**Interfaces:**
- Consome: `getEnv()` (Tarefa 1).
- Produz: as tabelas Drizzle `user`, `session`, `account`, `verification`, `listItems` e o enum `listTypeEnum`; `createDb(connectionString): Db`; `getDb(): Db`; o tipo `Db`; `runMigrations(): Promise<void>`. Helpers de teste: `testDb()`, `resetDb(db)` e `createUser(db, id)`.

- [ ] **Passo 1: Instalar o Drizzle e o driver do Postgres**

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
npm pkg set scripts.test:integration="vitest run --config vitest.integration.config.ts"
npm pkg set scripts.db:generate="drizzle-kit generate"
```

- [ ] **Passo 2: Configurar o Vitest de integração**

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
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup-env.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
```

Criar `tests/integration/setup-env.ts`:

```ts
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
```

Criar `tests/integration/global-setup.ts`:

```ts
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export default async function setup() {
  loadEnvConfig(process.cwd());
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST não definida no .env");
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
}
```

Criar `tests/integration/helpers.ts`:

```ts
import { sql } from "drizzle-orm";
import { createDb, type Db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export function testDb(): Db {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST não definida no .env");
  return createDb(url);
}

export async function resetDb(db: Db): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE "user" CASCADE`);
}

export async function createUser(db: Db, id: string): Promise<string> {
  await db.insert(user).values({ id, name: id, email: `${id}@teste.com` });
  return id;
}
```

- [ ] **Passo 3: Escrever o teste do schema (falhando)**

Criar `tests/integration/schema.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { listItems, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createUser, resetDb, testDb } from "./helpers";

const db = testDb();

beforeEach(() => resetDb(db));
afterAll(() => db.$client.end());

describe("schema do banco", () => {
  it("grava um item de lista ligado a um usuário", async () => {
    await createUser(db, "ana");
    await db.insert(listItems).values({ userId: "ana", tmdbMovieId: 10, listType: "want", title: "Filme" });
    const rows = await db.select().from(listItems);
    expect(rows).toHaveLength(1);
    expect(rows[0].posterPath).toBeNull();
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it("recusa o mesmo filme duas vezes na mesma lista", async () => {
    await createUser(db, "ana");
    const item = { userId: "ana", tmdbMovieId: 10, listType: "want" as const, title: "Filme" };
    await db.insert(listItems).values(item);
    await expect(db.insert(listItems).values(item)).rejects.toThrow();
  });

  it("apagar o usuário apaga os itens dele", async () => {
    await createUser(db, "ana");
    await db.insert(listItems).values({ userId: "ana", tmdbMovieId: 10, listType: "favorite", title: "Filme" });
    await db.delete(user).where(eq(user.id, "ana"));
    expect(await db.select().from(listItems)).toHaveLength(0);
  });
});
```

- [ ] **Passo 4: Rodar e ver que falha**

Rodar: `npm run test:integration`
Esperado: FALHA (`@/lib/db` e `@/lib/db/schema` não existem).

- [ ] **Passo 5: Escrever o schema**

As quatro primeiras tabelas são as do Better Auth 1.x. As chaves em camelCase precisam ter exatamente esses nomes, porque o adaptador do Better Auth as procura pelo nome. Se a documentação da versão instalada (https://www.better-auth.com/docs/concepts/database) listar campos diferentes, siga a documentação.

Criar `src/lib/db/schema.ts`:

```ts
import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// ── Tabelas do Better Auth ─────────────────────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Listas ─────────────────────────────────────────────────────────
export const listTypeEnum = pgEnum("list_type", ["want", "favorite"]);

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tmdbMovieId: integer("tmdb_movie_id").notNull(),
    listType: listTypeEnum("list_type").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("list_items_user_movie_list_uq").on(t.userId, t.tmdbMovieId, t.listType),
    index("list_items_user_created_idx").on(t.userId, t.createdAt),
  ],
);
```

- [ ] **Passo 6: Conexão com o banco e migrador**

Criar `src/lib/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  return drizzle(new Pool({ connectionString }), { schema });
}

export type Db = ReturnType<typeof createDb>;

// Em desenvolvimento o Next recarrega módulos; guardar no globalThis evita abrir várias conexões.
const globalForDb = globalThis as unknown as { __db?: Db };

export function getDb(): Db {
  globalForDb.__db ??= createDb(getEnv().DATABASE_URL);
  return globalForDb.__db;
}
```

Criar `src/lib/db/migrate.ts`:

```ts
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "./index";

export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
```

Criar `src/instrumentation.ts` (o Next executa `register()` uma vez quando o servidor sobe):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("@/lib/db/migrate");
  await runMigrations();
}
```

Criar `drizzle.config.ts`:

```ts
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Passo 7: Gerar a migração**

Rodar: `npm run db:generate`
Esperado: uma pasta `drizzle/` com `0000_*.sql` criando `user`, `session`, `account`, `verification`, o enum `list_type` e `list_items`.

- [ ] **Passo 8: Rodar os testes de integração e ver que passam**

Rodar: `npm run test:integration`
Esperado: PASSA (3 testes).

- [ ] **Passo 9: Conferir a migração automática no banco de desenvolvimento**

```bash
npm run dev   # aguarde "Ready", depois Ctrl+C
docker compose exec db psql -U app -d claude_nextjs -c '\dt'
```

Esperado: as tabelas `user`, `session`, `account`, `verification`, `list_items` e `__drizzle_migrations` (esta última fica no schema `drizzle`; use `\dt drizzle.*` para vê-la).

- [ ] **Passo 10: Commit e push**

```bash
git add -A
git commit -m "feat: schema do banco com Drizzle e migração automática ao subir

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 3: Contas (cadastro, login, sair, proteção de páginas)

**Arquivos:**
- Criar: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/lib/return-path.ts`, `src/app/api/auth/[...all]/route.ts`, `src/components/TextField.tsx`, `src/components/NavBar.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/entrar/LoginForm.tsx`, `src/app/(auth)/criar-conta/page.tsx`, `src/app/(auth)/criar-conta/SignUpForm.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/conta/page.tsx`, `src/app/(app)/conta/SignOutButton.tsx`, `playwright.config.ts`, `tests/unit/return-path.test.ts`, `tests/e2e/helpers.ts`, `tests/e2e/auth.spec.ts`
- Modificar: `src/app/layout.tsx`, `src/app/globals.css`
- Apagar: `src/app/page.tsx`

**Interfaces:**
- Consome: `getEnv()`, `getDb()`, `Db`, `Env` e as tabelas de auth.
- Produz: `getAuth()`, `createAuth(db, env)`, `SESSION_EXPIRES_IN`, `SESSION_UPDATE_AGE`, `authClient`, `getSession()`, `requirePageSession(path): Promise<Session>`, `getApiUserId(req): Promise<string | null>`, `safeReturnPath(value): string` e `<TextField label ...inputProps />`. Helpers E2E: `uniqueEmail()`, `PASSWORD`, `signUp(page, opts?)`, `logIn(page, email, password)`, `logOut(page)`.

- [ ] **Passo 1: Instalar o Better Auth e o Playwright**

```bash
npm install better-auth
npm install -D @playwright/test
npx playwright install chromium
npm pkg set scripts.test:e2e="playwright test"
```

- [ ] **Passo 2: Teste do `safeReturnPath` (falhando)**

Criar `tests/unit/return-path.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/return-path";

describe("safeReturnPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeReturnPath("/conta")).toBe("/conta");
    expect(safeReturnPath("/listas?aba=favoritos")).toBe("/listas?aba=favoritos");
  });

  it("usa / quando não há valor", () => {
    expect(safeReturnPath(undefined)).toBe("/");
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath("")).toBe("/");
  });

  it("recusa endereços externos", () => {
    expect(safeReturnPath("https://site-externo.com")).toBe("/");
    expect(safeReturnPath("//site-externo.com")).toBe("/");
    expect(safeReturnPath("/\\site-externo.com")).toBe("/");
  });

  it("ignora listas de valores", () => {
    expect(safeReturnPath(["/conta", "/x"])).toBe("/");
  });
});
```

Rodar: `npm test`. Esperado: FALHA (módulo inexistente).

- [ ] **Passo 3: Implementar `src/lib/return-path.ts`**

```ts
/** Só permite voltar para caminhos deste site (evita redirecionar para sites externos). */
export function safeReturnPath(value: string | string[] | null | undefined): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 4: Configurar o Better Auth no servidor**

Criar `src/lib/auth.ts`:

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb, type Db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";
import { getEnv, type Env } from "@/lib/env";

export const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 dias
export const SESSION_UPDATE_AGE = 60 * 60 * 24; // renova no máximo 1x por dia de uso

export function createAuth(db: Db, env: Env) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
    },
    rateLimit: {
      enabled: env.AUTH_RATE_LIMIT_ENABLED,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __auth?: Auth };

export function getAuth(): Auth {
  globalForAuth.__auth ??= createAuth(getDb(), getEnv());
  return globalForAuth.__auth;
}
```

Criar `src/app/api/auth/[...all]/route.ts`:

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return toNextJsHandler(getAuth()).GET(req);
}

export async function POST(req: Request) {
  return toNextJsHandler(getAuth()).POST(req);
}
```

Criar `src/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

Criar `src/lib/session.ts`:

```ts
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

/** Em páginas: sem sessão, manda para o login lembrando de onde veio. */
export async function requirePageSession(path: string) {
  const session = await getSession();
  if (!session) redirect(`/entrar?volta=${encodeURIComponent(path)}`);
  return session;
}

/** Em rotas /api: devolve o id do usuário ou null. */
export async function getApiUserId(req: Request): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  return session?.user.id ?? null;
}
```

- [ ] **Passo 5: Layout raiz e componentes base**

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

Apagar `src/app/page.tsx` (a rota `/` passa a ser `src/app/(app)/page.tsx`):

```bash
rm src/app/page.tsx
```

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
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-red-500 focus:outline-none"
      />
    </div>
  );
}
```

Criar `src/components/NavBar.tsx`. A Tarefa 8 adiciona "Minhas listas":

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Catálogo" },
  { href: "/conta", label: "Conta" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex h-full max-w-5xl">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full items-center justify-center text-sm font-medium ${active ? "text-white" : "text-neutral-400"}`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Passo 6: Telas de login e cadastro**

Criar `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900/60 p-6">{children}</div>
    </div>
  );
}
```

Criar `src/app/(auth)/entrar/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ volta?: string }> }) {
  const { volta } = await searchParams;
  const returnTo = safeReturnPath(volta);
  if (await getSession()) redirect(returnTo);
  return <LoginForm returnTo={returnTo} />;
}
```

Criar `src/app/(auth)/entrar/LoginForm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.email({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error) {
        if (!error.status) setError("Sem conexão. Verifique sua internet.");
        else if (error.status === 429) setError("Muitas tentativas. Aguarde um minuto e tente de novo.");
        else setError("E-mail ou senha incorretos.");
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
      <TextField label="Senha" name="password" type="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-center text-sm text-neutral-400">
        Não tem conta?{" "}
        <Link href="/criar-conta" className="text-red-400 underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
```

Criar `src/app/(auth)/criar-conta/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignUpForm } from "./SignUpForm";

export default async function CriarContaPage() {
  if (await getSession()) redirect("/");
  return <SignUpForm />;
}
```

Criar `src/app/(auth)/criar-conta/SignUpForm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        password,
      });
      if (error) {
        const code = error.code ?? "";
        if (!error.status) setError("Sem conexão. Verifique sua internet.");
        else if (error.status === 422 || /EXIST/i.test(code)) setError("Este e-mail já tem conta. Entre ou use outro e-mail.");
        else if (/PASSWORD/i.test(code)) setError("A senha precisa ter pelo menos 8 caracteres.");
        else if (error.status === 429) setError("Muitas tentativas. Aguarde um minuto e tente de novo.");
        else setError("Não foi possível criar a conta. Tente de novo.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      <TextField label="Nome" name="name" autoComplete="name" required />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
      <TextField label="Senha" name="password" type="password" autoComplete="new-password" minLength={8} required />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar conta"}
      </button>
      <p className="text-center text-sm text-neutral-400">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-red-400 underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Passo 7: Área logada (layout, catálogo provisório e Conta)**

Criar `src/app/(app)/layout.tsx`:

```tsx
import { NavBar } from "@/components/NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="pb-16 md:pb-0">{children}</main>
    </div>
  );
}
```

Criar `src/app/(app)/page.tsx` (provisório; a Tarefa 5 substitui):

```tsx
import { requirePageSession } from "@/lib/session";

export default async function CatalogoPage() {
  await requirePageSession("/");
  return <h1 className="p-6 text-2xl font-semibold">Catálogo</h1>;
}
```

Criar `src/app/(app)/conta/page.tsx`:

```tsx
import { requirePageSession } from "@/lib/session";
import { SignOutButton } from "./SignOutButton";

export default async function ContaPage() {
  const session = await requirePageSession("/conta");
  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Conta</h1>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-neutral-400">Nome</dt>
          <dd>{session.user.name}</dd>
        </div>
        <div>
          <dt className="text-neutral-400">E-mail</dt>
          <dd>{session.user.email}</dd>
        </div>
      </dl>
      <SignOutButton />
    </div>
  );
}
```

Criar `src/app/(app)/conta/SignOutButton.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="w-full rounded-md border border-neutral-700 py-2 text-sm disabled:opacity-60"
    >
      Sair
    </button>
  );
}
```

- [ ] **Passo 8: Configurar o Playwright**

Criar `playwright.config.ts`:

```ts
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const PORT = 3100;

const appEnv = {
  DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
  TMDB_API_TOKEN: "test-token",
  TMDB_BASE_URL: "http://localhost:4010/3",
  NETFLIX_PROVIDER_IDS: "8",
  BETTER_AUTH_SECRET: "segredo-de-teste-e2e-com-mais-de-32-caracteres",
  BETTER_AUTH_URL: `http://localhost:${PORT}`,
  AUTH_RATE_LIMIT_ENABLED: "false",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_FROM: "claude-nextjs <nao-responda@localhost>",
};

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
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/entrar`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: appEnv,
    },
  ],
});
```

Observação: com o limite de tentativas desligado, os testes podem fazer vários logins seguidos. O limite em si é conferido manualmente no Passo 12.

- [ ] **Passo 9: Helpers E2E e testes de contas (falhando)**

Criar `tests/e2e/helpers.ts`:

```ts
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "senha-segura-123";

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.com`;
}

export async function signUp(page: Page, opts: { name?: string; email?: string; password?: string } = {}) {
  const account = { name: opts.name ?? "Pessoa Teste", email: opts.email ?? uniqueEmail(), password: opts.password ?? PASSWORD };
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(account.name);
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL("/");
  return account;
}

export async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function logOut(page: Page) {
  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar/);
}
```

Criar `tests/e2e/auth.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { logIn, logOut, PASSWORD, signUp } from "./helpers";

test("página protegida leva ao login e volta para ela depois de entrar", async ({ page }) => {
  const account = await signUp(page);
  await logOut(page);

  await page.goto("/conta");
  await expect(page).toHaveURL("/entrar?volta=%2Fconta");

  await logIn(page, account.email, account.password);
  await expect(page).toHaveURL("/conta");
  await expect(page.getByText(account.email)).toBeVisible();
});

test("senha errada e e-mail inexistente mostram a mesma mensagem", async ({ page }) => {
  const account = await signUp(page);
  await logOut(page);

  await logIn(page, account.email, "senha-errada-999");
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");

  await logIn(page, "ninguem@teste.com", PASSWORD);
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
});

test("cadastro com e-mail já usado avisa", async ({ page }) => {
  const account = await signUp(page);
  await logOut(page);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill("Outra Pessoa");
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert")).toHaveText("Este e-mail já tem conta. Entre ou use outro e-mail.");
});

test("a sessão vale por 7 dias", async ({ page, context }) => {
  await signUp(page);
  const cookie = (await context.cookies()).find((c) => c.name.includes("session_token"));
  expect(cookie).toBeDefined();
  const daysLeft = (cookie!.expires * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
  expect(daysLeft).toBeGreaterThan(6.9);
  expect(daysLeft).toBeLessThan(7.1);
});

test("sair encerra a sessão", async ({ page }) => {
  await signUp(page);
  await logOut(page);
  await page.goto("/");
  await expect(page).toHaveURL("/entrar?volta=%2F");
});
```

Rodar: `npm run test:e2e`. Se este passo for feito antes dos Passos 4 a 7, o esperado é FALHA. Se a implementação já existe, prossiga para o Passo 10.

- [ ] **Passo 10: Rodar todos os testes**

```bash
docker compose up -d
npm test
npm run test:e2e
```

Esperado: os testes unitários PASSAM e os 5 testes E2E PASSAM. Pare o `npm run dev` antes do E2E, porque os dois usam a pasta `.next`.

- [ ] **Passo 11: Conferir no navegador**

Rodar `npm run dev`, abrir http://localhost:3000. Deve redirecionar para `/entrar`. Crie uma conta, veja o "Catálogo" provisório e a tela Conta, e clique em Sair.

- [ ] **Passo 12: Conferir o limite de tentativas (manual)**

Com `npm run dev` rodando:

```bash
for i in 1 2 3 4 5 6 7; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/sign-in/email \
    -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -H "X-Forwarded-For: 203.0.113.9" \
    -d '{"email":"ninguem@teste.com","password":"errada123"}'
done
```

Esperado: as primeiras respostas são `401` e, a partir da 6ª, `429`.

- [ ] **Passo 13: Commit e push**

```bash
git add -A
git commit -m "feat: contas com cadastro, login, sessão semanal e páginas protegidas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 4: Camada do TMDB (cliente, cache, Netflix, filmes)

**Arquivos:**
- Criar: `src/lib/tmdb/types.ts`, `src/lib/tmdb/client.ts`, `src/lib/tmdb/cache.ts`, `src/lib/netflix.ts`, `src/lib/tmdb/movies.ts`, `src/lib/tmdb/index.ts`, `src/lib/images.ts`
- Testes: `tests/unit/tmdb-client.test.ts`, `tests/unit/cache.test.ts`, `tests/unit/netflix.test.ts`, `tests/unit/movies.test.ts`, `tests/unit/images.test.ts`
- Modificar: `.env`, `.env.example` (IDs da Netflix)

**Interfaces:**
- Consome: `getEnv()`.
- Produz:
  - tipos `MovieSummary { id; title; posterPath: string|null; year: number|null; onNetflix: boolean|null }`, `MovieDetails` (= `MovieSummary` + `overview: string|null`, `runtimeMinutes: number|null`, `genres: string[]`, `cast: string[]`, `trailerUrl: string|null`, `backdropPath: string|null`), `Page<T> { items; page; totalPages }`, `Genre { id; name }` e `CatalogSort = "popular" | "top_rated"`;
  - `TmdbUnavailableError`, `TmdbNotFoundError`, `createTmdbFetch(opts): TmdbFetch`, `TtlCache`, `TTL`, `isOnNetflix(providers, netflixIds, region?)`;
  - `createMovieService(deps): MovieService`, com `discoverNetflix({page, genreId?, sort})`, `searchMovies(query, page)`, `getMovieDetails(id)`, `getGenres()` e `getNetflixAvailability(id)`;
  - `getMovieService()` e `posterUrl(path, size)`.

- [ ] **Passo 1: Confirmar os IDs da Netflix no Brasil**

```bash
source <(grep TMDB_API_TOKEN .env)
curl -s -H "Authorization: Bearer $TMDB_API_TOKEN" \
  "https://api.themoviedb.org/3/watch/providers/movie?watch_region=BR&language=pt-BR" \
  | python3 -c "import json,sys; [print(p['provider_id'], p['provider_name']) for p in json.load(sys.stdin)['results'] if 'netflix' in p['provider_name'].lower()]"
```

Esperado: uma ou mais linhas, por exemplo `8 Netflix` (e talvez `1796 Netflix Standard with Ads`). Coloque **todos** os IDs em `NETFLIX_PROVIDER_IDS` no `.env` e no `.env.example`, separados por vírgula (ex.: `NETFLIX_PROVIDER_IDS=8,1796`).

- [ ] **Passo 2: Tipos**

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

- [ ] **Passo 3: Testes do cliente HTTP, do cache, da Netflix e das imagens (falhando)**

Criar `tests/unit/tmdb-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createTmdbFetch, TmdbNotFoundError, TmdbUnavailableError } from "@/lib/tmdb/client";

function okResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createTmdbFetch", () => {
  it("envia o token e codifica parâmetros com acento e símbolos", async () => {
    const fetchImpl = vi.fn(async () => okResponse({ ok: true }));
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl });
    await tmdb("/search/movie", { query: "Ação & Aventura", page: 2, ignorado: undefined });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe("Ação & Aventura");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.has("ignorado")).toBe(false);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });

  it("falha de rede vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => { throw new TypeError("fetch failed"); } });
    await expect(tmdb("/x")).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("timeout vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => { throw new DOMException("timeout", "TimeoutError"); } });
    await expect(tmdb("/x")).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("erro 5xx vira TmdbUnavailableError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => okResponse({}, 503) });
    await expect(tmdb("/x")).rejects.toBeInstanceOf(TmdbUnavailableError);
  });

  it("404 vira TmdbNotFoundError", async () => {
    const tmdb = createTmdbFetch({ baseUrl: "https://api.exemplo/3", token: "abc", fetchImpl: async () => okResponse({}, 404) });
    await expect(tmdb("/movie/1")).rejects.toBeInstanceOf(TmdbNotFoundError);
  });
});
```

Criar `tests/unit/cache.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/tmdb/cache";

describe("TtlCache", () => {
  it("reaproveita o valor dentro da validade", async () => {
    const cache = new TtlCache(10, () => 1000);
    const load = vi.fn(async () => "valor");
    await cache.getOrSet("k", 500, load);
    expect(await cache.getOrSet("k", 500, load)).toBe("valor");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("busca de novo depois que vence", async () => {
    let now = 1000;
    const cache = new TtlCache(10, () => now);
    const load = vi.fn(async () => now);
    await cache.getOrSet("k", 500, load);
    now = 1600;
    expect(await cache.getOrSet("k", 500, load)).toBe(1600);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("não guarda erros", async () => {
    const cache = new TtlCache(10, () => 1000);
    await expect(cache.getOrSet("k", 500, async () => { throw new Error("falhou"); })).rejects.toThrow("falhou");
    expect(await cache.getOrSet("k", 500, async () => "ok")).toBe("ok");
  });

  it("descarta o mais antigo ao passar do limite", async () => {
    const cache = new TtlCache(2, () => 1000);
    await cache.getOrSet("a", 500, async () => 1);
    await cache.getOrSet("b", 500, async () => 2);
    await cache.getOrSet("c", 500, async () => 3);
    const load = vi.fn(async () => 10);
    expect(await cache.getOrSet("a", 500, load)).toBe(10);
    expect(load).toHaveBeenCalledTimes(1);
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

- [ ] **Passo 4: Implementar o cliente, o cache, a Netflix e as imagens**

Criar `src/lib/tmdb/client.ts`:

```ts
export class TmdbUnavailableError extends Error {}
export class TmdbNotFoundError extends Error {}

export type TmdbParams = Record<string, string | number | undefined>;
export type TmdbFetch = (path: string, params?: TmdbParams) => Promise<unknown>;

export function createTmdbFetch(opts: {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): TmdbFetch {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, "");

  return async (path, params = {}) => {
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }

    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${opts.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
        cache: "no-store",
      });
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

Criar `src/lib/tmdb/cache.ts`:

```ts
const HOUR = 60 * 60 * 1000;

export const TTL = {
  catalog: 6 * HOUR,
  search: 6 * HOUR,
  details: 24 * HOUR,
  providers: 24 * HOUR,
  genres: 7 * 24 * HOUR,
};

/** Cache em memória com validade. Erros nunca são guardados. */
export class TtlCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(
    private maxEntries = 5000,
    private now: () => number = Date.now,
  ) {}

  async getOrSet<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value as T;

    const value = await load();
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    return value;
  }
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

Rodar: `npm test`. Esperado: PASSAM os testes de cliente, cache, Netflix e imagens.

- [ ] **Passo 5: Testes do serviço de filmes (falhando)**

Criar `tests/unit/movies.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TtlCache } from "@/lib/tmdb/cache";
import { TmdbUnavailableError, type TmdbFetch } from "@/lib/tmdb/client";
import { createMovieService, MAX_PAGES, MIN_VOTES_TOP_RATED, pickTrailerUrl } from "@/lib/tmdb/movies";

function fakeTmdb(routes: Record<string, unknown>) {
  const calls: { path: string; params: Record<string, unknown> }[] = [];
  const fn: TmdbFetch = async (path, params = {}) => {
    calls.push({ path, params });
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
  return { svc: createMovieService({ tmdb: tmdb.fn, cache: new TtlCache(), netflixIds: [8, 1796] }), calls: tmdb.calls };
}

describe("discoverNetflix", () => {
  it("filtra por Netflix no Brasil, só assinatura, em português", async () => {
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

  it("usa o cache para a mesma página", async () => {
    const { svc, calls } = service({ "/discover/movie": { page: 1, total_pages: 1, results: [] } });
    await svc.discoverNetflix({ page: 1, sort: "popular" });
    await svc.discoverNetflix({ page: 1, sort: "popular" });
    expect(calls).toHaveLength(1);
  });
});

describe("searchMovies", () => {
  it("marca cada resultado como na Netflix, fora dela ou desconhecido", async () => {
    const { svc } = service({
      "/search/movie": { page: 1, total_pages: 1, results: [movie(1), movie(2), movie(3)] },
      "/movie/1/watch/providers": onNetflix,
      "/movie/2/watch/providers": offNetflix,
      "/movie/3/watch/providers": new TmdbUnavailableError("fora"),
    });
    const page = await svc.searchMovies("filme", 1);
    expect(page.items.map((m) => m.onNetflix)).toEqual([true, false, null]);
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

- [ ] **Passo 6: Implementar o serviço de filmes**

Criar `src/lib/tmdb/movies.ts`:

```ts
import { isOnNetflix } from "@/lib/netflix";
import { TTL, type TtlCache } from "./cache";
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

export function createMovieService({ tmdb, cache, netflixIds }: { tmdb: TmdbFetch; cache: TtlCache; netflixIds: number[] }) {
  async function getNetflixAvailability(movieId: number): Promise<boolean> {
    const providers = await cache.getOrSet(
      `providers:${movieId}`,
      TTL.providers,
      () => tmdb(`/movie/${movieId}/watch/providers`) as Promise<TmdbProviders>,
    );
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
      const data = await cache.getOrSet(
        `discover:${sort}:${genreId ?? "all"}:${page}`,
        TTL.catalog,
        () =>
          tmdb("/discover/movie", {
            language: LANGUAGE,
            watch_region: REGION,
            with_watch_providers: netflixIds.join("|"),
            with_watch_monetization_types: "flatrate",
            sort_by: sort === "top_rated" ? "vote_average.desc" : "popularity.desc",
            "vote_count.gte": sort === "top_rated" ? MIN_VOTES_TOP_RATED : undefined,
            with_genres: genreId,
            include_adult: "false",
            page,
          }) as Promise<TmdbPaged<TmdbMovieResult>>,
      );
      return {
        items: data.results.map((m) => toSummary(m, true)),
        page: data.page,
        totalPages: Math.min(data.total_pages, MAX_PAGES),
      };
    },

    async searchMovies(query: string, page: number): Promise<Page<MovieSummary>> {
      const data = await cache.getOrSet(
        `search:${query.toLowerCase()}:${page}`,
        TTL.search,
        () => tmdb("/search/movie", { query, language: LANGUAGE, include_adult: "false", page }) as Promise<TmdbPaged<TmdbMovieResult>>,
      );
      const items = await Promise.all(data.results.map(async (m) => toSummary(m, await availabilityOrNull(m.id))));
      return { items, page: data.page, totalPages: Math.min(data.total_pages, MAX_PAGES) };
    },

    async getMovieDetails(movieId: number): Promise<MovieDetails> {
      const d = await cache.getOrSet(
        `details:${movieId}`,
        TTL.details,
        () =>
          tmdb(`/movie/${movieId}`, {
            language: LANGUAGE,
            append_to_response: "credits,videos,watch/providers",
            include_video_language: "pt,en",
          }) as Promise<TmdbDetails>,
      );
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
      const data = await cache.getOrSet(
        "genres",
        TTL.genres,
        () => tmdb("/genre/movie/list", { language: LANGUAGE }) as Promise<{ genres: Genre[] }>,
      );
      return [...data.genres].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  };
}
```

Criar `src/lib/tmdb/index.ts`:

```ts
import "server-only";
import { getEnv } from "@/lib/env";
import { TtlCache } from "./cache";
import { createTmdbFetch } from "./client";
import { createMovieService, type MovieService } from "./movies";

const globalForTmdb = globalThis as unknown as { __movieService?: MovieService };

export function getMovieService(): MovieService {
  if (!globalForTmdb.__movieService) {
    const env = getEnv();
    globalForTmdb.__movieService = createMovieService({
      tmdb: createTmdbFetch({ baseUrl: env.TMDB_BASE_URL, token: env.TMDB_API_TOKEN }),
      cache: new TtlCache(),
      netflixIds: env.NETFLIX_PROVIDER_IDS,
    });
  }
  return globalForTmdb.__movieService;
}
```

- [ ] **Passo 7: Rodar os testes e ver que passam**

Rodar: `npm test`
Esperado: PASSA, com todos os testes unitários verdes.

- [ ] **Passo 8: Commit e push**

```bash
git add -A
git commit -m "feat: camada do TMDB com cache, disponibilidade na Netflix e conversão de dados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 5: Catálogo (API, tela, rolagem infinita, busca)

**Arquivos:**
- Criar: `src/lib/api/params.ts`, `src/lib/api/http.ts`, `src/app/api/catalogo/route.ts`, `src/app/api/busca/route.ts`, `src/app/api/generos/route.ts`, `src/lib/api-client.ts`, `src/lib/infinite.ts`, `src/hooks/useDebouncedValue.ts`, `src/hooks/useInfiniteMovies.ts`, `src/components/StatusMessage.tsx`, `src/components/NetflixBadge.tsx`, `src/components/MovieCard.tsx`, `src/components/MovieGrid.tsx`, `src/components/InfiniteSentinel.tsx`, `src/components/CatalogToolbar.tsx`, `src/components/CatalogView.tsx`, `tests/mocks/tmdb-server.ts`
- Testes: `tests/unit/params.test.ts`, `tests/unit/infinite.test.ts`, `tests/e2e/catalog.spec.ts`
- Modificar: `src/app/(app)/page.tsx`, `playwright.config.ts`

**Interfaces:**
- Consome: `getMovieService()`, `getApiUserId(req)`, `TmdbUnavailableError`, `TmdbNotFoundError`, `posterUrl`, `MovieSummary`, `Page`, `Genre` e `CatalogSort`.
- Produz:
  - funções puras `parsePage`, `parseGenreId`, `parseSort`, `parseMovieId`, `parseQuery`; `jsonError(status, code)`; `withUser(req, handler)`;
  - `apiFetch<T>(url, init?)`, `NetworkError`, `ServiceUnavailableError`, `ApiError`, `errorMessage(e)`;
  - `nextPage`, `mergeUnique`, `withPageParam`; `useInfiniteMovies(url)`; `useDebouncedValue(value, ms)`;
  - componentes `<MovieGrid movies showBadges getMarks? onSelect />`, `<NetflixBadge onNetflix />`, `<StatusMessage>` e `<CatalogView />`;
  - rotas `GET /api/catalogo?pagina&genero&ordem`, `GET /api/busca?q&pagina` e `GET /api/generos`, todas devolvendo 401 sem sessão e 503 com `{error:"tmdb_unavailable"}`.

- [ ] **Passo 1: Testes das funções puras (falhando)**

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

- [ ] **Passo 2: Implementar as funções puras**

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

- [ ] **Passo 3: Rotas da API**

Criar `src/lib/api/http.ts`:

```ts
import "server-only";
import { getApiUserId } from "@/lib/session";
import { TmdbNotFoundError, TmdbUnavailableError } from "@/lib/tmdb/client";

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Exige sessão e traduz erros conhecidos em respostas HTTP. */
export async function withUser(req: Request, handler: (userId: string) => Promise<Response>): Promise<Response> {
  const userId = await getApiUserId(req);
  if (!userId) return jsonError(401, "unauthorized");
  try {
    return await handler(userId);
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
import { parseGenreId, parsePage, parseSort } from "@/lib/api/params";
import { withUser } from "@/lib/api/http";
import { getMovieService } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withUser(req, async () => {
    const params = new URL(req.url).searchParams;
    const page = await getMovieService().discoverNetflix({
      page: parsePage(params.get("pagina")),
      genreId: parseGenreId(params.get("genero")),
      sort: parseSort(params.get("ordem")),
    });
    return Response.json(page);
  });
}
```

Criar `src/app/api/busca/route.ts`:

```ts
import { parsePage, parseQuery } from "@/lib/api/params";
import { withUser } from "@/lib/api/http";
import { getMovieService } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withUser(req, async () => {
    const params = new URL(req.url).searchParams;
    const query = parseQuery(params.get("q"));
    if (!query) return Response.json({ items: [], page: 1, totalPages: 1 });
    return Response.json(await getMovieService().searchMovies(query, parsePage(params.get("pagina"))));
  });
}
```

Criar `src/app/api/generos/route.ts`:

```ts
import { withUser } from "@/lib/api/http";
import { getMovieService } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withUser(req, async () => Response.json({ genres: await getMovieService().getGenres() }));
}
```

- [ ] **Passo 4: Cliente de API do navegador e hooks**

Criar `src/lib/api-client.ts`:

```ts
export class NetworkError extends Error {}
export class ServiceUnavailableError extends Error {}
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
  if (res.status === 401) {
    window.location.assign(`/entrar?volta=${encodeURIComponent(window.location.pathname)}`);
    throw new ApiError(401);
  }
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

- [ ] **Passo 5: Componentes visuais**

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

Criar `src/components/CatalogView.tsx` (a Tarefa 6 acrescenta o modal):

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

Substituir `src/app/(app)/page.tsx` por:

```tsx
import { CatalogView } from "@/components/CatalogView";
import { requirePageSession } from "@/lib/session";

export default async function CatalogoPage() {
  await requirePageSession("/");
  return <CatalogView />;
}
```

- [ ] **Passo 6: TMDB simulado para os testes E2E**

```bash
npm install -D tsx
```

Criar `tests/mocks/tmdb-server.ts`:

```ts
// TMDB falso para os testes E2E. Dados determinísticos:
// - catálogo: 3 páginas de 20 filmes; página p tem ids p*100 .. p*100+19 ("Filme 100"...)
// - com gênero 35, os títulos começam com "Comédia"; com "mais bem avaliados", com "Top"
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

No `playwright.config.ts`, adicionar o TMDB simulado como **primeiro** item de `webServer`:

```ts
  webServer: [
    {
      command: "npx tsx tests/mocks/tmdb-server.ts",
      port: 4010,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      // ...(o resto igual)
    },
  ],
```

- [ ] **Passo 7: Testes E2E do catálogo**

Criar `tests/e2e/catalog.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("a API não responde sem login", async ({ request }) => {
  expect((await request.get("/api/catalogo")).status()).toBe(401);
  expect((await request.get("/api/busca?q=x")).status()).toBe(401);
});

test.describe("logado", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test("mostra o catálogo e carrega mais filmes ao rolar", async ({ page }) => {
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
});
```

- [ ] **Passo 8: Rodar todos os testes**

```bash
npm test
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 9: Conferir com o TMDB real**

Com o `.env` completo, rode `npm run dev` e abra http://localhost:3000. Confira: os pôsteres da Netflix aparecem, a rolagem carrega mais, os filtros funcionam, e uma busca (ex.: "Matrix") mostra os selos.

- [ ] **Passo 10: Commit e push**

```bash
git add -A
git commit -m "feat: catálogo da Netflix com busca, filtros e rolagem infinita

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 6: Modal de detalhes

**Arquivos:**
- Criar: `src/lib/format.ts`, `src/components/MovieModal.tsx`, `src/app/api/filmes/[id]/route.ts`, `tests/unit/format.test.ts`, `tests/e2e/modal.spec.ts`
- Modificar: `src/components/CatalogView.tsx`

**Interfaces:**
- Consome: `apiFetch`, `errorMessage`, `posterUrl`, `NetflixBadge`, `MovieSummary`, `MovieDetails`, `parseMovieId` e `withUser`.
- Produz: `formatRuntime(minutes: number | null): string | null`, `<MovieModal movie={MovieSummary|null} onClose actions? />` (onde `actions` é `(movie: { tmdbMovieId; title; posterPath }) => ReactNode`, usado na Tarefa 8) e a rota `GET /api/filmes/{id}`.

- [ ] **Passo 1: Teste do `formatRuntime` (falhando)**

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

Rodar: `npm test`. Esperado: FALHA.

- [ ] **Passo 2: Implementar `src/lib/format.ts`**

```ts
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, "0")}min` : `${rest}min`;
}
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 3: Teste E2E do modal (falhando)**

Criar `tests/e2e/modal.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./helpers";

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test("abrir e fechar o modal não muda a posição da lista", async ({ page }) => {
  await signUp(page);
  const card = page.getByRole("button", { name: "Filme 115", exact: true });
  await card.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(300);
  const before = await scrollY(page);
  expect(before).toBeGreaterThan(0);
  const dialog = page.getByRole("dialog");

  // abre e mostra os detalhes
  await card.click();
  await expect(dialog.getByRole("heading", { name: "Filme 115" })).toBeVisible();
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

  // fecha com o "voltar" do celular/navegador sem sair do catálogo
  await card.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL("/");
  expect(await scrollY(page)).toBe(before);
  await expect(card).toBeInViewport();
});

test("filme sem sinopse, duração e trailer não mostra campos vazios", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Buscar filme pelo nome").fill("achado");
  await page.getByRole("button", { name: "Achado fora da Netflix" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Sinopse indisponível.")).toBeVisible();
  await expect(dialog.getByText("Fora da Netflix", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Ver trailer no YouTube" })).toHaveCount(0);
  await expect(dialog.getByText(/Elenco:/)).toHaveCount(0);
  await expect(dialog.getByText(/min$/)).toHaveCount(0);
});
```

Rodar: `npm run test:e2e -- modal`. Esperado: FALHA (o clique no card ainda não abre nada).

- [ ] **Passo 4: Rota de detalhes**

Criar `src/app/api/filmes/[id]/route.ts`:

```ts
import { parseMovieId } from "@/lib/api/params";
import { jsonError, withUser } from "@/lib/api/http";
import { getMovieService } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(req, async () => {
    const movieId = parseMovieId((await params).id);
    if (movieId === null) return jsonError(400, "invalid_id");
    return Response.json(await getMovieService().getMovieDetails(movieId));
  });
}
```

- [ ] **Passo 5: Componente do modal**

O "voltar" fecha o modal porque, ao abrir, o modal empilha no histórico uma cópia do estado atual (mesma URL, mesmo estado do Next). O "voltar" desfaz só essa cópia e dispara `popstate`, sem navegar. Fechar por X, Esc ou clique fora chama `history.back()`, então o histórico fica sempre limpo.

Criar `src/components/MovieModal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatRuntime } from "@/lib/format";
import { posterUrl } from "@/lib/images";
import type { MovieDetails, MovieSummary } from "@/lib/tmdb/types";
import { NetflixBadge } from "./NetflixBadge";

export type ModalMovie = { tmdbMovieId: number; title: string; posterPath: string | null };

type Props = {
  movie: MovieSummary | null;
  onClose: () => void;
  actions?: (movie: ModalMovie) => React.ReactNode;
};

export function MovieModal({ movie, onClose, actions }: Props) {
  const movieId = movie?.id ?? null;
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pushedFor = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Carrega os detalhes do filme aberto.
  useEffect(() => {
    if (movieId === null) return;
    let active = true;
    setDetails(null);
    setError(null);
    apiFetch<MovieDetails>(`/api/filmes/${movieId}`)
      .then((data) => active && setDetails(data))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [movieId]);

  // Histórico (botão voltar), tecla Esc e trava da rolagem do fundo.
  useEffect(() => {
    if (movieId === null) {
      pushedFor.current = null;
      return;
    }
    if (pushedFor.current !== movieId) {
      window.history.pushState(window.history.state, "");
      pushedFor.current = movieId;
    }
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden"; // trava a rolagem sem mudar a posição
    closeButton.current?.focus();
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
    };
  }, [movieId]);

  if (!movie) return null;

  const close = () => window.history.back();
  const shown = details ?? movie;
  const onNetflix = details ? details.onNetflix : movie.onNetflix;
  const poster = posterUrl(shown.posterPath, "w342");
  const meta = [shown.year, details ? formatRuntime(details.runtimeMinutes) : null].filter(Boolean).join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-modal-title"
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
      </div>
    </div>
  );
}
```

- [ ] **Passo 6: Ligar o modal ao catálogo**

Em `src/components/CatalogView.tsx`:
- adicionar o import `import { MovieModal } from "./MovieModal";`;
- adicionar `MovieSummary` ao import de tipos: `import type { CatalogSort, Genre, MovieSummary } from "@/lib/tmdb/types";`;
- dentro do componente, adicionar o estado `const [selected, setSelected] = useState<MovieSummary | null>(null);`;
- trocar `onSelect={() => {}}` por `onSelect={setSelected}`;
- logo antes do `</>` final, adicionar `<MovieModal movie={selected} onClose={() => setSelected(null)} />`.

- [ ] **Passo 7: Rodar todos os testes**

```bash
npm test
npm run test:e2e
```

Esperado: todos PASSAM, incluindo `modal.spec.ts`.

- [ ] **Passo 8: Conferir no celular de verdade (opcional e recomendado)**

Com `npm run dev -- -H 0.0.0.0` rodando, abra `http://<IP-do-PC>:3000` no celular, na mesma rede Wi-Fi. Role, abra um filme e use o botão "voltar" do Android. O modal fecha e a lista continua no mesmo lugar.

- [ ] **Passo 9: Commit e push**

```bash
git add -A
git commit -m "feat: modal de detalhes que preserva a posição da lista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 7: Listas: serviço e API

**Arquivos:**
- Criar: `src/lib/lists/types.ts`, `src/lib/lists/service.ts`, `src/lib/lists/validation.ts`, `src/app/api/listas/route.ts`, `src/app/api/listas/[movieId]/route.ts`
- Testes: `tests/integration/lists.test.ts`, `tests/unit/lists.test.ts`

**Interfaces:**
- Consome: `Db`, `getDb()`, `listItems`, `withUser`, `jsonError`, `parseMovieId`, `getMovieService().getNetflixAvailability`, e os helpers de integração `testDb`, `resetDb`, `createUser`.
- Produz:
  - `LIST_TYPES`, `ListType = "want" | "favorite"`, `MovieSnapshot { tmdbMovieId; title; posterPath }`, `StoredListItem` e `ListItemDto` (= snapshot + `listType` + `createdAt: string` + `onNetflix: boolean|null`);
  - `addToList(db, userId, movie, listType)`, `removeFromList(db, userId, tmdbMovieId, listType)`, `getListItems(db, userId)` e `withAvailability(items, availability)`;
  - `addListItemSchema` e `parseListType(value)`;
  - rotas `GET /api/listas` → `{ items: ListItemDto[] }`, `POST /api/listas` (corpo = snapshot + `listType`) → 204, e `DELETE /api/listas/{movieId}?lista=want|favorite` → 204.

- [ ] **Passo 1: Tipos**

Criar `src/lib/lists/types.ts`:

```ts
export const LIST_TYPES = ["want", "favorite"] as const;
export type ListType = (typeof LIST_TYPES)[number];

export type MovieSnapshot = { tmdbMovieId: number; title: string; posterPath: string | null };

export type StoredListItem = MovieSnapshot & { listType: ListType; createdAt: Date };

export type ListItemDto = MovieSnapshot & { listType: ListType; createdAt: string; onNetflix: boolean | null };
```

- [ ] **Passo 2: Testes de integração das regras (falhando)**

Criar `tests/integration/lists.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addToList, getListItems, removeFromList } from "@/lib/lists/service";
import { createUser, resetDb, testDb } from "./helpers";

const db = testDb();
const filme = (id: number) => ({ tmdbMovieId: id, title: `Filme ${id}`, posterPath: `/p${id}.jpg` });

beforeEach(async () => {
  await resetDb(db);
  await createUser(db, "ana");
  await createUser(db, "bia");
});
afterAll(() => db.$client.end());

describe("listas", () => {
  it("salva em Quero assistir guardando título e pôster", async () => {
    await addToList(db, "ana", filme(1), "want");
    const items = await getListItems(db, "ana");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ tmdbMovieId: 1, title: "Filme 1", posterPath: "/p1.jpg", listType: "want" });
  });

  it("toque duplo (duas inserções ao mesmo tempo) não duplica", async () => {
    await Promise.all([addToList(db, "ana", filme(1), "want"), addToList(db, "ana", filme(1), "want")]);
    expect(await getListItems(db, "ana")).toHaveLength(1);
  });

  it("marcar Favorito tira de Quero assistir", async () => {
    await addToList(db, "ana", filme(1), "want");
    await addToList(db, "ana", filme(1), "favorite");
    const items = await getListItems(db, "ana");
    expect(items.map((i) => i.listType)).toEqual(["favorite"]);
  });

  it("remove da lista", async () => {
    await addToList(db, "ana", filme(1), "want");
    await removeFromList(db, "ana", 1, "want");
    expect(await getListItems(db, "ana")).toHaveLength(0);
  });

  it("devolve os mais recentes primeiro", async () => {
    await addToList(db, "ana", filme(1), "want");
    await addToList(db, "ana", filme(2), "want");
    expect((await getListItems(db, "ana")).map((i) => i.tmdbMovieId)).toEqual([2, 1]);
  });

  it("cada pessoa só vê e altera a própria lista", async () => {
    await addToList(db, "ana", filme(1), "want");
    expect(await getListItems(db, "bia")).toHaveLength(0);
    await removeFromList(db, "bia", 1, "want");
    expect(await getListItems(db, "ana")).toHaveLength(1);
  });
});
```

Rodar: `npm run test:integration`. Esperado: FALHA (`@/lib/lists/service` inexistente).

- [ ] **Passo 3: Implementar o serviço**

Criar `src/lib/lists/service.ts`:

```ts
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { listItems } from "@/lib/db/schema";
import type { ListItemDto, ListType, MovieSnapshot, StoredListItem } from "./types";

export async function addToList(db: Db, userId: string, movie: MovieSnapshot, listType: ListType): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(listItems)
      .values({ userId, tmdbMovieId: movie.tmdbMovieId, title: movie.title, posterPath: movie.posterPath, listType })
      .onConflictDoNothing();
    if (listType === "favorite") {
      // Assistiu e gostou: sai da lista de desejos.
      await tx
        .delete(listItems)
        .where(and(eq(listItems.userId, userId), eq(listItems.tmdbMovieId, movie.tmdbMovieId), eq(listItems.listType, "want")));
    }
  });
}

export async function removeFromList(db: Db, userId: string, tmdbMovieId: number, listType: ListType): Promise<void> {
  await db
    .delete(listItems)
    .where(and(eq(listItems.userId, userId), eq(listItems.tmdbMovieId, tmdbMovieId), eq(listItems.listType, listType)));
}

export async function getListItems(db: Db, userId: string): Promise<StoredListItem[]> {
  return db
    .select({
      tmdbMovieId: listItems.tmdbMovieId,
      title: listItems.title,
      posterPath: listItems.posterPath,
      listType: listItems.listType,
      createdAt: listItems.createdAt,
    })
    .from(listItems)
    .where(eq(listItems.userId, userId))
    .orderBy(desc(listItems.createdAt));
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

Rodar: `npm run test:integration`. Esperado: PASSA.

- [ ] **Passo 4: Testes unitários de validação e disponibilidade (falhando)**

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

- [ ] **Passo 5: Implementar a validação**

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

- [ ] **Passo 6: Rotas da API**

Criar `src/app/api/listas/route.ts`:

```ts
import { jsonError, withUser } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { addToList, getListItems, withAvailability } from "@/lib/lists/service";
import { addListItemSchema } from "@/lib/lists/validation";
import { getMovieService } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withUser(req, async (userId) => {
    const movies = getMovieService();
    const items = await withAvailability(await getListItems(getDb(), userId), (id) => movies.getNetflixAvailability(id));
    return Response.json({ items });
  });
}

export async function POST(req: Request) {
  return withUser(req, async (userId) => {
    const parsed = addListItemSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError(400, "invalid_body");
    const { listType, ...movie } = parsed.data;
    await addToList(getDb(), userId, movie, listType);
    return new Response(null, { status: 204 });
  });
}
```

Criar `src/app/api/listas/[movieId]/route.ts`:

```ts
import { parseMovieId } from "@/lib/api/params";
import { jsonError, withUser } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { removeFromList } from "@/lib/lists/service";
import { parseListType } from "@/lib/lists/validation";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ movieId: string }> }) {
  return withUser(req, async (userId) => {
    const movieId = parseMovieId((await params).movieId);
    const listType = parseListType(new URL(req.url).searchParams.get("lista"));
    if (movieId === null || listType === null) return jsonError(400, "invalid_params");
    await removeFromList(getDb(), userId, movieId, listType);
    return new Response(null, { status: 204 });
  });
}
```

- [ ] **Passo 7: Conferir as rotas com `curl` (sem login: 401)**

Com `npm run dev` rodando:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/listas
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/listas -H "Content-Type: application/json" -d '{}'
```

Esperado: `401` nas duas.

- [ ] **Passo 8: Rodar todos os testes**

```bash
npm test
npm run test:integration
```

Esperado: todos PASSAM.

- [ ] **Passo 9: Commit e push**

```bash
git add -A
git commit -m "feat: serviço e API das listas com regra de favoritos e isolamento por usuário

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 8: Listas: telas

**Arquivos:**
- Criar: `src/lib/lists/toggle.ts`, `src/components/lists/ListsProvider.tsx`, `src/components/lists/ListButtons.tsx`, `src/components/lists/ListsView.tsx`, `src/app/(app)/listas/page.tsx`
- Testes: `tests/unit/toggle.test.ts`, `tests/e2e/lists.spec.ts`
- Modificar: `src/app/(app)/layout.tsx`, `src/components/NavBar.tsx`, `src/components/CatalogView.tsx`

**Interfaces:**
- Consome: `apiFetch`, `errorMessage`, `ListItemDto`, `ListType`, `MovieSnapshot`, `MovieGrid`, `MovieModal` (prop `actions`), `ListMarks`, `StatusMessage` e `requirePageSession`.
- Produz: `applyToggle(items, movie, listType, on, now): ListItemDto[]`; `<ListsProvider>` e `useLists()` → `{ items, loaded, error, marksFor(id): ListMarks, isPending(id, listType), toggle(movie, listType) }`; `<ListButtons movie />`; a página `/listas`.

- [ ] **Passo 1: Teste de `applyToggle` (falhando)**

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
    const result = applyToggle([item(1, "want")], filme, "favorite", true, now);
    expect(result.map((i) => i.listType)).toEqual(["favorite"]);
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

- [ ] **Passo 2: Implementar `src/lib/lists/toggle.ts`**

```ts
import type { ListItemDto, ListType, MovieSnapshot } from "./types";

/** Atualização otimista da tela; espelha as regras do servidor (lib/lists/service.ts). */
export function applyToggle(items: ListItemDto[], movie: MovieSnapshot, listType: ListType, on: boolean, now: Date): ListItemDto[] {
  const same = (i: ListItemDto, type: ListType) => i.tmdbMovieId === movie.tmdbMovieId && i.listType === type;
  if (!on) return items.filter((i) => !same(i, listType));
  if (items.some((i) => same(i, listType))) return items;
  const rest = listType === "favorite" ? items.filter((i) => !same(i, "want")) : items;
  return [{ ...movie, listType, createdAt: now.toISOString(), onNetflix: null }, ...rest];
}
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 3: Teste E2E das listas (falhando)**

Criar `tests/e2e/lists.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { logIn, logOut, signUp } from "./helpers";

test("salvar em Quero assistir e encontrar na lista", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Filme 101", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const quero = dialog.getByRole("button", { name: "Quero assistir" });
  await quero.click();
  await expect(quero).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: "Filme 101", exact: true }).locator('[data-mark="want"]')).toBeVisible();

  await page.getByRole("link", { name: "Minhas listas" }).click();
  await expect(page.getByRole("tab", { name: "Quero assistir" })).toHaveAttribute("aria-selected", "true");
  const card = page.getByRole("button", { name: "Filme 101", exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByText("Na Netflix", { exact: true })).toBeVisible();
});

test("marcar Favorito move o filme para Favoritos", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Filme 102", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Quero assistir" }).click();
  await dialog.getByRole("button", { name: "Favorito" }).click();
  await expect(dialog.getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "false");
  await expect(dialog.getByRole("button", { name: "Favorito" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Minhas listas" }).click();
  await expect(page.getByText("Nenhum filme aqui ainda.")).toBeVisible();
  await page.getByRole("tab", { name: "Favoritos" }).click();
  await expect(page.getByRole("button", { name: "Filme 102", exact: true })).toBeVisible();
});

test("filme fora da Netflix também pode ser salvo", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Buscar filme pelo nome").fill("achado");
  await page.getByRole("button", { name: "Achado fora da Netflix" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quero assistir" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Minhas listas" }).click();
  await expect(page.getByRole("button", { name: "Achado fora da Netflix" }).getByText("Fora da Netflix", { exact: true })).toBeVisible();
});

test("cada pessoa só vê a própria lista e ela continua depois de sair", async ({ page, browser }) => {
  const ana = await signUp(page, { name: "Ana" });
  await page.getByRole("button", { name: "Filme 103", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quero assistir" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Quero assistir" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  const outro = await browser.newContext();
  const biaPage = await outro.newPage();
  await signUp(biaPage, { name: "Bia" });
  await biaPage.goto("/listas");
  await expect(biaPage.getByText("Nenhum filme aqui ainda.")).toBeVisible();
  await outro.close();

  await logOut(page);
  await logIn(page, ana.email, ana.password);
  await page.goto("/listas");
  await expect(page.getByRole("button", { name: "Filme 103", exact: true })).toBeVisible();
});
```

Rodar: `npm run test:e2e -- lists`. Esperado: FALHA.

- [ ] **Passo 4: Provider das listas**

Criar `src/components/lists/ListsProvider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ListMarks } from "@/components/MovieCard";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { applyToggle } from "@/lib/lists/toggle";
import type { ListItemDto, ListType, MovieSnapshot } from "@/lib/lists/types";

type ListsContextValue = {
  items: ListItemDto[];
  loaded: boolean;
  error: string | null;
  marksFor: (tmdbMovieId: number) => ListMarks;
  isPending: (tmdbMovieId: number, listType: ListType) => boolean;
  toggle: (movie: MovieSnapshot, listType: ListType) => Promise<void>;
};

const ListsContext = createContext<ListsContextValue | null>(null);

export function useLists(): ListsContextValue {
  const value = useContext(ListsContext);
  if (!value) throw new Error("useLists precisa estar dentro de <ListsProvider>");
  return value;
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ListItemDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: ListItemDto[] }>("/api/listas");
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const marksFor = useCallback(
    (id: number): ListMarks => ({
      want: items.some((i) => i.tmdbMovieId === id && i.listType === "want"),
      favorite: items.some((i) => i.tmdbMovieId === id && i.listType === "favorite"),
    }),
    [items],
  );

  const isPending = useCallback((id: number, listType: ListType) => pending.has(`${id}:${listType}`), [pending]);

  const toggle = useCallback(
    async (movie: MovieSnapshot, listType: ListType) => {
      const key = `${movie.tmdbMovieId}:${listType}`;
      if (pendingRef.current.has(key)) return; // ignora o segundo toque enquanto o primeiro não termina
      pendingRef.current.add(key);
      setPending(new Set(pendingRef.current));

      const on = !items.some((i) => i.tmdbMovieId === movie.tmdbMovieId && i.listType === listType);
      const previous = items;
      setItems(applyToggle(items, movie, listType, on, new Date()));
      try {
        if (on) {
          await apiFetch("/api/listas", { method: "POST", body: JSON.stringify({ ...movie, listType }) });
        } else {
          await apiFetch(`/api/listas/${movie.tmdbMovieId}?lista=${listType}`, { method: "DELETE" });
        }
        void refresh(); // pega datas e disponibilidade oficiais do servidor
      } catch {
        setItems(previous);
        setToast("Não foi possível salvar. Tente de novo.");
      } finally {
        pendingRef.current.delete(key);
        setPending(new Set(pendingRef.current));
      }
    },
    [items, refresh],
  );

  const value = useMemo(() => ({ items, loaded, error, marksFor, isPending, toggle }), [items, loaded, error, marksFor, isPending, toggle]);

  return (
    <ListsContext.Provider value={value}>
      {children}
      {toast && (
        <div role="alert" className="fixed inset-x-4 bottom-20 z-[60] rounded-md bg-neutral-800 p-3 text-center text-sm shadow-lg md:bottom-4">
          {toast}
        </div>
      )}
    </ListsContext.Provider>
  );
}
```

- [ ] **Passo 5: Botões e tela das listas**

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
  const { items, loaded, error, marksFor } = useLists();
  const [tab, setTab] = useState<ListType>("want");
  const [selected, setSelected] = useState<MovieSummary | null>(null);

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

Criar `src/app/(app)/listas/page.tsx`:

```tsx
import { ListsView } from "@/components/lists/ListsView";
import { requirePageSession } from "@/lib/session";

export default async function ListasPage() {
  await requirePageSession("/listas");
  return <ListsView />;
}
```

- [ ] **Passo 6: Ligar as listas ao app**

Substituir `src/app/(app)/layout.tsx` por:

```tsx
import { ListsProvider } from "@/components/lists/ListsProvider";
import { NavBar } from "@/components/NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ListsProvider>
      <div className="min-h-dvh">
        <NavBar />
        <main className="pb-16 md:pb-0">{children}</main>
      </div>
    </ListsProvider>
  );
}
```

Em `src/components/NavBar.tsx`, trocar `LINKS` por:

```ts
const LINKS = [
  { href: "/", label: "Catálogo" },
  { href: "/listas", label: "Minhas listas" },
  { href: "/conta", label: "Conta" },
];
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
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 8: Commit e push**

```bash
git add -A
git commit -m "feat: telas das listas Quero assistir e Favoritos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 9: "Esqueci minha senha"

**Arquivos:**
- Criar: `src/lib/mailer.ts`, `src/app/(auth)/esqueci-senha/page.tsx`, `src/app/(auth)/esqueci-senha/ForgotPasswordForm.tsx`, `src/app/(auth)/redefinir-senha/page.tsx`, `src/app/(auth)/redefinir-senha/ResetPasswordForm.tsx`
- Testes: `tests/unit/mailer.test.ts`, `tests/e2e/reset-password.spec.ts`
- Modificar: `src/lib/auth.ts`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/entrar/LoginForm.tsx`

**Interfaces:**
- Consome: `getEnv()`, `Env`, `createAuth`, `authClient`, `TextField` e os helpers E2E.
- Produz: `Mailer { send(msg) }`, `createMailer(env)`, `getMailer()`, `resetPasswordEmail(name, url)` e a nova assinatura `createAuth(db, env, mailer)`.

- [ ] **Passo 1: Teste do e-mail (falhando)**

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

Criar `tests/unit/mailer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resetPasswordEmail } from "@/lib/mailer";

describe("resetPasswordEmail", () => {
  it("cumprimenta pelo nome e traz o link", () => {
    const email = resetPasswordEmail("Ana", "http://localhost:3000/api/auth/reset-password/abc");
    expect(email.subject).toBe("Redefinir sua senha");
    expect(email.text).toContain("Olá, Ana!");
    expect(email.text).toContain("http://localhost:3000/api/auth/reset-password/abc");
    expect(email.text).toContain("1 hora");
  });
});
```

Rodar: `npm test`. Esperado: FALHA.

- [ ] **Passo 2: Implementar `src/lib/mailer.ts`**

```ts
import nodemailer from "nodemailer";
import { getEnv, type Env } from "@/lib/env";

export type MailMessage = { to: string; subject: string; text: string };
export type Mailer = { send: (message: MailMessage) => Promise<void> };

export function createMailer(env: Pick<Env, "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS" | "SMTP_FROM">): Mailer {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return {
    async send(message) {
      await transport.sendMail({ from: env.SMTP_FROM, ...message });
    },
  };
}

let cached: Mailer | undefined;

export function getMailer(): Mailer {
  cached ??= createMailer(getEnv());
  return cached;
}

export function resetPasswordEmail(name: string, url: string): Omit<MailMessage, "to"> {
  return {
    subject: "Redefinir sua senha",
    text: [
      `Olá, ${name}!`,
      "",
      "Recebemos um pedido para redefinir sua senha. Para criar uma nova, abra o link abaixo (válido por 1 hora):",
      "",
      url,
      "",
      "Se não foi você, ignore este e-mail. Sua senha continua a mesma.",
    ].join("\n"),
  };
}
```

Rodar: `npm test`. Esperado: PASSA.

- [ ] **Passo 3: Ligar o e-mail ao Better Auth**

Em `src/lib/auth.ts`:
- adicionar o import `import { getMailer, resetPasswordEmail, type Mailer } from "@/lib/mailer";`;
- mudar a assinatura para `export function createAuth(db: Db, env: Env, mailer: Mailer) {`;
- trocar o bloco `emailAndPassword` por:

```ts
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
      revokeSessionsOnPasswordReset: true, // trocar a senha desconecta os outros aparelhos
      sendResetPassword: async ({ user, url }) => {
        // Sem await: a resposta leva o mesmo tempo exista ou não a conta.
        void mailer.send({ to: user.email, ...resetPasswordEmail(user.name, url) }).catch((e) => console.error("Falha ao enviar e-mail de senha", e));
      },
    },
```

- acrescentar dois itens em `rateLimit.customRules` (o nome do endpoint mudou entre versões do Better Auth, então os dois ficam):

```ts
        "/request-password-reset": { window: 60, max: 3 },
        "/forget-password": { window: 60, max: 3 },
```

- em `getAuth()`, trocar `createAuth(getDb(), getEnv())` por `createAuth(getDb(), getEnv(), getMailer())`.

- [ ] **Passo 4: Teste E2E (falhando)**

Criar `tests/e2e/reset-password.spec.ts`:

```ts
import { expect, test, type APIRequestContext } from "@playwright/test";
import { logIn, logOut, PASSWORD, signUp } from "./helpers";

const MAILPIT = "http://localhost:8025";

/** Busca no Mailpit o link de redefinição mais recente enviado para o e-mail. */
async function resetLinkFor(request: APIRequestContext, email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = await (await request.get(`${MAILPIT}/api/v1/messages`)).json();
    const message = list.messages?.find((m: { To: { Address: string }[] }) => m.To.some((to) => to.Address === email));
    if (message) {
      const full = await (await request.get(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const link = (full.Text as string).match(/https?:\/\/\S+/)?.[0];
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Nenhum e-mail de redefinição para ${email}`);
}

test("redefinir a senha pelo e-mail e desconectar os outros aparelhos", async ({ page, browser, request }) => {
  // aparelho 1: cria a conta e continua logado
  const outroAparelho = await browser.newContext();
  const aparelho1 = await outroAparelho.newPage();
  const conta = await signUp(aparelho1);

  // aparelho 2: pede o link
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("E-mail").fill(conta.email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se o e-mail existir, enviamos o link.")).toBeVisible();

  // abre o link do e-mail e cria a nova senha
  await page.goto(await resetLinkFor(request, conta.email));
  await expect(page).toHaveURL(/\/redefinir-senha\?token=/);
  await page.getByLabel("Nova senha", { exact: true }).fill("senha-nova-456");
  await page.getByLabel("Confirmar nova senha").fill("senha-nova-456");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL("/entrar?senha=redefinida");
  await expect(page.getByText("Senha alterada. Entre com a nova senha.")).toBeVisible();

  // a senha antiga não funciona mais; a nova sim
  await logIn(page, conta.email, PASSWORD);
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
  await logIn(page, conta.email, "senha-nova-456");
  await expect(page).toHaveURL("/");

  // o aparelho 1 foi desconectado
  await aparelho1.goto("/conta");
  await expect(aparelho1).toHaveURL(/\/entrar/);
  await outroAparelho.close();
  await logOut(page);
});

test("e-mail sem conta recebe a mesma resposta", async ({ page }) => {
  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail").fill("ninguem-aqui@teste.com");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se o e-mail existir, enviamos o link.")).toBeVisible();
});

test("link inválido avisa e oferece pedir outro", async ({ page }) => {
  await page.goto("/redefinir-senha?error=INVALID_TOKEN");
  await expect(page.getByText("Link inválido ou expirado.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir um novo link" })).toBeVisible();
});
```

Rodar: `npm run test:e2e -- reset-password`. Esperado: FALHA. O Mailpit precisa estar de pé (`docker compose up -d`).

- [ ] **Passo 5: Telas de "esqueci" e "redefinir"**

Antes de escrever, confira na versão instalada o nome do método do cliente:

```bash
grep -rho "requestPasswordReset\|forgetPassword" node_modules/better-auth/dist | sort | uniq -c
```

Use `requestPasswordReset` se ele existir. Se não existir, troque por `forgetPassword` (mesmos parâmetros).

Criar `src/app/(auth)/esqueci-senha/page.tsx`:

```tsx
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function EsqueciSenhaPage() {
  return <ForgotPasswordForm />;
}
```

Criar `src/app/(auth)/esqueci-senha/ForgotPasswordForm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
      if (error?.status === 429) setError("Muitas tentativas. Aguarde um minuto e tente de novo.");
      else if (error && !error.status) setError("Sem conexão. Verifique sua internet.");
      else setSent(true); // mesma resposta exista ou não a conta
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Verifique seu e-mail</h1>
        <p className="text-sm text-neutral-300">Se o e-mail existir, enviamos o link.</p>
        <Link href="/entrar" className="text-sm text-red-400 underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
      <p className="text-sm text-neutral-400">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-red-600 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Enviando..." : "Enviar link"}
      </button>
      <p className="text-center text-sm">
        <Link href="/entrar" className="text-red-400 underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
```

Criar `src/app/(auth)/redefinir-senha/page.tsx`:

```tsx
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={error ? null : (token ?? null)} />;
}
```

Criar `src/app/(auth)/redefinir-senha/ResetPasswordForm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";

function InvalidLink() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Redefinir senha</h1>
      <p role="alert" className="text-sm text-red-400">
        Link inválido ou expirado.
      </p>
      <Link href="/esqueci-senha" className="text-sm text-red-400 underline">
        Pedir um novo link
      </Link>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(token === null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (newPassword !== String(form.get("confirm"))) return setError("As senhas não são iguais.");
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) {
        if (!error.status) setError("Sem conexão. Verifique sua internet.");
        else setInvalid(true);
        return;
      }
      router.replace("/entrar?senha=redefinida");
    } catch {
      setError("Sem conexão. Verifique sua internet.");
    } finally {
      setPending(false);
    }
  }

  if (invalid || !token) return <InvalidLink />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Criar nova senha</h1>
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

- [ ] **Passo 6: Ajustes no login**

Em `src/app/(auth)/entrar/page.tsx`, trocar o tipo e o corpo para ler `senha`:

```tsx
export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ volta?: string; senha?: string }> }) {
  const { volta, senha } = await searchParams;
  const returnTo = safeReturnPath(volta);
  if (await getSession()) redirect(returnTo);
  return <LoginForm returnTo={returnTo} passwordReset={senha === "redefinida"} />;
}
```

Em `src/app/(auth)/entrar/LoginForm.tsx`:
- mudar a assinatura para `export function LoginForm({ returnTo, passwordReset = false }: { returnTo: string; passwordReset?: boolean }) {`;
- logo abaixo do `<h1>`, adicionar:

```tsx
      {passwordReset && <p role="status" className="text-sm text-green-400">Senha alterada. Entre com a nova senha.</p>}
```

- logo abaixo do campo "Senha", adicionar:

```tsx
      <p className="text-right text-sm">
        <Link href="/esqueci-senha" className="text-neutral-400 underline">
          Esqueci minha senha
        </Link>
      </p>
```

- [ ] **Passo 7: Rodar todos os testes**

```bash
docker compose up -d
npm test
npm run test:e2e
```

Esperado: todos PASSAM.

- [ ] **Passo 8: Conferir no navegador**

Com `npm run dev`, peça a redefinição para a sua conta. Abra http://localhost:8025, clique no e-mail e siga o link.

- [ ] **Passo 9: Commit e push**

```bash
git add -A
git commit -m "feat: esqueci minha senha com e-mail via Mailpit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Tarefa 10: Docker de produção, créditos e README

**Arquivos:**
- Criar: `Dockerfile`, `.dockerignore`, `src/components/Credits.tsx`, `README.md`
- Modificar: `next.config.ts`, `docker-compose.yml`, `docker-compose.override.yml`, `src/app/(auth)/layout.tsx`, `src/app/(app)/conta/page.tsx`

**Interfaces:**
- Consome: tudo das tarefas anteriores.
- Produz: a imagem Docker do app, o serviço `app` no compose e o componente `<Credits />`.

- [ ] **Passo 1: Créditos (TMDB e JustWatch)**

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

Em `src/app/(auth)/layout.tsx`:
- adicionar o import `import { Credits } from "@/components/Credits";`;
- logo depois do `<div className="w-full max-w-sm ...">...</div>`, adicionar `<div className="mt-6 max-w-sm"><Credits /></div>`.

Em `src/app/(app)/conta/page.tsx`:
- adicionar o import `import { Credits } from "@/components/Credits";`;
- depois de `<SignOutButton />`, adicionar `<Credits />`.

Adicionar um teste em `tests/e2e/auth.spec.ts`:

```ts
test("créditos do TMDB e da JustWatch aparecem", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.getByText("mas não é endossado nem certificado pelo TMDB")).toBeVisible();
  await expect(page.getByText(/Dados de onde assistir fornecidos pela/)).toBeVisible();
});
```

- [ ] **Passo 2: Imagem Docker**

Em `next.config.ts`, adicionar `output: "standalone"` ao objeto de configuração:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Criar `.dockerignore`:

```
.git
node_modules
.next
.env
.env.*
!.env.example
arquivos
docs
tests
test-results
playwright-report
```

Criar `Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Passo 3: Serviço `app` no compose**

Em `docker-compose.yml`, adicionar dentro de `services:`:

```yaml
  app:
    build: .
    env_file: .env
    environment:
      DATABASE_URL: postgres://app:${POSTGRES_PASSWORD}@db:5432/claude_nextjs
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
```

Em `docker-compose.override.yml`, adicionar dentro de `services:` (em desenvolvimento o app no container manda e-mail pelo Mailpit):

```yaml
  app:
    environment:
      SMTP_HOST: mailpit
      SMTP_PORT: "1025"
    depends_on:
      - mailpit
```

- [ ] **Passo 4: Subir tudo em containers e conferir**

```bash
docker compose up -d --build
docker compose ps
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/entrar
docker compose logs app --tail 20
```

Esperado: `app`, `db`, `db-test` e `mailpit` rodando, `200` no curl, e nenhum erro de migração no log. Abra http://localhost:3000 e crie uma conta para conferir. Ao terminar, rode `docker compose stop app` para liberar a porta 3000 para o `npm run dev`.

- [ ] **Passo 5: README**

Criar `README.md`:

````markdown
# claude-nextjs

Catálogo dos filmes da Netflix Brasil com listas pessoais ("Quero assistir" e "Favoritos").
Projeto de estudo de **Claude Code** com **Next.js**, construído como se fosse para produção.

## Stack

Next.js 16 (React 19, TypeScript) · Tailwind CSS 4 · Better Auth · PostgreSQL 17 + Drizzle ORM ·
Docker Compose · Vitest + Playwright · dados do TMDB.

## Como rodar

Pré-requisitos: Docker e Node 22.

```bash
cp .env.example .env          # preencha TMDB_API_TOKEN, BETTER_AUTH_SECRET e as senhas
npm install
docker compose up -d db db-test mailpit
npm run dev                   # http://localhost:3000
```

- E-mails de desenvolvimento: http://localhost:8025 (Mailpit)
- Tudo em containers: `docker compose up -d --build`

## Testes

```bash
npm test                  # unitários
npm run test:integration  # com PostgreSQL de teste
npm run test:e2e          # navegador (TMDB simulado)
```

## Produção (VPS)

Com Docker instalado na VPS: copie o projeto, crie o `.env` com valores reais (incluindo o SMTP de
um serviço de e-mail) e rode `docker compose -f docker-compose.yml up -d --build`. O
`docker-compose.override.yml` (Mailpit e banco de testes) é só para desenvolvimento.

## Créditos

Este produto usa a API do [TMDB](https://www.themoviedb.org), mas não é endossado nem certificado
pelo TMDB. Dados de onde assistir fornecidos pela [JustWatch](https://www.justwatch.com).
````

- [ ] **Passo 6: Rodar a bateria completa**

```bash
npm test
npm run test:integration
npm run test:e2e
npm run lint
```

Esperado: todos PASSAM e o lint fica sem erros.

- [ ] **Passo 7: Commit e push**

```bash
git add -A
git commit -m "feat: imagem Docker de produção, créditos do TMDB/JustWatch e README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```
