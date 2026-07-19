# PERFORMANCE_REPORT.md

**Escopo:** `treino-z2/` (o app real). Auditoria completa de performance cobrindo queries, renderização, cache, memoização, lazy loading, bundle size e API calls, com otimizações implementadas e medidas — não apenas recomendadas.

**Metodologia:** todo número "antes/depois" neste relatório foi medido de verdade nesta sessão (`npm run build`, `npx vitest run --coverage`, `EXPLAIN ANALYZE` local), não estimado. Onde uma medição de produção não é possível (não há acesso ao Supabase de produção neste sandbox — ver `PROJECT_AUDIT.md`), o relatório usa uma reprodução local equivalente e diz isso explicitamente, em vez de apresentar uma estimativa como se fosse um número real.

Toda mudança abaixo passa na suíte completa: **306/306 testes**, `tsc -b` limpo, `oxlint` limpo, thresholds de cobertura do `TESTING.md` mantidos (services/api 100%, engines/hooks/utils ≥90%, components ≥80%).

---

## Resumo dos ganhos

| Área | Antes | Depois | Ganho |
|---|---|---|---|
| Bundle JS (raw) | 420.64 kB, 1 chunk | 230.63 kB, 2 chunks | **-45.2%** |
| Bundle JS (gzip) | 120.62 kB | 73.12 kB | **-39.4%** |
| Módulos no bundle | 115 | 74 | -41 módulos |
| `strava_activities` query (local) | Seq Scan + Sort, 0.53 ms | Index Scan, sem sort, 0.09 ms | **-83%** |
| `goals` query (local) | Seq Scan + Filter + Sort, 0.057 ms | Index Scan, filtro no índice, 0.020 ms | **-65%** |
| `daily_pmc` linhas por carga | ilimitado (cresce para sempre) | limitado a 400 dias | bound explícito |
| Cálculo de tendência do ATL | 2x por carga (regressão duplicada) | 1x por carga | -50% nessa computação |
| Primeira renderização após reload | sempre em branco até 3 fetches resolverem | instantânea com dado em cache (sessionStorage), quando existe | perceptível, não medido em ms |
| Fonte Google (Inter) | bloqueia o primeiro paint | não bloqueia (preload + swap) | 1 round-trip a menos antes do paint |

---

## 1. Bundle size

### Achado
`api/supabaseClient.ts` importava `createClient` de `@supabase/supabase-js`, o pacote "guarda-chuva" que inicializa **GoTrueClient (auth)** e **RealtimeClient (websockets)** incondicionalmente dentro do construtor — mesmo esse app nunca chamando `.auth.*`, `.channel()`, `.storage.*` ou `.rpc()` em lugar nenhum (confirmado por grep em todo `src/`, único uso é `.from(table)...`).

Confirmado no bundle minificado antes da mudança:
```
$ grep -o "GoTrueClient\|RealtimeClient" dist/assets/*.js | sort | uniq -c
      3 GoTrueClient
      2 RealtimeClient
```

### Otimização
Troca para `@supabase/postgrest-js`'s `PostgrestClient` diretamente — o mesmo query builder que `supabase.from(...)` delega internamente, documentado no próprio pacote como "Standalone import for bundle-sensitive environments". Reproduz manualmente a URL (`/rest/v1`) e os headers (`apikey` + `Authorization: Bearer`) que `createClient` monta por baixo, então o comportamento de rede é idêntico — só o código morto (auth/realtime/storage/functions) sai do bundle. `@supabase/supabase-js` e seus 6 pacotes transitivos (auth-js, realtime-js, storage-js, functions-js, phoenix) saíram de `package.json`.

Além disso, `vite.config.ts` ganhou `manualChunks` separando vendor (`react`, `react-dom`, `@supabase/postgrest-js`) do código do app: deploys que só tocam código do app (a maioria) deixam o navegador reaproveitar o chunk vendor já em cache, em vez de invalidar tudo.

