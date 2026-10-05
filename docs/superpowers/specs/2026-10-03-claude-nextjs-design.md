# claude-nextjs — Design

Catálogo dos filmes da Netflix Brasil, aberto a qualquer pessoa, com listas pessoais para quem tem conta.
Projeto de aprendizado (Claude Code + Next.js + Supabase + Vercel), construído como se fosse para produção.

- **Data:** 2026-10-03, revisado em 2026-10-04 (troca de VPS/Docker por Vercel + Supabase, catálogo aberto, cadastro simples)
- **Status:** aguardando revisão

## 1. Objetivo

Um "cardápio" de filmes: a pessoa navega pelo catálogo da Netflix Brasil (no metrô, no sofá), salva filmes em listas e depois consulta no celular ou notebook para lembrar o nome e procurar no app da Netflix.

**Não faz:** tocar filmes, integrar com a conta Netflix, recomendar filmes.

**Sucesso significa:**
- Qualquer pessoa, sem conta, encontra rapidamente um filme da Netflix BR por gênero, popularidade ou nome.
- Qualquer pessoa descobre se um filme qualquer está ou não na Netflix BR.
- Quem tem conta salva e consulta as próprias listas a partir de qualquer aparelho.
- Abrir os detalhes de um filme, ou fazer login no meio do caminho, e voltar **exatamente** ao mesmo ponto da lista.

## 2. Usuários e contas

- **O catálogo, a busca e os detalhes são abertos**, sem login.
- **Login só é exigido para salvar em listas** e para ver "Minhas listas".
- **Conta = e-mail + senha** (mínimo de 8 caracteres). Sem nome, sem apelido e **sem confirmação de e-mail**. O cadastro já entra direto.
- **Sessão:** dura até a pessoa sair (padrão do Supabase). Também termina se ela limpar os dados do navegador ou redefinir a senha em outro aparelho (neste caso, em até 1 hora, quando o acesso atual expira).
- **"Esqueci minha senha"** existe e funciona por e-mail.

## 3. Escopo do catálogo

- **Região:** só Brasil (`watch_region=BR`).
- **Streaming:** só Netflix, só "incluído na assinatura" (`flatrate`). O código aceita outros provedores depois sem mudar a estrutura.
- **IDs de provedor da Netflix BR** (pode haver mais de um, como o plano com anúncios): confirmados via `/watch/providers/movie?watch_region=BR` antes de irem para a configuração.
- **Só filmes**, sem séries.

## 4. Arquitetura

```
Navegador (celular/notebook)
        │
        ▼
Vercel ─ Next.js (App Router)
  ├─ telas: React + Tailwind
  └─ servidor: TypeScript
       · token do TMDB (nunca vai ao navegador)
       · cache do Next.js para respostas do TMDB
        │                         │
        ▼                         ▼
Supabase (nuvem)              TMDB API
  ├─ Auth (e-mail + senha)
  └─ Postgres (listas, com RLS)
```

