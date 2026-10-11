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