### Medição
```
Antes:  dist/assets/index-*.js   420.64 kB │ gzip: 120.62 kB   (115 módulos, 1 chunk)
Depois: dist/assets/vendor-*.js  204.77 kB │ gzip:  64.04 kB
        dist/assets/index-*.js    25.86 kB │ gzip:   9.08 kB   (74 módulos, 2 chunks)
        total:                   230.63 kB │ gzip:  73.12 kB
```
**-45.2% raw, -39.4% gzip**, medido com `npm run build` antes e depois da troca, mesmo código de aplicação.

Arquivos: `treino-z2/src/api/supabaseClient.ts`, `treino-z2/vite.config.ts`, `treino-z2/package.json`.

---

## 2. Queries

### Achado 1 — `select("*")` em vez de colunas explícitas
`fetchRecentActivities` e `fetchMetricsHistory` (`services/activityService.ts`) usavam `select("*")`, mas `mapActivityRow`/`mapSnapshotRow` só leem 11 e 4 campos respectivamente. `strava_activities`/`daily_pmc` são tabelas legadas nunca versionadas em migration (`PROJECT_AUDIT.md`: "schema implícito, nunca versionado neste repo") — o schema completo de produção é desconhecido, o que torna `select("*")` uma aposta em bytes que o app nunca olha. A edge function que popula essas tabelas deriva os dados de streams por segundo do Strava (`PROJECT_AUDIT.md`), o que torna plausível colunas bem além dessas 11.

### Achado 2 — `fetchMetricsHistory` sem limite (crescimento ilimitado)
```ts
// antes
.from("daily_pmc").select("*").order("date", { ascending: true })
```
Sem `.limit()` nem filtro de data: a query — e o payload retornado — crescem linearmente com a idade da conta, para sempre. Corrigido com uma janela de 400 dias.

**Detalhe de correção importante:** a query é ordenada `ascending: true` (mais antigo primeiro). Um `.limit(400)` ingênuo aqui retornaria os **400 dias mais antigos** da conta, não os mais recentes — um bug real, não só uma questão de performance. A correção certa é um filtro de data (`.gte("date", cutoff)`), não um limite de linhas.

Os 400 dias cobrem um ciclo anual de periodização completo (base/build/peak/taper/off-season), que é exatamente o que `calculateFitnessScore` documenta precisar para normalizar CTL contra "o range recente do próprio atleta" — bem além dos 14 dias onde a confiança desse cálculo já satura, e bem além da maior janela que qualquer cálculo do Intelligence Engine usa aqui (`detectTrend` satura confiança em 14 pontos; `detectPlateau` só olha os últimos 6).

### Achado 3 — sem índices nas duas colunas realmente consultadas
Nenhuma migration deste repo jamais tocou `strava_activities`/`daily_pmc` (só as menciona em comentários, de propósito — "purely additive, does not touch..."). Isso significa que também nunca foi adicionado nenhum índice nas colunas usadas em `ORDER BY`/`WHERE`.

### Otimizações
- `STRAVA_ACTIVITY_COLUMNS`/`DAILY_PMC_COLUMNS`: seleção explícita nas duas queries.
- `fetchMetricsHistory(windowDays = 400)`: filtro `.gte("date", cutoff)` em vez de tabela inteira.
- `supabase/migrations/0009_query_indexes.sql` (nova, aditiva, com `IF NOT EXISTS`):
  - `strava_activities (start_date desc)` — casa com `ORDER BY start_date DESC LIMIT 200`.
  - `daily_pmc (date)` — casa com `WHERE date >= $cutoff ORDER BY date ASC`.
  - `goals (status, target_date)` — casa com a query de `fetchUpcomingGoal` (`WHERE status='active' AND target_date >= today ORDER BY target_date LIMIT 1`); o índice existente `goals_athlete_idx (athlete_id, status)` não cobre esse padrão porque a query não filtra por `athlete_id` (deployment single-athlete, confirmado em `PROJECT_AUDIT.md`).

