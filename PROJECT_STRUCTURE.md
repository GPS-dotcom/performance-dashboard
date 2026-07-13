# PROJECT_STRUCTURE.md

> Documentação da arquitetura do repositório `GPS-dotcom/performance-dashboard`.
> Gerado por leitura direta do código-fonte versionado. Onde o comportamento depende de
> algo que **não está neste repositório** (ex.: a Edge Function do Supabase), isso é dito
> explicitamente — não foi inventado nada.

---

## 1. Estrutura completa das pastas

O repositório é propositalmente minimalista. Não há `src/`, não há `package.json`, não há
pasta de build. É literalmente um único arquivo HTML autocontido:

```
performance-dashboard/
├── README.md          # 1 linha: "# performance-dashboard"
└── index.html         # App inteiro: HTML + CSS + React (JSX via Babel in-browser)
```

Não existem (verificado no histórico do git inteiro, não só no working tree):
- `package.json` / `node_modules` / lockfiles
- Pasta `supabase/` (migrations, `functions/`, config) — as Edge Functions e o schema do
  banco não estão versionados aqui, vivem só no projeto Supabase (dashboard)
- Configuração de build (`vite.config.*`, `next.config.*`, `webpack.config.*`)
- Pipeline de CI/CD (`.github/workflows/`), `vercel.json`, `netlify.toml`
- Testes automatizados

Ou seja: o **deploy** deste projeto é servir o `index.html` como arquivo estático (GitHub
Pages, Netlify "static site" sem build step, S3, ou até abrir localmente) — não há nenhum
passo de build necessário.

---

## 2. Framework utilizado

**Nenhum dos três (Next.js, Vite) é usado.** É React "puro", sem bundler:

- **Não é Next.js** — não há roteamento de arquivos, SSR, API routes (`pages/api`,
  `app/api`) nem `next.config.js`.
- **Não é Vite** — não há dev server, HMR, nem `vite.config.js`.
- **É React 18**, carregado via `<script>` de CDN (build UMD, produção), com **Babel
  Standalone** transpilando JSX diretamente no navegador em runtime:

```html
<!-- index.html:7-10 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

O JSX fica dentro de `<script type="text/babel">` (`index.html:164`) e é compilado pelo
Babel no próprio navegador a cada carregamento da página — não há passo de build offline,
o que também significa que **cada visita recompila o JSX no cliente** (aceitável pelo
tamanho pequeno do app, mas é mais lento que um bundle pré-compilado).

---

## 3. Bibliotecas principais

Todas carregadas via CDN, sem gerenciador de pacotes:

| Biblioteca | Versão | Uso |
|---|---|---|
| React / ReactDOM | 18.3.1 (UMD) | UI, todo o app é um componente `App` com sub-páginas |
| Babel Standalone | 7.23.5 | Transpila JSX (`text/babel`) em runtime no browser |
| `@supabase/supabase-js` | `@2` (sempre a última v2, sem pin de patch) | Cliente do Supabase — leitura das tabelas |
| Chart.js | 4.4.1 (UMD) | Gráficos de barra empilhada e donut (aba "Distribuição de FC") |
| Google Fonts | Inter (300–900) e DM Mono (400/500) | Tipografia |

Não há biblioteca de roteamento (a navegação entre abas é `useState` local, não URL),
nem gerenciador de estado externo (Redux/Zustand) — tudo é `useState`/`useMemo`/`useEffect`
do próprio React.

Gráficos de linha (fitness/PMC) são um componente SVG customizado (`MiniLineChart`,
`index.html:456-491`) escrito à mão, sem dependência — só os gráficos de barra
empilhada/donut usam Chart.js (`ChartCanvas`, `index.html:496-507`).

---

## 4. Como o Supabase está conectado

O cliente é criado direto no HTML, com credenciais hardcoded (`index.html:169-171`):

```js
const SUPABASE_URL = "https://wmkfhvnwpvcsiwaxjefs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs..."; // chave anon (pública)
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Isso é usado de **duas formas diferentes**:

1. **Leitura de dados (PostgREST automático do Supabase)** — via `sb.from(...).select(...)`,
   em `loadData()` (`index.html:1202-1209`). É a API REST que o Supabase gera
   automaticamente em cima do Postgres.
2. **Chamada de uma Edge Function** — via `fetch` puro (não usa `sb.functions.invoke`) para
   `${SUPABASE_URL}/functions/v1/clever-api`, autenticado com a mesma anon key como Bearer
   token (`index.html:1217-1234`).

