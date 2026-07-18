# PROJECT_AUDIT.md

Auditoria completa e somente-leitura do repositório `performance-dashboard`, feita lendo integralmente todos os arquivos versionados (`index.html`, todo `treino-z2/`, `supabase/migrations/`, `docs/`, READMEs e configs). Nenhum código foi alterado como parte desta auditoria.

---

## 1. Estrutura atual

O repositório contém **dois aplicativos front-end independentes**, coexistindo sem camada compartilhada, mais um schema de banco ainda não aplicado:

```
performance-dashboard/
├── index.html                          # Dashboard legado, single-file, sem build (EM PRODUÇÃO)
├── README.md                           # Documenta os dois apps
├── docs/
│   └── ARCHITECTURE.md                 # Resumo condensado da spec Performance.MD (Treino Z2)
├── supabase/
│   └── migrations/
│       └── 0001_treino_z2_core_schema.sql   # Schema multi-atleta, NÃO aplicado ao banco real
├── .claude/settings.local.json
└── treino-z2/                          # App novo (MVP), Vite + React + TypeScript
    ├── index.html, package.json, package-lock.json, vite.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── .oxlintrc.json, .env.example, .gitignore
    ├── public/ (favicon.svg, icons.svg)
    └── src/
        ├── main.tsx, App.tsx, index.css
        ├── domain/
        │   ├── types.ts               # Activity, MetricsSnapshot, ZoneDefinition...
        │   ├── metricsEngine.ts       # Cálculos puros (zonas, resumo semanal, snapshot mais recente)
        │   └── __tests__/metricsEngine.test.ts
        ├── infrastructure/
        │   ├── supabaseClient.ts      # Singleton lazy do client Supabase
        │   ├── activityRepository.ts  # Mapeia strava_activities/daily_pmc -> tipos de domínio
        │   └── __tests__/activityRepository.test.ts
        ├── features/dashboard/
        │   ├── Dashboard.tsx, KpiRow.tsx, ActivityTable.tsx, FitnessTrendChart.tsx
        │   └── __tests__/Dashboard.test.tsx
        └── test/setup.ts
```

Não existe `package.json` na raiz do repositório — `index.html` não é gerenciado por nenhum gerenciador de pacotes; todas as suas dependências vêm de CDN, direto no HTML.

O histórico de commits (`git log`) mostra que `index.html` foi construído incrementalmente ao longo de ~20 commits, todos focados num único atleta real ("GPS → Chicago Marathon"), com mensagens em português. `treino-z2/` foi criado numa sessão anterior desta mesma conversa, como MVP inicial de uma plataforma maior descrita numa especificação externa (`Performance.MD`, condensada em `docs/ARCHITECTURE.md`).

---

## 2. Tecnologias

### `index.html` (dashboard legado, em produção)

| Camada | Tecnologia | Como é carregada |
|---|---|---|
| UI | React 18.3.1 + ReactDOM 18.3.1 | CDN (cdnjs), build UMD |
| Transpilação | Babel Standalone 7.23.5 | CDN — **transpila o JSX no navegador, a cada carregamento de página** (sem build step) |
| Dados | `@supabase/supabase-js@2` | CDN (jsDelivr), **tag de versão flutuante** (`@2`, não pinada) |
| Gráficos | Chart.js 4.4.1 | CDN (cdnjs) — usado só nas abas de zona (barra empilhada + donut) |
| Gráficos (2) | SVG manual (`MiniLineChart`) | Implementação própria, sem lib — usado nas outras abas |
| Fontes | Google Fonts (Inter, DM Mono) | `<link>` externo |
| Estilo | CSS puro, embutido em `<style>` | Custom properties (`--accent`, `--z1`..`--z5` etc.) |
| Persistência local | `localStorage` | Só para o calendário de treinos planejados |

Sem bundler, sem linter, sem testes, sem gerenciador de dependências, sem lockfile, sem `package.json`.

### `treino-z2/` (MVP novo)

| Camada | Tecnologia | Versão (package.json) |
|---|---|---|
| Build | Vite | `^8.1.1` |
| UI | React + ReactDOM | `^19.2.7` |
| Linguagem | TypeScript | `~6.0.2` |
| Dados | `@supabase/supabase-js` | `^2.110.7` (pinada) |
| Testes | Vitest + Testing Library + jsdom | `^4.1.10` / `^16.3.2` / `^29.1.1` |
| Lint | oxlint | `^1.71.0` |
| **Não utilizado** | Playwright | `^1.61.1` — ver seção "Código morto" |