### Medição (reprodução local — sem acesso ao banco de produção)
Verificado contra PostgreSQL 16 local com tabelas reproduzindo as colunas conhecidas e volume realista (2000 atividades / ~2025 dias de `daily_pmc` / 50 goals, cobrindo 5.5 anos):

```
ANTES — strava_activities ORDER BY start_date DESC LIMIT 200:
  Seq Scan on strava_activities (actual rows=2000) -> Sort (top-N heapsort)
  Execution Time: 0.527 ms

DEPOIS — mesma query, com o índice:
  Index Scan using strava_activities_start_date_idx (actual rows=200)
  Execution Time: 0.089 ms   (-83%, e sem etapa de Sort)

ANTES — goals WHERE status='active' AND target_date >= today ORDER BY target_date LIMIT 1:
  Seq Scan on goals -> Filter -> Sort
  Execution Time: 0.057 ms

DEPOIS — mesma query, com o índice:
  Index Scan using goals_status_target_date_idx (filtro dentro do índice)
  Execution Time: 0.020 ms   (-65%)
```

Honestidade sobre o terceiro índice: no repro local, `daily_pmc.date` já era a PRIMARY KEY (então já usava Index Scan antes e depois). Como o schema real é desconhecido/não versionado, não dá para confirmar se `daily_pmc.date` já é indexado em produção — o índice foi adicionado de forma defensiva (`IF NOT EXISTS`, custo mínimo se já redundante) em vez de assumir que sim.

**O ganho real e mais importante não é o valor absoluto em milissegundos** (a tabela do repro tem só 2000 linhas) **— é que o plano ANTES é O(n log n) por causa do Sort, e cresce a cada atividade nova importada; o plano DEPOIS é O(log n + k)** (k = LIMIT), e fica rápido independente de quantos anos de histórico o atleta acumular.

Arquivos: `treino-z2/src/services/activityService.ts`, `supabase/migrations/0009_query_indexes.sql`.

---

## 3. Memoização

### Achado
Em `assembleDailyBrief.ts`, `atlSeries` passava por `detectTrend` (sort + regressão linear) **duas vezes** a cada chamada:
1. Dentro de `rawDirection("ATL", atlSeries)`, que internamente chamava `detectTrend(name, series, "higher_is_better")` só para extrair o sinal bruto da inclinação.
2. Diretamente em `detectTrend("Fatigue (ATL)", atlSeries, "lower_is_better")`, para construir o Insight que entra em `insights[]`.

A regressão em si (`slope`, `rSquared`) não depende da polaridade — só o rótulo final (`"improving"`/`"declining"`) depende. Isso significa recalcular o mesmo sort + regressão sobre o mesmo array duas vezes por carga, com custo que cresce com o tamanho de `metricsHistory` (agora limitado a 400 pontos pela otimização de query acima, mas ainda um trabalho redundante genuíno).

### Otimização
`rawDirectionFromTrend(trend, polarity)`: em vez de rodar `detectTrend` de novo, inverte algebricamente a regra de rotulagem do próprio `detectTrend`:

```
direction = (polarity === "higher_is_better") === rising ? "improving" : "declining"
```

Dado `direction` e `polarity` (ambos já conhecidos), resolve para `rising` sem tocar a regressão de novo. `atlTrendInsight` agora é calculado uma única vez (com `"lower_is_better"`, a polaridade que o Insight precisa) e `atlTrend` é derivado dele algebricamente.

### Prova de equivalência
Em vez de confiar só em "os testes existentes continuam passando", `rawDirectionFromTrend.test.ts` compara a saída do caminho rápido contra uma segunda chamada independente de `detectTrend("higher_is_better")` (o comportamento antigo) em 7 cenários (série subindo/descendo × cada polaridade, série plana, dados insuficientes) — todos idênticos.

