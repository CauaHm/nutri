# Rotina & Metas

App de treino, dieta, água e metas — com cadastro de verdade, convites e competição
entre duas pessoas. Cada pessoa cria sua própria conta; convida quem quiser pra
competir (por e-mail); a partir daí os dois acompanham o progresso um do outro.
Totalmente customizável: perfil, metas, refeições, treinos, lista de compras e
receitas são editáveis dentro do próprio app. Inclui um módulo de **Composição
Corporal e Nutrição** (% de gordura, TMB/TDEE, déficit calórico, macros, plano de
refeições calculado e comparação semana a semana), um **comparativo biológico**
entre você e seu parceiro de treino, catálogo de alimentos (cadastro manual ou por
foto com IA) e alertas quando uma meta do dia é batida ou passada.

Construído em Next.js (App Router) + MongoDB (contas, convites, competições) +
Redis/Upstash (dados do dia a dia) pra rodar na Vercel, com navegação de app nativo
(barra inferior + telas que abrem uma sobre a outra, dias de treino reordenáveis por
arrastar) e suporte a "Adicionar à tela de início" (PWA) no celular.

## Rodando local

```bash
npm install
npm run dev
```

Abre em http://localhost:3000. Cria um arquivo `.env.local` (ignorado pelo git) com:

```
MONGODB_URI="sua connection string do MongoDB Atlas"
```

Sem essa variável, contas/convites/competições rodam num "banco" de mentira em
arquivo (`.data/mongo-fallback.json`) só pra dev — não funciona em produção. O
mesmo vale pro Redis: sem `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, os
dados do dia a dia (treino, refeições, água...) caem num arquivo local
(`.data/store.json`). Ambos os fallbacks são só pra testar sem precisar criar conta
em banco nenhum antes.

## Deploy na Vercel

1. Suba este projeto num repositório no GitHub.
2. Em vercel.com, "Add New Project" → importe o repositório. Framework é detectado
   automaticamente como Next.js.
3. Adicione um banco **MongoDB** (contas, convites, competições):
   - Crie grátis em mongodb.com/cloud/atlas → cluster free tier → "Connect" →
     "Drivers" → copie a connection string (troque `<password>` pela senha real e
     inclua o nome do banco antes do `?`, ex: `.../rotina_metas?retryWrites=...`).
   - Cole em Project Settings → Environment Variables como `MONGODB_URI`.
   - Em "Network Access" no Atlas, libere `0.0.0.0/0` (qualquer IP) — a Vercel não
     tem IPs fixos nos planos padrão.
4. Adicione um banco **Redis** (dados do dia a dia):
   - No dashboard do projeto na Vercel: **Storage → Marketplace Database Providers → Upstash**
     (ou vercel.com/marketplace/upstash). Ao conectar, a Vercel já injeta
     `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` automaticamente.
5. (Opcional) Adicione `ANTHROPIC_API_KEY` pra habilitar "tirar foto do alimento e a
   IA calcula a nutrição" (Nutrição → Meus Alimentos → Adicionar). Crie a chave em
   **console.anthropic.com** — **atenção: isso é uma conta de API separada, cobrada
   por uso; o plano Claude Pro do claude.ai não gera essa chave e não cobre esse
   uso.** Sem essa variável, o botão de análise por foto abre o claude.ai num link
   novo com instruções pra colar a foto lá e copiar os valores manualmente.
6. Deploy. Cada pessoa cria sua própria conta (nome, e-mail, senha) e convida quem
   quiser pra competir.

## Instalar como app no celular

Abra o link da Vercel no navegador do celular (Safari no iPhone, Chrome no Android) e
use "Adicionar à Tela de Início" / "Instalar app". Isso cria um ícone que abre em tela
cheia, sem barra de navegador, como um app nativo.

## Estrutura do projeto

```
app/
  page.js                orquestra login/cadastro, navegação, popups
  api/auth/               cadastro, login, logout, editar perfil (sessão por cookie)
  api/invites/            convidar por e-mail, listar e responder convites
  api/competition/        dados da dupla atual (pontos, rodada, sair)
  api/kv/[key]/           API genérica de leitura/escrita no Redis (autorizada por sessão)
  api/food/analyze/      analisa foto de alimento com a API da Anthropic (opcional)
lib/
  repo.js                 acesso ao Mongo: usuários, sessões, convites, competições
  db.js                    conexão Mongo (com fallback em arquivo pra dev sem banco)
  authSession.js           sessão por cookie + regras de quem pode ler/escrever cada chave
  useAuth.js               hook de autenticação no cliente (cadastro/login/logout/perfil)
  useCompetition.js        hook de convites e competição (a dupla)
  useAppData.js            hook central: treino, refeições, água, ranking, recados...
  useBodyComp.js           hook do módulo de Composição Corporal (sexo/altura/idade vêm da conta)
  useFoodCatalog.js        hook do catálogo pessoal de alimentos
  useGoalAlerts.js         dispara o popup quando uma meta do dia é batida/passada
  bodycomp.js              fórmulas de % gordura, TMB/TDEE, déficit, macros, comparação
  points.js                regra de pontos do ranking + soma de kcal/proteína das refeições
components/
  AuthScreen.js            tela de login/cadastro
  screens/                 uma tela por arquivo — telas raiz (bottom nav) e telas empilhadas
  tabs/                    pedaços de UI reaproveitados dentro das telas (ex: RankingTab)
reference/
  ShapeMewtwo.original.jsx   o protótipo original, mantido só de referência
```

Cada usuário tem sua própria conta (e-mail + senha, com sessão por cookie). Dados
pessoais (treino, refeições, água, medidas, composição corporal, catálogo de
alimentos) só o dono lê e escreve — exceto que, quando você tem um parceiro de
competição ativo, ele pode **ler** (nunca escrever) seus dados de refeições/água/
treino/composição, o necessário pro ranking e pro comparativo funcionarem. Dados da
dupla (lista de compras, receitas, recados, pontuação da rodada) são compartilhados
entre os dois membros da competição ativa — ou ficam pessoais, se você ainda não
tem parceiro.

## Customizando

Nome, cor, metas de kcal/água/proteína, sexo/altura/idade, treinos, refeições, lista
de compras e receitas são editáveis dentro do app — não precisa mexer em código.
`lib/defaults.js` só define o estado inicial de uma conta nova (o que aparece na
primeira vez que alguém se cadastra); depois disso, tudo vem do banco.
