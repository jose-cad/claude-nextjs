# claude-nextjs — Design

Catálogo pessoal de filmes da Netflix Brasil, com listas por usuário.
Projeto de aprendizado (Claude Code + Next.js), construído como se fosse para produção.

- **Data:** 2026-10-03
- **Status:** aguardando revisão

## 1. Objetivo

Um "cardápio" de filmes: a pessoa navega pelo catálogo da Netflix Brasil (no metrô, no sofá), salva filmes em listas e depois consulta no celular ou notebook para lembrar o nome e procurar no app da Netflix.

**Não faz:** tocar filmes, integrar com a conta Netflix, recomendar filmes.

**Sucesso significa:**
- Encontrar rapidamente um filme da Netflix BR por gênero, popularidade ou nome.
- Saber se um filme qualquer está ou não na Netflix BR.
- Salvar e consultar as próprias listas a partir de qualquer aparelho.
- Abrir os detalhes de um filme e voltar **exatamente** ao mesmo ponto da lista.

## 2. Usuários e contas

- Cada pessoa tem **a própria conta** (nome, e-mail e senha) e **as próprias listas**. O cadastro é aberto.
- **Login obrigatório para tudo**, inclusive o catálogo.
- **Sessão de 7 dias, renovada a cada uso.** Só pede login de novo se a pessoa sair, ficar mais de 7 dias sem usar, limpar os dados do navegador, usar um aparelho novo ou trocar a senha (nesse caso, os outros aparelhos são desconectados).

## 3. Escopo do catálogo

- **Região:** só Brasil (`watch_region=BR`).
- **Streaming:** só Netflix, só "incluído na assinatura" (`flatrate`). O código aceita outros provedores depois sem mudar a estrutura.
- **Os IDs de provedor da Netflix BR** (pode haver mais de um, como o plano com anúncios) são confirmados via `/watch/providers/movie?watch_region=BR` antes de serem fixados em configuração.
- **Só filmes**, sem séries.

## 4. Arquitetura

```
Navegador (celular/notebook)
        │
        ▼
Next.js (container "app")
  ├─ telas: React + Tailwind
  └─ servidor: TypeScript
       · chave do TMDB (nunca vai ao navegador)
       · autenticação (Better Auth)
       · cache das respostas do TMDB
        │                     │
        ▼                     ▼
PostgreSQL (container "db")   TMDB API (internet)

Mailpit (container, só em desenvolvimento): captura e-mails de teste
```

| Peça | Tecnologia |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Visual | Tailwind CSS |
| Autenticação | Better Auth (e-mail + senha) |
| Banco | PostgreSQL |
| Acesso ao banco | Drizzle ORM |
| E-mail (dev) | Mailpit via SMTP |
| Execução | Docker Compose |

- **Desenvolvimento:** `docker compose up` sobe app, db e mailpit.
- **Produção (VPS):** a mesma compose, sem mailpit, com o SMTP real configurado no `.env`. Basta ter Docker instalado na VPS.

## 5. Telas

Mobile-first. **A navegação nunca some:** no celular, uma barra inferior fixa (Catálogo | Minhas listas | Conta). No notebook, a mesma barra fica fixa no topo.

### 5.1 Catálogo (tela principal)
- Grade de pôsteres com rolagem infinita.
- Faixa fixa no topo, compacta, com **busca por nome**, **filtro de gênero** e **ordenação** (Populares / Mais bem avaliados).
- A nota não aparece na tela. É usada só para ordenar. "Mais bem avaliados" exige um número mínimo de votos.
- A **busca procura no TMDB inteiro**. Cada resultado mostra o selo **"Na Netflix"** ou **"Fora da Netflix"**.
- Pôsteres de filmes que já estão nas listas do usuário mostram um ícone indicativo.

### 5.2 Modal de detalhes
- Abre ao tocar em um pôster: imagem, título, ano, duração, gêneros, sinopse, parte do elenco, link do trailer (YouTube) e o selo da Netflix.
- Botões **"Quero assistir"** e **"Favorito"**, cada um liga e desliga.
- Fecha clicando fora, no X ou com Esc.
- **Requisito central:** abrir e fechar o modal não altera a posição de rolagem nem o estado da tela de baixo.