| Peça | Tecnologia |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Visual | Tailwind CSS |
| Autenticação | Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`) |
| Banco | Postgres do Supabase, com Row Level Security |
| Estrutura do banco | migrações SQL do Supabase CLI (`supabase/migrations/`) |
| Hospedagem | Vercel (plano Hobby) |
| Desenvolvimento local | Supabase CLI (`supabase start`, em Docker) |

- **Produção:** o Vercel publica a cada merge na `main` e gera uma prévia para cada PR. O Supabase roda num projeto gratuito na nuvem.
- **Desenvolvimento e testes:** o Supabase local (banco, Auth, painel e caixa de e-mails de teste) roda em Docker. O banco da nuvem não é usado para desenvolver nem testar.
- **Chaves:** o app usa só a chave pública do Supabase, que é segura porque o RLS protege os dados. A chave de serviço (`service_role`) nunca entra no app.
- **Limites conhecidos do plano gratuito:**
  - o Supabase pausa o projeto após cerca de 7 dias sem uso (reativação manual no painel);
  - o e-mail embutido do Supabase permite poucos envios por hora;
  - o Vercel Hobby é para uso pessoal e não comercial.

## 5. Telas

Mobile-first. **A navegação nunca some:** no celular, uma barra inferior fixa; no notebook, a mesma barra fixa no topo.

- **Sem login:** Catálogo | Entrar
- **Com login:** Catálogo | Minhas listas | Conta

### 5.1 Catálogo (tela principal, aberta)
- Grade de pôsteres com rolagem infinita.
- Faixa fixa no topo, compacta, com **busca por nome**, **filtro de gênero** e **ordenação** (Populares / Mais bem avaliados).
- A nota não aparece na tela. É usada só para ordenar. "Mais bem avaliados" exige um número mínimo de votos.
- A **busca procura no TMDB inteiro**. Cada resultado mostra o selo **"Na Netflix"** ou **"Fora da Netflix"**. Com texto na busca, os filtros de gênero e de ordenação ficam desativados.
- Para quem está logado, os pôsteres dos filmes que já estão nas listas mostram um ícone.

### 5.2 Modal de detalhes
- Abre ao tocar num pôster: imagem, título, ano, duração, gêneros, sinopse, parte do elenco, link do trailer (YouTube) e o selo da Netflix.
- Botões **"Quero assistir"** e **"Favorito"**, sempre visíveis, cada um liga e desliga.
- Fecha clicando fora, no X, com Esc ou com o botão "voltar" do celular/navegador.
- **Requisito central:** abrir e fechar o modal não altera a posição de rolagem nem o estado da tela de baixo.

### 5.3 Modal de login
- Abre por cima da tela atual ao tocar em "Entrar", ou num botão de lista sem estar logado. Fecha clicando fora, no X, com Esc ou com o botão "voltar".
- Três modos no mesmo modal:
  - **Entrar:** e-mail + senha.
  - **Criar conta:** e-mail + senha.
  - **Esqueci minha senha:** e-mail → "Se o e-mail existir, enviamos o link."
- **Salvar sem estar logado:**
  1. o modal de login abre por cima do modal de detalhes;
  2. depois de entrar ou criar a conta, o login fecha e o filme é salvo automaticamente;
  3. o modal de detalhes continua aberto, com o botão marcado.

  Não há troca de página, e o catálogo por trás não sai do lugar.

### 5.4 Minhas listas (só logado)
- Abas **Quero assistir** e **Favoritos**, as mais recentes primeiro.
- Usam a mesma grade e o mesmo modal do catálogo.
- Cada item mostra o selo **"Na Netflix" / "Fora da Netflix"** com a disponibilidade atual (vinda do cache). Um filme que saiu do catálogo passa a mostrar "Fora da Netflix".
- **Regra:** marcar como Favorito remove o filme de "Quero assistir".
- Filmes fora da Netflix podem ser salvos normalmente.
- Sem login, a tela mostra um convite para entrar, com um botão que abre o modal de login.

### 5.5 Redefinir senha
- É a página para onde o link do e-mail leva: nova senha + confirmação.
- Depois de salvar, a pessoa vai para o catálogo já logada. As sessões nos outros aparelhos deixam de ser renovadas e caem em até 1 hora.
- Link inválido ou expirado: mensagem com a opção de pedir um novo.

### 5.6 Conta (só logado)
- E-mail da pessoa, botão **Sair** e os créditos do TMDB e da JustWatch.

## 6. Dados

### 6.1 Postgres (Supabase)
- **Contas:** ficam em `auth.users`, gerenciada pelo Supabase.
- **`public.list_items`:**

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid | PK, gerado pelo banco |
| user_id | uuid → `auth.users` | padrão `auth.uid()`; apagar a conta apaga os itens |
| tmdb_movie_id | integer | |
| list_type | enum (`want`, `favorite`) | |
| title | text | cópia para exibir sem depender do TMDB |
| poster_path | text, nulo | cópia |
| created_at | timestamptz | ordena as listas |

- Restrição única em (`user_id`, `tmdb_movie_id`, `list_type`).
- **RLS ligado:** políticas de `select`, `insert` e `delete` permitem só linhas com `user_id = auth.uid()`. Não há política de `update`.
- **Gatilho:** ao inserir um `favorite`, o próprio banco apaga o `want` do mesmo usuário e filme.
- A estrutura vive em `supabase/migrations/*.sql` e é aplicada igual no banco local e no da nuvem.

### 6.2 TMDB (sempre via servidor, idioma `pt-BR`)

| Uso | Endpoint |
|---|---|
| Catálogo | `/discover/movie` com Netflix, `watch_region=BR`, `flatrate`, gênero e ordenação |
| Busca | `/search/movie`, e depois a disponibilidade de cada resultado via `/movie/{id}/watch/providers` |
| Detalhes | `/movie/{id}?append_to_response=credits,videos,watch/providers` |
| Gêneros | `/genre/movie/list` |

- **Trailer:** prioriza vídeos em português e usa inglês como alternativa.
- **Cache:** é o do Next.js (data cache), que persiste entre requisições no Vercel. Prazos: catálogo e busca por algumas horas, detalhes e disponibilidade por cerca de 24 h, gêneros por dias. Os valores exatos ficam no plano.
- **Pôsteres:** cada tela pede o tamanho de imagem adequado a ela.

### 6.3 Créditos
Os créditos do **TMDB** (com o aviso exigido pelos termos de uso) e da **JustWatch** (fonte dos dados de onde assistir) ficam na tela **Conta** e no rodapé do modal de login. Com rolagem infinita, um rodapé no catálogo nunca seria alcançado.

## 7. Erros

| Situação | Comportamento |
|---|---|
| Navegador sem conexão com o servidor | "Sem conexão. Verifique sua internet." |
| TMDB fora do ar ou com timeout | "O serviço de filmes está indisponível no momento. Suas listas continuam funcionando normalmente." Sem botão de tentar de novo. A próxima navegação tenta normalmente. |
| Busca sem resultados | "Nenhum filme encontrado." |
| Falha ao salvar na lista | O botão volta ao estado anterior e aparece um aviso rápido. |
| Login com e-mail ou senha errados | "E-mail ou senha incorretos." |
| Cadastro com e-mail já usado | "Este e-mail já tem conta." |
| Sessão perdida ao salvar | O modal de login abre e, depois de entrar, a ação é concluída. |

## 8. Segurança

- **Login:** a mensagem de erro é sempre a mesma, e o Supabase Auth limita as tentativas.
- **"Esqueci minha senha":** responde sempre "se o e-mail existir, enviamos o link".
- **Senhas:** quem guarda é o Supabase, nunca o app.
- **Isolamento entre usuários:** garantido pelo RLS no banco, e não só pelo código.
- **Segredos:** token do TMDB fica no `.env.local` (fora do git) e nas variáveis de ambiente do Vercel. O repositório tem um `.env.example` só com os nomes.
- **Chamadas ao TMDB:** saem só do servidor.

## 9. Testes

- **Unitários:** conversão das respostas do TMDB, verificação de disponibilidade na Netflix, parâmetros das rotas e regras de estado da tela.
- **Integração (Supabase local):**
  - um usuário não lê nem apaga itens de outro (RLS testado no banco);
  - o gatilho de favorito remove de "quero assistir";
  - não há duplicatas.
- **Ponta a ponta (navegador automatizado, tamanho de celular, Supabase local, TMDB simulado):**
  - catálogo, busca e detalhes funcionando sem login;
  - salvar sem estar logado → login no modal → filme salvo, com a rolagem no mesmo lugar;
  - listas separadas por usuário;
  - recuperação de senha lendo o e-mail da caixa de teste local;
  - modal de detalhes mantendo a posição (clique fora, X, Esc, voltar).
- **O TMDB é sempre simulado nos testes**, sem chamadas reais.

## 10. Ordem de construção

Cada etapa termina funcionando, testada e entregue num PR com prévia no Vercel.

1. **Base:** Next.js, testes, Supabase local e o primeiro deploy no Vercel
2. **Catálogo público:** camada do TMDB, busca, filtros e rolagem infinita
3. **Modal de detalhes**
4. **Contas:** modal de login/cadastro/recuperação, Conta, Sair, Redefinir senha
5. **Listas:** tabela, RLS, gatilho, telas e "salvar depois do login"
6. **Produção:** projeto Supabase na nuvem, migrações, variáveis no Vercel, créditos e README

## 11. Fora do escopo (por enquanto)

Séries, outros streamings, outros países, VPS/Docker do app, SMTP próprio para e-mails, notas e comentários pessoais, compartilhamento de listas.