`recoveryScoreTrend` continua chamando `detectTrend` normalmente: nada mais no código computa tendência sobre `recoveryScoreSeries`, então ali não havia duplicação para eliminar.

Arquivos: `treino-z2/src/hooks/assembleDailyBrief.ts`, `treino-z2/src/hooks/__tests__/rawDirectionFromTrend.test.ts`.

---

## 4. Renderização

### Auditoria (sem "achado" forçado)
Tracejado o caminho de renderização inteiro: `App` → `DailyBriefPage` → 8 seções + `AlertBanner`. Não existe roteador, não existe polling, não existe estado interativo dentro da view "ready" (nenhuma seção tem input do usuário hoje). `DailyBriefPage` só re-renderiza quando `useDailyBrief()`'s `state` muda — e isso só acontece em duas transições genuínas: carga inicial e `retry()`. Em ambas, os dados realmente mudam (não é um re-render "desperdiçado" que `React.memo` evitaria).

Nenhum componente usava `React.memo`/`useMemo`/`useCallback` (exceto `retry`, que já usa `useCallback`). Considerei envolver as 8 seções em `React.memo` só por precaução, mas decidi não fazer isso: como o pai nunca re-renderiza sem que os dados realmente tenham mudado, `memo` nunca evitaria um render real aqui — seria custo (comparação rasa de props a cada render) sem benefício mensurável, puro teatro de otimização. Não fica no código como uma abstração sem uso demonstrado.

**Conclusão honesta:** não há re-render desperdiçado para eliminar nesta versão do app. Verificado, não assumido — daí não constar como "otimização" na tabela de resumo com um número ao lado.

### Achado real, adjacente a renderização — fonte bloqueando o primeiro paint
`index.html` carregava a stylesheet do Google Fonts (Inter) via `<link rel="stylesheet">` síncrono. Isso bloqueia o primeiro paint em um round-trip de rede extra (buscar o CSS) antes do navegador poder desenhar qualquer texto, mesmo com `&display=swap` já evitando o bloqueio pelo arquivo da fonte em si.

**Otimização:** troca para o padrão `rel="preload" as="style" onload="this.rel='stylesheet'"` com fallback `<noscript>` — a página pinta imediatamente com a fonte de fallback do sistema (`--font-family` já lista uma) e troca para Inter assim que ela chega, sem bloquear nada.

Arquivos: `treino-z2/index.html`.

---

## 5. Cache

### Achado
Este app não tem roteador — o Daily Brief é a única tela e nunca desmonta/remonta dentro de uma sessão, exceto em reload completo da página (F5). Sem cache nenhum, todo reload sempre mostrava um estado de loading em branco até as 3 queries resolverem, mesmo que o usuário estivesse olhando os mesmos dados 5 segundos atrás.

### Otimização — stale-while-revalidate via `sessionStorage`
Novo módulo `hooks/dailyBriefCache.ts`: grava o `DailyBriefViewModel` completo em `sessionStorage` (sobrevive a reload, some quando a aba fecha) a cada carga bem-sucedida, com timestamp e janela de frescor de 5 minutos.

`useDailyBrief.ts`: na primeira carga da sessão (`attempt === 0`), se existir cache fresco, mostra ele **imediatamente** (sem estado de loading) enquanto ainda dispara o fetch real em paralelo, substituindo pelo dado fresco assim que chega. Se o fetch em background falhar e já existe dado em cache na tela, **mantém o cache visível em vez de trocar por um erro** — o usuário não vê um dado bom virar mensagem de erro. `retry()` sempre ignora o cache e volta ao comportamento de loading normal, porque retry significa explicitamente "tentar de novo do zero".

Falha ao ler/escrever `sessionStorage` (aba anônima, quota, iframe restrito) é capturada e ignorada — cache é uma otimização, nunca um requisito; o app degrada para o comportamento de sempre.