**Dependências (`npm ls` implícito via `package-lock.json`):** lockfile v3, 178 pacotes no total (produção + dev). Em produção real (`dependencies`), só 3 pacotes: `@supabase/supabase-js`, `react`, `react-dom`. Todo o restante é `devDependencies` (tooling de build/teste).

### Divergências entre os dois apps

- **React 18.3.1 (legado) vs React 19.2.7 (novo)** — bundles isolados hoje, mas é uma migração major pendente caso os dois sejam unificados no futuro.
- **`@supabase/supabase-js@2` não pinado (legado) vs `^2.110.7` pinado (novo)** — o legado pode quebrar silenciosamente se a CDN servir uma versão minor/patch nova incompatível.

---

## 3. Integrações com Strava

Não há nenhuma chamada direta à API do Strava neste repositório. Toda a sincronização passa por uma **Supabase Edge Function externa chamada `clever-api`**, cujo código-fonte não está neste repositório (vive no projeto Supabase, fora deste controle de versão) — portanto não é auditável a partir daqui.

- Disparo: botão **"⟳ Atualizar treinos"** em `index.html` (`handleSync`, linhas 1217-1234) faz `POST` para `${SUPABASE_URL}/functions/v1/clever-api` com o anon key como `Authorization: Bearer`.
- A edge function (não versionada aqui) presumivelmente: busca atividades novas no Strava, calcula zonas segundo a segundo a partir dos streams, calcula best efforts (5K/10K/15K/10mi/20K/meia), grava tudo em `strava_activities`, e recalcula a série `daily_pmc` (CTL/ATL/TSB).
- Campos vindos do Strava, consumidos pelo front-end: `best_efforts` (JSON), `zone_minutes` (JSON, tempo real por zona), `suffer_score` (Relative Effort nativo do Strava — usado como base do CTL), `weighted_average_watts`/`average_watts`, `average_heartrate`, `distance_m`, `moving_time_s`.
- `treino-z2/` **não tem botão de sync nem chama a edge function** — ele só lê as tabelas já sincronizadas pelo dashboard legado. Ou seja, o app novo depende do app antigo continuar rodando para os dados existirem/se atualizarem.
- Não há tratamento de rate limit, paginação ou retry documentado no fluxo de sync — apenas um `try/catch` simples em `handleSync`.

---

## 4. Integrações com Supabase

Um único projeto Supabase é usado pelos dois apps: `wmkfhvnwpvcsiwaxjefs.supabase.co`.

- **`index.html`**: URL e anon key **hardcoded em texto puro no HTML** (linhas 169-171), versionados no Git e servidos como parte do site estático.
- **`treino-z2/`**: URL e anon key via variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), carregadas de `.env` (gitignored) — `.env.example` documenta o formato.

### Tabelas em uso real (produção, legado)

- `strava_activities` — schema **implícito**, nunca versionado como migration neste repo. Só é possível inferir os campos a partir do código que os lê.
- `daily_pmc` — idem: `date`, `ctl`, `atl`, `tsb`, schema implícito.

### Schema novo (não aplicado)

`supabase/migrations/0001_treino_z2_core_schema.sql` define, de forma aditiva (não mexe nas tabelas acima): `athletes`, `activities`, `workouts`, `metrics_snapshots`, `insights`, com Row Level Security habilitado e políticas por `auth.uid()`. Escrito na sessão anterior, **nunca executado contra o banco real** (a sessão só tem acesso ao anon key, sem permissão de DDL).

### Riscos identificados

- **Nenhuma migration documenta o schema real em produção** (`strava_activities`, `daily_pmc`). Se o banco precisar ser recriado hoje, não há como, exceto fazendo engenharia reversa a partir do código que o lê.
- **Anon key hardcoded e versionado em `index.html`** é uma prática aceitável *somente se* Row Level Security estiver corretamente habilitado em `strava_activities`/`daily_pmc` — o que **não foi possível verificar nesta auditoria** (sem acesso ao painel/SQL do Supabase). Se RLS não estiver habilitado nessas duas tabelas, qualquer visitante do site estático consegue ler (e potencialmente escrever) os dados reais de treino do atleta usando a chave já pública no repositório.
- Também não há função Edge (`clever-api`) versionada aqui — mudanças nela não deixam rastro neste histórico de Git.

---

## 5. Fluxo da aplicação

### `index.html` (legado, em produção)

