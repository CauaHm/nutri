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

Construído em Vite + React + TypeScript (frontend puro, SPA) + Vercel Serverless
Functions em TypeScript (backend) + MongoDB (contas, convites, competições e dados do
dia a dia, tudo no mesmo banco) pra rodar na Vercel, com navegação de app nativo
(barra inferior + telas que abrem uma sobre a outra, dias de treino reordenáveis por
arrastar), instalação como PWA ("Adicionar à tela de início"), funcionamento offline
(fila de sincronização) e notificações push (água, treino, fim de rodada e outras).

## Rodando local

```bash
npm install
npm run dev
```

Abre em http://localhost:5173 (a porta que o Vite escolher). Um plugin do Vite
(`apiDevServer.ts`) intercepta as chamadas pra `/api/*` e roda as funções de
`api/` de verdade nesse mesmo processo — não precisa de `vercel dev`/login na
Vercel pra testar o backend localmente, só existe em dev (nunca roda em
produção). Cria um arquivo `.env.local` (ignorado pelo git) com:

```
MONGODB_URI="sua connection string do MongoDB Atlas"
```

Sem essa variável, tudo (contas/convites/competições e os dados do dia a dia —
treino, refeições, água...) roda num "banco" de mentira em arquivo
(`.data/mongo-fallback.json`) só pra dev — não funciona em produção. Esse fallback é
só pra testar sem precisar criar conta em banco nenhum antes.

Pra testar notificações push localmente, gere um par de chaves VAPID **suas** (nunca
use um par de outra pessoa/projeto):

```bash
npx web-push generate-vapid-keys
```

E adicione ao `.env.local`:

```
VAPID_PUBLIC_KEY="a chave publica gerada acima"
VAPID_PRIVATE_KEY="a chave privada gerada acima"
VAPID_SUBJECT="mailto:seu-email@exemplo.com"
VITE_VAPID_PUBLIC_KEY="a mesma chave publica — o prefixo VITE_ é o que expõe pro código do navegador"
CRON_SECRET="qualquer string aleatória, só pra dev local"
```

Sem `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, os endpoints de push
simplesmente não enviam nada (fica registrado um aviso no console do servidor), sem
quebrar o resto do app.

Pra testar a recuperação de senha ("Esqueceu a senha?" na tela de login) localmente
sem configurar nada, não faz nada especial: sem `RESEND_API_KEY`/`EMAIL_FROM`
configuradas, o link de redefinição só aparece no console do servidor (`npm run dev`)
em vez de virar um e-mail de verdade — copia esse link e cola no navegador. Pra testar
o envio real, crie uma conta grátis em [resend.com](https://resend.com), gere uma API
key e adicione ao `.env.local`:

```
RESEND_API_KEY="a chave gerada no painel da Resend"
EMAIL_FROM="Rotina & Metas <onboarding@resend.dev>"
```

Sem domínio próprio verificado na Resend, `onboarding@resend.dev` só entrega pro
e-mail da conta que criou a API key — o suficiente pra testar. `APP_URL` é opcional
(por padrão o link usa o host da própria requisição, que já funciona certo tanto em
`localhost` quanto em produção).

## Deploy na Vercel

1. Suba este projeto num repositório no GitHub.
2. Em vercel.com, "Add New Project" → importe o repositório. Framework é detectado
   automaticamente como Vite; os arquivos em `api/` viram Serverless Functions
   automaticamente (convenção de arquivo do Vercel, sem configuração extra).
3. Adicione um banco **MongoDB** (contas, convites, competições e os dados do dia a
   dia — treino, refeições, água... — tudo no mesmo banco):
   - Crie grátis em mongodb.com/cloud/atlas → cluster free tier → "Connect" →
     "Drivers" → copie a connection string (troque `<password>` pela senha real e
     inclua o nome do banco antes do `?`, ex: `.../rotina_metas?retryWrites=...`).
   - Cole em Project Settings → Environment Variables como `MONGODB_URI`.
   - Em "Network Access" no Atlas, libere `0.0.0.0/0` (qualquer IP) — a Vercel não
     tem IPs fixos nos planos padrão.
4. (Opcional) Adicione `ANTHROPIC_API_KEY` pra habilitar "tirar foto do alimento e a
   IA calcula a nutrição" (Nutrição → Meus Alimentos → Adicionar). Crie a chave em
   **console.anthropic.com** — **atenção: isso é uma conta de API separada, cobrada
   por uso; o plano Claude Pro do claude.ai não gera essa chave e não cobre esse
   uso.** Sem essa variável, o botão de análise por foto abre o claude.ai num link
   novo com instruções pra colar a foto lá e copiar os valores manualmente.
5. (Opcional) Ative **notificações push** (água, treino, fim de rodada e mais):
   - Gere seu próprio par de chaves VAPID rodando `npx web-push generate-vapid-keys`
     na sua máquina (nunca reaproveite um par de outro projeto/tutorial).
   - Em Project Settings → Environment Variables, adicione `VAPID_PUBLIC_KEY`,
     `VAPID_PRIVATE_KEY` (as duas chaves geradas acima) e `VAPID_SUBJECT` (um
     `mailto:seu-email@exemplo.com`).
   - Adicione também `VITE_VAPID_PUBLIC_KEY` com a **mesma** chave pública acima — o
     prefixo `VITE_` é o que expõe essa variável pro código que roda no navegador
     (a chave privada nunca leva esse prefixo, fica só no servidor).
   - Adicione `CRON_SECRET` com uma string aleatória longa (ex: gerada por
     `openssl rand -hex 32`) — protege o endpoint de lembretes contra chamadas de
     qualquer um.
   - O plano Hobby da Vercel só permite 1 execução de cron agendado por dia, o que
     inviabiliza lembretes horários — por isso os lembretes usam um cron **externo**
     em vez do `vercel.json`. Em [cron-job.org](https://cron-job.org) (grátis), crie
     um job que faça `GET` a cada hora em
     `https://seu-projeto.vercel.app/api/cron/reminders` com o header
     `Authorization: Bearer <o mesmo valor de CRON_SECRET>`.
   - Sem essas variáveis configuradas, o app funciona normalmente — só não envia
     notificações (fica registrado um aviso no log do servidor).