Pontos importantes sobre segurança/arquitetura:
- A **anon key é pública por design** no modelo do Supabase (é enviada ao navegador de
  qualquer app cliente) — a proteção real dos dados depende inteiramente das **Row Level
  Security (RLS) policies** configuradas no projeto Supabase. Essas policies **não estão
  neste repositório** (são configuração do próprio projeto Supabase, gerenciada fora do
  git), então não é possível confirmar por aqui se o `SELECT` está de fato restrito a leitura
  pública ou se há alguma regra adicional.
- O app **não usa `supabase.auth`** em nenhum lugar — não há login de usuário via Supabase
  Auth (ver seção 10).

---

## 5. Como o Strava está conectado

**A integração com o Strava não está no frontend/neste repositório.** O `index.html` nunca
chama a API do Strava diretamente nem lida com OAuth do Strava. Tudo que existe no código
cliente é uma referência, via comentários, a uma Edge Function do Supabase que faz esse
trabalho do lado do servidor:

> `index.html:1215-1216`
> ```
> // Dispara a Edge Function (clever-api/sync-strava) que puxa as atividades novas
> // do Strava e recalcula PMC/zonas, depois recarrega os dados do Supabase.
> ```

Ou seja: a Edge Function chamada `clever-api` (também referida nos comentários como
`sync-strava`) é quem:
- guarda/renova o token OAuth do Strava (fluxo de autorização, refresh token) — **fora
  deste repositório**, gerenciada no projeto Supabase (Edge Functions);
- chama a API do Strava (`/athlete/activities`, streams, best efforts, zonas do atleta);
- grava os resultados nas tabelas do Postgres do Supabase.

**Não é possível documentar o fluxo exato de OAuth do Strava (client id/secret, scopes,
redirect URI, onde o token fica armazenado) a partir deste repositório**, porque o código
dessa Edge Function não está versionado aqui. Só o que os comentários do frontend deixam
claro sobre o que ela calcula é documentado na seção 6.

---

## 6. Como ocorre a sincronização das atividades

Fluxo disparado pelo botão **"⟳ Atualizar treinos"** no cabeçalho (`index.html:1263-1265`),
função `handleSync()` (`index.html:1217-1234`):

1. Usuário clica no botão → `setSyncing(true)`.
2. Frontend faz `POST` para `${SUPABASE_URL}/functions/v1/clever-api`, sem corpo,
   autenticado com a anon key (`Authorization: Bearer <SUPABASE_ANON_KEY>`).