1. Navegador carrega `index.html` estático → baixa React/ReactDOM/Babel/Supabase-js/Chart.js via CDN.
2. Babel Standalone transpila o bloco `<script type="text/babel">` inteiro **no navegador, a cada carregamento** (não há build/cache de bundle).
3. `App` monta; `useEffect` dispara `loadData()`: `SELECT * FROM strava_activities ORDER BY start_date DESC LIMIT 200` + `SELECT * FROM daily_pmc ORDER BY date ASC`.
4. Usuário navega entre 4 abas via estado local (`page`, sem router): **Resumo**, **Distribuição de FC**, **Predictions**, **Training Log**.
5. Botão "Atualizar treinos" → `POST /functions/v1/clever-api` → edge function sincroniza com Strava e recalcula PMC/zonas → front-end recarrega via `loadData()`.
6. Calendário de treinos planejados (Training Log) é **só `localStorage` do navegador** — não é persistido no Supabase, não sincroniza entre dispositivos, se perde ao limpar dados do navegador.
7. Toda a lógica de métricas (classificação de zona, PMC forecast, Riegel, rTSS estimado, comparação com sessões anteriores) roda no cliente, recalculada a cada render a partir de `activities`/`pmc` em memória (sem memoização — aceitável dado o volume pequeno de dados de um único atleta).

### `treino-z2/` (MVP novo)

1. `vite dev` ou build estático → React monta `App` → `Dashboard`.
2. `useEffect` dispara `fetchRecentActivities()` + `fetchMetricsHistory()` em paralelo (`Promise.all`) contra **as mesmas tabelas** `strava_activities`/`daily_pmc`, mapeadas para tipos de domínio (`mapActivityRow`/`mapSnapshotRow`).
3. Três estados possíveis: `loading` / `error` / `ready` — sem cache, sem botão de sync, sem calendário/Training Log (funcionalidade não portada).
4. Renderiza: KPIs (Fitness/Fatigue/Form/volume da semana atual), gráfico de tendência CTL/ATL/TSB em SVG próprio, tabela das 20 atividades mais recentes.

**Conclusão do fluxo:** `treino-z2/` hoje é um **subconjunto somente-leitura** do dashboard legado — não substitui suas funcionalidades (sync manual, calendário de treinos, predictions/Riegel, distribuição de zona por semana), apenas lê os mesmos dados já sincronizados pelo app antigo.

---

## 6. Problemas encontrados

### 6.1 Código morto

1. **`playwright` em `treino-z2/package.json`** — dependência de dev (~93 pacotes transitivos no lockfile) adicionada numa sessão anterior só para tirar um screenshot de verificação manual. Não é referenciada em nenhum script (`dev`/`build`/`test`/`lint`) nem em nenhum arquivo-fonte. É peso morto puro.
2. **`refLines` em `MiniLineChart`** (`index.html`, linha 456) — prop totalmente implementada (desenha linhas de referência tracejadas com label) mas **nunca usada** nos dois pontos de chamada existentes (`PageTrainingLog`, `PagePredictions`). Feature morta, nunca ativada.
3. **`ZONE_DEFS[].pct`** (campo "% FTP" por zona, `index.html`) é só exibido na tabela de definição de zonas — não alimenta nenhum cálculo. Não é "código morto" per se, mas é um dado hardcoded sem derivação nem validação cruzada com `pw`/`hr`/`pace` da mesma linha.
4. **`treino-z2/README.md`** ainda é o boilerplate padrão do `npm create vite` (fala de "HMR" e plugins oficiais do Vite) — não documenta nada específico do projeto. A documentação real está só no `README.md` da raiz.

### 6.2 Código duplicado