6. (Opcional, mas recomendado) Ative o **envio de e-mail de recuperação de senha**
   ("Esqueceu a senha?" na tela de login):
   - Crie uma conta grátis em [resend.com](https://resend.com) (free tier: 3.000
     e-mails/mês) e gere uma API key em API Keys → Create API Key.
   - Em Project Settings → Environment Variables, adicione `RESEND_API_KEY` com a
     chave gerada.
   - Adicione também `EMAIL_FROM`. Sem verificar um domínio próprio na Resend, use
     `EMAIL_FROM="Rotina & Metas <onboarding@resend.dev>"` — funciona de graça, mas só
     entrega pro e-mail que criou a conta na Resend. Pra mandar pra qualquer pessoa,
     verifique um domínio próprio (Domains → Add Domain na Resend) e use um endereço
     desse domínio.
   - Sem essas variáveis configuradas, o link de redefinição não é enviado por
     e-mail — fica só registrado no log da função (`Deployments` → a função →
     `Logs`), então em produção sem isso configurado ninguém consegue recuperar a
     própria senha sozinho.
7. Deploy. Cada pessoa cria sua própria conta (nome, e-mail, senha) e convida quem
   quiser pra competir.

## Instalar como app no celular

Abra o link da Vercel no navegador do celular (Safari no iPhone, Chrome no Android) e
use "Adicionar à Tela de Início" / "Instalar app". Isso cria um ícone que abre em tela
cheia, sem barra de navegador, como um app nativo.

## Estrutura do projeto

```
index.html                Vite entry HTML (meta tags, manifest, ícones)
src/
  main.tsx                 monta <App/> no #root
  App.tsx                  orquestra login/cadastro, navegação, popups (ex-app/page.js)
  globals.css              estilos globais
  lib/
    useAuth.ts               hook de autenticação no cliente (cadastro/login/logout/perfil)
    useCompetition.ts        hook de convites e competição (a dupla)
    useAppData.ts            hook central: treino, refeições, água, ranking, recados...
    useBodyComp.ts           hook do módulo de Composição Corporal (sexo/altura/idade vêm da conta)
    useFoodCatalog.ts        hook do catálogo pessoal de alimentos
    useGoalAlerts.ts         dispara o popup quando uma meta do dia é batida/passada
    bodycomp.ts              fórmulas de % gordura, TMB/TDEE, déficit, macros, comparação
    points.ts                regra de pontos do ranking + soma de kcal/proteína das refeições
    clientStorage.ts         fetch fino sobre /api/kv/*
    notificacoes.ts          tipos/config de notificações push + mergeNotificacoes (fallback pra contas antigas)
    usePushNotifications.ts  permissão, subscribe/unsubscribe do lado do navegador
  components/
    AuthScreen.tsx           tela de login/cadastro
    screens/                 uma tela por arquivo — telas raiz (bottom nav) e telas empilhadas
    tabs/                    pedaços de UI reaproveitados dentro das telas (ex: RankingTab)
api/                       Vercel Serverless Functions (TypeScript) — cada arquivo é uma rota
  auth/                     cadastro, login, logout, editar perfil (sessão por cookie)
  invites/                  convidar por e-mail, listar e responder convites
  competition.ts            dados da dupla atual (pontos, rodada, sair)
  kv/                       API genérica de leitura/escrita no Mongo (autorizada por sessão)
  push/                     subscribe/unsubscribe/prefs/notify — notificações push
  cron/reminders.ts         lembretes agendados (água, treino...), chamado por cron externo
  food/analyze.ts           analisa foto de alimento com a API da Anthropic (opcional)
  _lib/                     código server-only (prefixo _ pra Vercel não tratar como rota)
    repo.ts                  acesso ao Mongo: usuários, sessões, convites, competições
    db.ts                    conexão Mongo (com fallback em arquivo pra dev sem banco)
    store.ts                 dados do dia a dia (treino, refeições, água...), mesma conexão Mongo de db.ts
    authSession.ts           sessão por cookie + regras de quem pode ler/escrever cada chave
    push.ts                  envio de push com as regras de anti-spam (quiet hours, teto diário, debounce)
    notificacoes.ts          tipos/config de notificações push (espelha src/lib/notificacoes.ts)
    tempoLocal.ts            hora/data local de São Paulo (funções da Vercel rodam em UTC)
public/                    ícones, manifest.json (servido como está pelo Vite)
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