3. **(fora deste repo)** A Edge Function `clever-api`/`sync-strava`:
   - busca atividades novas do Strava;
   - baixa os *streams* (segundo a segundo) para calcular `zone_minutes` real por zona
     de FC/potência, em vez de usar só a média do treino inteiro (comentário em
     `index.html:203-207`);
   - calcula `rtss` (relative TSS) de cada atividade;
   - extrai `best_efforts` nativos do Strava (5K/10K/15K/10mi/20K/Meia) — usados depois
     na aba Predictions (comentário em `index.html:339-346`);
   - recalcula o PMC (Performance Management Chart: CTL/ATL/TSB) a partir do *Relative
     Effort* real do Strava — CTL vem do Relative Effort de cada atividade, ATL/TSB
     calculados por decaimento exponencial estilo Banister (ver `index.html:1121`, e
     commit `8101d1f` "Fitness: CTL vem do Relative Effort real do Strava, ATL/TSB
     calculados");
   - grava/atualiza as tabelas `strava_activities` e `daily_pmc` no Postgres.
4. Se a resposta HTTP não for `ok` ou vier `{ ok: false }`, o frontend guarda o erro em
   `syncError` e mostra "Erro ao sincronizar: ..." (`index.html:1266-1267`).
5. Em caso de sucesso, o frontend chama `loadData()` de novo — re-consultando
   `strava_activities` e `daily_pmc` direto do Supabase — e atualiza `lastSynced` com o
   horário atual (`index.html:1227-1228`), mostrado como "Sincronizado às HH:MM".

Não há sincronização automática/periódica no cliente (sem `setInterval`, sem cron no
frontend) — a sincronização só acontece por ação manual do usuário clicando no botão. Se
existe algum cron/schedule disparando a Edge Function automaticamente, isso também estaria
configurado no projeto Supabase, fora deste repositório.

---

## 7. Todas as tabelas existentes no Supabase

O frontend só lê **duas tabelas**, ambas via `sb.from(<tabela>).select("*")` em
`loadData()` (`index.html:1202-1209`). Como a leitura é `select("*")`, as colunas abaixo
são apenas as que o **código do frontend efetivamente usa** (podem existir outras colunas
na tabela real não referenciadas aqui, e podem existir outras tabelas usadas só pela Edge
Function, ex. armazenamento de token OAuth do Strava — nada disso é visível a partir deste
repositório).

### `strava_activities`
Consultada ordenada por `start_date` desc, limitada a 200 registros.

| Coluna usada no código | Tipo inferido | Onde é usada |
|---|---|---|
| `id` | identificador da atividade | key de lista (`index.html:748`) |
| `name` | texto | título da atividade |
| `type` | texto | busca/filtro (`index.html:628`) |
| `start_date` | timestamp ISO | data, ordenação, comparação de período |
| `distance_m` | número (metros) | distância, cálculo de pace |
| `moving_time_s` | número (segundos) | duração, cálculo de pace |
| `average_heartrate` | número (bpm) | FC média, classificação de zona |
| `average_watts` | número (W) | potência média (fallback) |
| `weighted_average_watts` | número (W) | potência média (preferencial) |
| `suffer_score` | número | "Esforço (Strava)" na Visão Geral |
| `rtss` | número | relative TSS, usado em PMC/comparações |
| `zone_minutes` | objeto `{Z1..Z5: minutos}` | distribuição real de tempo por zona (calculada dos streams pela Edge Function) |
| `best_efforts` | objeto `{5k, 10k, 15k, 10mile, 20k, half_marathon: segundos}` | aba Predictions |

### `daily_pmc`
Consultada ordenada por `date` asc (histórico completo, sem limite).

| Coluna usada no código | Tipo inferido | Onde é usada |
|---|---|---|
| `date` | data (`YYYY-MM-DD`) | eixo X dos gráficos de fitness |
| `ctl` | número | Fitness (Chronic Training Load) |
| `atl` | número | Fadiga (Acute Training Load) |
| `tsb` | número | Forma (Training Stress Balance = CTL − ATL) |

Não há mais nenhuma tabela referenciada no código-fonte deste repositório.

---

## 8. Todas as APIs existentes

Não existe backend próprio (sem Express/Fastify/Next API routes) neste repositório. As
únicas chamadas de rede feitas pelo `index.html` são:

1. **Supabase PostgREST (API REST automática)** — via `supabase-js`:
   - `GET` implícito em `strava_activities` (`sb.from("strava_activities").select("*")…`)
   - `GET` implícito em `daily_pmc` (`sb.from("daily_pmc").select("*")…`)
   - Ambas só leitura (`select`); o app nunca faz `insert`/`update`/`delete` no Supabase.
2. **Supabase Edge Function `clever-api`** (apelidada de `sync-strava` nos comentários):
   - `POST {SUPABASE_URL}/functions/v1/clever-api`
   - Único parâmetro de auth: header `Authorization: Bearer <anon key>`
   - Sem corpo de requisição
   - Resposta esperada: JSON com `{ ok: boolean, error?: string }`
   - É o único ponto de entrada que aciona a integração com o Strava — o código dessa
     função não está neste repositório.
3. CDNs externos (não são "APIs" de dados, só entrega de assets estáticos): cdnjs.cloudflare.com
   (React, ReactDOM, Babel, Chart.js), jsdelivr.net (`supabase-js`), fonts.googleapis.com.

Nenhuma outra rota/API existe no projeto versionado.

---

## 9. Componentes do Dashboard

Todos definidos dentro do mesmo `<script type="text/babel">` em `index.html`:

**Componentes de apoio/reutilizáveis**
- `Kpi` (`:510`) — card de KPI (label, valor, unidade, delta com seta ▲/▼)
- `ZoneTimeRow` (`:520`) — barra horizontal de distribuição de tempo por zona (Z1–Z5)
- `SegmentFields` (`:542`) — inputs de aquecimento/desaquecimento (modo tempo/distância + pace) usados no formulário de treino planejado
- `MiniLineChart` (`:456`) — gráfico de linha SVG customizado (sem lib externa), usado para CTL/ATL/TSB
- `ChartCanvas` (`:496`) — wrapper fino sobre Chart.js, cria/destrói a instância a cada mudança de dados (usado para barra empilhada e donut)

**Páginas (uma por aba)** — registradas no array `PAGES` (`index.html:1178-1183`):

| Aba (label) | Componente | Conteúdo |
|---|---|---|
| Resumo | `PageResumo` (`:581`) | KPIs de 7 dias (volume, atividades, CTL/TSB, % Z3), card do último treino com análise de execução vs. planejado, tabela ordenável/pesquisável das atividades recentes |
| Distribuição de FC | `PageFrequencia` (`:768`) | Tabela de definição de zonas, gráfico de barra empilhada (zona × semana) e donut (total por zona), últimas 8 semanas |
| Predictions | `PagePredictions` (`:1092`) | KPIs de predição de prova (5K/10K/Meia/Maratona) a partir de best efforts reais + extrapolação de Riegel, gráfico de CTL/ATL/TSB dos últimos 90 dias, tabela de âncoras fisiológicas manuais |
| Training Log | `PageTrainingLog` (`:862`) | Calendário de treinos planejados (16 semanas, `WEEKS`), formulário de criação/edição de treino (simples ou intervalado com WU/Série/CD), projeção de CTL/ATL/TSB até o race day |

**Componente raiz**
- `App` (`:1185`) — estado global (`activities`, `pmc`, `plannedWorkouts`, controle de
  sync/loading/erro), busca inicial de dados, renderiza header + navegação por abas +
  página ativa. Montado com `ReactDOM.createRoot(...).render(<App/>)` (`:1287`).

---

## 10. Fluxo completo de autenticação

**Não existe autenticação de usuário neste app.** Pontos que confirmam isso no código:

- Nenhuma chamada a `sb.auth.*` (sem `signIn`, `signUp`, `onAuthStateChange`, sessão, etc.)
- Nenhuma tela de login, nenhum estado de "usuário logado"
- O app carrega e já busca os dados direto (`useEffect` em `:1211-1213`) assim que monta,
  sem checar identidade nenhuma

O "controle de acesso" que existe é inteiramente baseado em:
1. Quem tem a URL do `index.html` hospedado consegue ver o dashboard.
2. A chave anon do Supabase está **hardcoded e visível no HTML** (`view-source:` mostra
   ela em texto puro) — qualquer pessoa com a URL/arquivo consegue extrair essa chave e
   fazer requisições diretas ao Supabase com ela.
3. A proteção real dos dados (o que a chave anon consegue ler/escrever) depende das regras
   de **Row Level Security** configuradas no projeto Supabase — que **não estão neste
   repositório** e não puderam ser inspecionadas a partir do código-fonte versionado aqui.

Resumindo: é um app single-tenant/pessoal, feito para o autor logar as próprias atividades
de treino — não há multiusuário, não há sessão, não há "login".

---

## 11. Fluxo completo desde o login até uma atividade aparecer na tela

Como não há login, o fluxo real é "abrir a página até ver a atividade":

1. **Carregamento do HTML** — o navegador baixa `index.html` (arquivo estático, sem
   servidor de aplicação). `<div id="root">Carregando...</div>` aparece imediatamente
   (`:154`).
2. **Carregamento dos scripts CDN** — React, ReactDOM, Babel Standalone, `supabase-js`,
   Chart.js e as fontes do Google são baixados (`:7-13`).
3. **Transpilação em runtime** — o Babel Standalone compila o bloco `<script
   type="text/babel">` (JSX → JS) diretamente no navegador.
4. **Criação do cliente Supabase** — `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`
   (`:171`), usando as credenciais hardcoded no próprio HTML.
5. **Montagem do React** — `ReactDOM.createRoot(...).render(<App/>)` (`:1287`) substitui o
   "Carregando..." pelo componente `App`.
6. **Estado inicial** — `App` inicializa `loading = true`, `activities = []`, `pmc = []`,
   e lê `plannedWorkouts` do `localStorage` (`:1191-1193`).
7. **Busca inicial de dados** — o `useEffect` (`:1211-1213`) chama `loadData()`:
   - `sb.from("strava_activities").select("*").order("start_date", {ascending:false}).limit(200)`
   - `sb.from("daily_pmc").select("*").order("date", {ascending:true})`
   - Essas chamadas vão para a API REST (PostgREST) do Supabase, autenticadas com a anon
     key, e retornam o que as RLS policies do projeto permitirem ao papel `anon`.
8. **Atualização de estado** — `setActivities(acts)` e `setPmc(pmcData)`, depois
   `setLoading(false)` (`:1207-1212`). Se der erro na query, cai em `setError(...)` e a
   tela mostra "Erro ao carregar dados: ..." (`:1242-1244`) em vez do dashboard.
9. **Primeira renderização com dados reais** — com `loading=false` e sem erro, a página
   ativa por padrão é `"resumo"` (`PageResumo`). Dentro dela, `const last = activities[0]`
   (`:585`) pega a atividade mais recente (já vem ordenada por `start_date` desc do
   passo 7) e renderiza o card "Session log" com nome, data, distância, duração, pace,
   FC média, potência e esforço — **é neste momento que a atividade aparece na tela**.
10. **Atualizar com uma atividade nova do Strava** — se a atividade ainda não estiver no
    Supabase (recém-feita no Strava e ainda não sincronizada), o usuário clica em
    "⟳ Atualizar treinos" → dispara `handleSync()` (seção 6) → a Edge Function externa
    busca no Strava, grava no Supabase → o frontend chama `loadData()` de novo → a nova
    atividade entra em `activities[0]` → `PageResumo` re-renderiza e a atividade nova
    aparece.

Em resumo, o "login" desse fluxo é, na prática, **abrir a URL** — a partir daí é leitura
pública (via anon key) do Supabase, sem nenhuma etapa de autenticação de usuário.