1. **Definições de zona de treino** — `ZONE_DEFS` (`index.html`, linhas 181-187) vs `DEFAULT_ZONES` (`treino-z2/src/domain/metricsEngine.ts`, linhas 7-13): duas fontes de verdade para os **mesmos limiares fisiológicos de um único atleta real**. Já divergem: o legado tem pace/potência/`pct` por zona; o novo só tem `hrMax`/`powerMax` (faltam pace e `pct`). Se o FTP/limiar do atleta mudar, é preciso lembrar de editar dois arquivos em dois lugares diferentes — alto risco de drift silencioso.
2. **Classificação de zona por atividade** — `classifyActivityZone`/`activityZoneMinutes` reimplementadas quase 1:1 em `index.html` (linhas 196-215) e em `treino-z2/src/domain/metricsEngine.ts`, com assinaturas ligeiramente diferentes (objeto Strava bruto vs tipo de domínio), mas mesma lógica.
3. **Cálculo de pace** — `paceStr` (`index.html`) vs `paceMinPerKm` + `formatPace` (`treino-z2/ActivityTable.tsx`): mesma fórmula (`moving_time_s / (distance_m/1000)`), duas implementações com formatos de saída ligeiramente diferentes (`4:03` vs `4:03/km`).
4. **Gráfico de linha em SVG manual** — `MiniLineChart` (`index.html`, ~35 linhas) vs `FitnessTrendChart` (`treino-z2`, ~30 linhas): mesma ideia (path SVG escalado manualmente para CTL/ATL/TSB), duas implementações independentes, nenhuma reaproveitada.
5. **Componente/estilo de KPI card** — `Kpi` (`index.html`) vs `KpiRow` (`treino-z2`): mesmo padrão visual (label + valor + unidade), CSS praticamente duplicado entre os dois arquivos de estilo (`--text-primary`, `--text-muted`, `--border` etc. redefinidos com valores quase idênticos nos dois lugares).
6. **Mapeamento de campos Strava** (`weighted_average_watts || average_watts`, `average_heartrate`, etc.) espalhado em `index.html` em pelo menos 4 pontos diferentes (`classifyActivityZone`, `classifyActivity`, tabela de atividades, `onSort`), sem uma função central. `treino-z2` já corrigiu isso centralizando em `mapActivityRow`, mas o legado — que é a versão realmente em produção — continua com a duplicação original.

### 6.3 Problemas arquiteturais

1. **Dois front-ends independentes apontando para o mesmo par de tabelas, sem camada de domínio compartilhada.** Qualquer mudança de schema (nome/tipo de coluna) precisa ser replicada manualmente em dois lugares com dois estilos de código diferentes (JS solto vs TypeScript tipado).
2. **Schema de produção não versionado.** `strava_activities`/`daily_pmc` só existem implicitamente no código que as lê — nenhuma migration as documenta.
3. **Lógica de negócio misturada com apresentação em `index.html`.** Funções puras de cálculo (`computeFitnessForecast`, `buildRacePredictions`, `analyzeExecution` etc.) convivem no mesmo arquivo de 1289 linhas que os componentes de UI, sem separação de camadas. Isso já foi corrigido em `treino-z2` (`domain/` separado de `features/`), mas o legado — que é a versão realmente usada — continua monolítico.
4. **Sem build step em produção (`index.html`).** JSX é transpilado no navegador a cada carregamento via Babel Standalone — mais lento que servir um bundle pré-compilado, sem minificação/tree-shaking do código próprio, e uma prática que a própria documentação do Babel desaconselha para produção.
5. **Zero testes no dashboard legado**, apesar de conter lógica não trivial (forecast de fitness, extrapolação de Riegel, análise de execução de treino comparando com sessões anteriores). Qualquer regressão só é percebida por inspeção visual manual. `treino-z2` corrigiu isso (16 testes), mas cobre só uma fração da funcionalidade real (falta sync, calendário, predictions).
6. **Estado "planejado" (calendário de treinos) vive só em `localStorage`** no legado — não sincroniza entre dispositivos, não tem backup, e não existe em `treino-z2` (funcionalidade não portada ainda). É um ponto único de falha para dados que o usuário levou tempo cadastrando manualmente.
7. **Nomenclatura do domínio não documentada.** O campo `rtss` (relative TSS) é usado extensivamente mas nunca definido dentro deste repositório — só é calculado implicitamente pela edge function externa. Quem lê o código sem o contexto da spec `Performance.MD` não entende de onde vem esse número nem como ele é derivado no backend.
8. **`treino-z2` não tem paridade funcional com o legado** (sem sync, sem calendário, sem predictions, sem distribuição de zona por semana) — hoje é estritamente um subconjunto somente-leitura, não um substituto.

---

## 7. Sugestões de melhoria

### Alto impacto / baixo risco (fazer primeiro)

- Remover a dependência `playwright` de `treino-z2/package.json` (não utilizada).
- Confirmar, com acesso ao painel Supabase, se Row Level Security está habilitado em `strava_activities` e `daily_pmc`. Se não estiver, é uma exposição de dados real, não hipotética — tratar como prioridade de segurança, não de arquitetura.
- Extrair o DDL real dessas duas tabelas do Supabase e commitar como migration descritiva (`supabase/migrations/0000_legacy_schema.sql`), antes de qualquer outra mudança de banco.