### 5.3 Minhas listas
- Abas **Quero assistir** e **Favoritos**, as mais recentes primeiro.
- Usam a mesma grade e o mesmo modal do catálogo.
- Cada item mostra o selo **"Na Netflix" / "Fora da Netflix"** com a disponibilidade atual (vinda do cache). Um filme salvo quando estava na Netflix e que saiu do catálogo passa a mostrar "Fora da Netflix".
- **Regra:** marcar como Favorito remove o filme de "Quero assistir".
- Filmes fora da Netflix podem ser salvos normalmente.

### 5.4 Contas
- Entrar, Criar conta, Esqueci minha senha, Redefinir senha (link por e-mail) e Sair.

## 6. Dados

### 6.1 PostgreSQL
- **Tabelas do Better Auth:** usuário, sessão, conta e verificação. São geradas e gerenciadas pela biblioteca.
- **`list_items`:**

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid | PK |
| user_id | FK → usuário | apagar o usuário apaga os itens |
| tmdb_movie_id | integer | |
| list_type | enum (`want`, `favorite`) | |
| title | text | cópia para exibir sem depender do TMDB |
| poster_path | text, nulo | cópia |
| created_at | timestamp | ordena as listas |

- Restrição única em (`user_id`, `tmdb_movie_id`, `list_type`).
- Cada usuário só lê e altera os próprios itens. Essa checagem é feita no servidor em toda operação.

### 6.2 TMDB (sempre via servidor, idioma `pt-BR`)

| Uso | Endpoint |
|---|---|
| Catálogo | `/discover/movie` com Netflix, `watch_region=BR`, `flatrate`, gênero e ordenação |
| Busca | `/search/movie`, e depois a disponibilidade de cada resultado via `/movie/{id}/watch/providers` |
| Detalhes | `/movie/{id}?append_to_response=credits,videos,watch/providers` |
| Gêneros | `/genre/movie/list` |

- **Trailer:** prioriza vídeos em português e usa inglês como alternativa.
- **Cache no servidor (em memória, com TTL):** catálogo e busca por algumas horas, detalhes e disponibilidade por cerca de 24 h, gêneros por dias. Os valores exatos são definidos no plano.
- **Pôsteres:** cada tela pede ao TMDB o tamanho de imagem adequado a ela.

### 6.3 Créditos
Um rodapé discreto credita o **TMDB** (com o aviso exigido pelos termos de uso) e a **JustWatch** (fonte dos dados de onde assistir).

## 7. Erros

| Situação | Comportamento |
|---|---|
| Navegador sem conexão com o servidor | "Sem conexão. Verifique sua internet." |
| TMDB fora do ar ou com timeout | "O serviço de filmes está indisponível no momento. Suas listas continuam funcionando normalmente." Sem botão de tentar de novo. A próxima navegação tenta normalmente. |
| Busca sem resultados | "Nenhum filme encontrado." |
| Falha ao salvar na lista | O botão volta ao estado anterior e aparece um aviso rápido. |
| Sessão inválida | Vai para o login e, depois de entrar, volta à página de origem. |

## 8. Segurança

- **Erro de login:** a mensagem é sempre "e-mail ou senha incorretos".
- **Tentativas de login:** têm limite de frequência, com bloqueio temporário.
- **"Esqueci minha senha":** responde sempre "se o e-mail existir, enviamos o link".
- **Senhas:** guardadas só como hash (Better Auth).
- **Segredos:** token do TMDB, senha do banco, segredo de autenticação e SMTP ficam no `.env`, que fica fora do git. O repositório tem um `.env.example` só com os nomes das variáveis.
- **Chamadas ao TMDB:** saem só do servidor.

## 9. Testes

- **Unitários:** regras das listas (favorito remove de "quero assistir", sem duplicatas), verificação de disponibilidade na Netflix, conversão das respostas do TMDB e cache.
- **Integração:** operações das listas contra um PostgreSQL de teste em Docker, incluindo o isolamento entre usuários.
- **Ponta a ponta (navegador automatizado, tamanho de celular):** criar conta → entrar → navegar → abrir o modal → salvar → ver nas listas. Inclui um teste específico de que a posição de rolagem se mantém ao abrir e fechar o modal.
- **O TMDB é sempre simulado nos testes**, sem chamadas reais.

## 10. Ordem de construção

Cada etapa termina funcionando, testada e com commit.

1. Docker Compose, banco e contas (criar conta, entrar, sair, sessão semanal)
2. Catálogo, busca e modal
3. Listas
4. "Esqueci minha senha" com Mailpit, e acabamento

## 11. Fora do escopo (por enquanto)

Séries, outros streamings, outros países, e-mail real em produção, deploy na VPS, notas e comentários pessoais, compartilhamento de listas.