### Por que não uma camada de cache mais genérica (React Query/SWR)
Considerado e descartado: esta é uma página única com exatamente um consumidor de dados (`useDailyBrief`), sem navegação entre queries que se repetem. Uma biblioteca de cache genérica adicionaria uma dependência inteira para resolver um problema que 60 linhas bem testadas já resolvem aqui.

Arquivos: `treino-z2/src/hooks/dailyBriefCache.ts`, `treino-z2/src/hooks/useDailyBrief.ts`, `treino-z2/src/hooks/__tests__/dailyBriefCache.test.ts`, `treino-z2/src/hooks/__tests__/useDailyBrief.test.ts`.

---

## 6. Lazy loading

### Auditoria
Os 4 engines (`activity`/`metrics`/`intelligence`/`prediction`/`coach`) não importam nenhuma dependência de terceiros (confirmado por grep — só imports relativos) e são necessários **sincronamente** para renderizar a única tela do app. `import()` dinâmico neles só adicionaria uma espera antes do cálculo, sem benefício: não existe uma segunda rota para a qual adiar esse código.

**Conclusão honesta:** não existe divisão de rota aplicável aqui — é uma SPA de página única. O que de fato se qualifica como "lazy loading" real neste app é o carregamento não-bloqueante da fonte Google (seção 4) e a separação vendor/app do bundle (seção 1, que é sobre cache de navegador entre deploys, não sobre adiar carregamento — por isso reportado lá, não aqui).

---

## 7. API calls

### Auditoria
`useDailyBrief` já disparava as 3 chamadas (`fetchRecentActivities`, `fetchMetricsHistory`, `fetchUpcomingGoal`) em paralelo via `Promise.all`, não em sequência (sem waterfall) — confirmado lendo o código antes de qualquer mudança. Não existe polling em lugar nenhum do app. Não existem chamadas duplicadas: um único hook, um único consumidor (`DailyBriefPage`).

**O que foi de fato otimizado nas chamadas em si** já está coberto nas seções 1 (menos JS para montar/despachar cada chamada, com a troca para `PostgrestClient`) e 2 (payload menor por chamada, via seleção de colunas e janela de datas) — não há uma otimização adicional de "padrão de chamada" a fazer aqui além dessas, porque o padrão de chamada (paralelo, sem duplicação) já estava correto.

---

## O que não foi tocado, e por quê

- **`engines/metrics`, `engines/intelligence`, `engines/prediction`, `engines/coach` (lógica de cálculo em si):** já são funções puras, síncronas, sem I/O e sem dependências pesadas — não há query, cache ou bundle a otimizar dentro delas além da deduplicação da seção 3.
- **`React.memo` nas 8 seções do Daily Brief:** avaliado e descartado (seção 4) — sem re-render desperdiçado para evitar hoje.
- **React Query/SWR ou outra lib de cache:** avaliado e descartado (seção 5) — escopo (uma página, uma fonte de dados) não justifica a dependência.
- **Code-splitting por rota:** não há rotas — app de página única (seção 6).

---

## Verificação final

```
$ npx vitest run --coverage
 Test Files  56 passed (56)
      Tests  306 passed (306)
 Statements: 98.33% | Branches: 92.07% | Functions: 100% | Lines: 99.22%
 (todos os thresholds do TESTING.md mantidos: services/api 100%, engines/hooks/utils ≥90%, components ≥80%)

$ npm run build
 dist/assets/vendor-*.js  204.77 kB │ gzip: 64.04 kB
 dist/assets/index-*.js    25.86 kB │ gzip:  9.08 kB

$ npm run lint
 (sem erros)

$ tsc -b
 (sem erros)
```

Migration `0009_query_indexes.sql` verificada contra PostgreSQL 16 local antes do commit (aditiva, `IF NOT EXISTS`, não aplicada automaticamente ao banco de produção — mesma situação de 0001-0008, sem acesso ao Supabase de produção neste sandbox).