### Médio prazo

- **Decidir explicitamente o destino do `index.html`**: congelar como está (single-user, sem build, mantido só em modo de manutenção) e tratar `treino-z2` como sucessor oficial, *ou* migrar o legado para dentro de `treino-z2` e aposentar o HTML solto. Hoje os dois evoluem em paralelo sem essa decisão ter sido tomada, o que já gerou as 6 duplicações listadas acima.
- Unificar as definições de zona fisiológica numa única fonte de verdade (se a decisão acima for "compartilhar código") ou aceitar formalmente que o legado está congelado e não vale a pena sincronizar.
- Portar o botão de sync (chamada à edge function `clever-api`) e o Training Log (calendário) para `treino-z2`, movendo a persistência de `localStorage` para a tabela `workouts` (já modelada na migration nova).

### Longo prazo (alinhado à spec Performance.MD, ver `docs/ARCHITECTURE.md`)

- Seguir o roadmap de engines já esboçado (Sync/Activity/Metrics/Intelligence/Prediction/Coach Engine) em vez de continuar acumulando lógica ad-hoc em componentes de página.
- Aplicar `0001_treino_z2_core_schema.sql` e migrar o(s) atleta(s) real(is) para o modelo multi-atleta **só quando houver necessidade real de múltiplos atletas** — não antes, para não introduzir complexidade sem uso imediato.

---

## 8. Complexidade estimada

| Área | Complexidade | Justificativa |
|---|---|---|
| `index.html` | **Alta** | 1289 linhas em um único arquivo, ~35 funções/componentes, zero separação de camadas, zero testes, zero tipagem. Qualquer mudança depende de validação manual visual nas 4 abas — sem rede de segurança automatizada. |
| `treino-z2/domain` + `infrastructure` | **Baixa** | Módulos pequenos, puros, com 16 testes cobrindo os casos principais. Fácil de entender e estender. |
| `treino-z2/features/dashboard` | **Baixa** | 4 componentes pequenos, um único fluxo de dados (loading/error/ready), sem estado complexo. |
| `supabase/migrations/0001...` | **Baixa** (mas não validada) | Schema aditivo, um único arquivo, bem estruturado — porém nunca executado contra um banco real nesta auditoria. |
| Unificação dos dois apps num só, sem duplicação | **Média-alta** | Não é reescrita do zero, mas exige portar ~800 linhas de lógica/UI de `index.html` para a estrutura em camadas de `treino-z2`, decidir o que vira Edge Function vs client-side, e migrar `localStorage` → Supabase (tabela `workouts`). |

---

## 9. Plano de refatoração

Proposto para discussão — **nenhuma etapa foi executada**.

**Fase 0 — Segurança e documentação de schema** (pré-requisito, antes de qualquer refactor de código)
1. Confirmar RLS em `strava_activities`/`daily_pmc` no painel Supabase.
2. Extrair o DDL real dessas tabelas e commitar como migration descritiva.

**Fase 1 — Eliminar duplicação sem mudar comportamento observável**
3. Remover `playwright` de `treino-z2/package.json`.
4. Definir uma única fonte de verdade para as zonas fisiológicas (constantes + funções puras), consumida por ambos os apps — ou decidir formalmente que `index.html` está congelado e não vale a pena sincronizar.
5. Se a decisão da Fase 1.4 for "compartilhar código": consolidar os helpers de pace/duração (`paceStr`/`fmtDuration` vs `paceMinPerKm`/`formatPace`) num único módulo.

**Fase 2 — Paridade funcional do `treino-z2` com o legado**
6. Portar o botão de sync (chamada à edge function `clever-api`).
7. Portar o Training Log (calendário de treinos planejados), com persistência na tabela `workouts` (já modelada), substituindo o `localStorage` do legado.
8. Portar a aba Predictions (best efforts + Riegel) e a Distribuição de FC (gráficos por semana), reaproveitando `metricsEngine.ts`.

**Fase 3 — Corte do legado**
9. Quando `treino-z2` tiver paridade de funcionalidade, redirecionar ou aposentar `index.html` (ou mantê-lo como fallback estático por um período de transição).
10. Aplicar `0001_treino_z2_core_schema.sql` e migrar dados reais para o modelo multi-atleta **somente se/quando** houver necessidade real de múltiplos atletas.

Cada fase deve ser um PR isolado, com testes cobrindo o que for portado, seguindo o padrão já estabelecido em `treino-z2/src/domain/__tests__`.
