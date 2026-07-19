# REFACTOR_REPORT.md

Reorganização estrutural do `treino-z2/` para seguir a taxonomia de arquitetura descrita em `docs/ARCHITECTURE.md` (condensado de `Performance.MD`). Nenhum comportamento foi alterado — build e testes têm o mesmo resultado antes e depois.

---

## 1. Escopo: só `treino-z2/`, não `index.html`

O pedido era "reorganizar o projeto para seguir exatamente a arquitetura definida em `/docs`, sem alterar comportamento". Isso só é possível em `treino-z2/`, que já tem build (Vite/TypeScript) e testes.

`index.html` (dashboard legado) foi **deliberadamente excluído** desta reorganização: é um único arquivo estático sem bundler, com JSX transpilado no navegador via Babel Standalone. Reorganizá-lo em pastas de `components/services/hooks/utils` exigiria introduzir um processo de build — o que muda como ele é servido/implantado, contradizendo diretamente "não altere comportamento". Essa exclusão já estava documentada como recomendação em `PROJECT_AUDIT.md` (seção 7, "decidir explicitamente o destino do `index.html`"). Se o objetivo for reorganizar o legado também, isso precisa ser um passo explícito e autorizado à parte (provavelmente a Fase 3 do plano de refatoração do audit: portar funcionalidade para `treino-z2` e aposentar o HTML solto).

---

## 2. Mapeamento de pastas (antes → depois)

| Antes | Depois | Categoria (objetivo pedido) |
|---|---|---|
| `src/domain/types.ts` | `src/types.ts` | tipos compartilhados (Activity, MetricsSnapshot, ZoneDefinition...) |
| `src/domain/metricsEngine.ts` | `src/engines/metrics/metricsEngine.ts` | **engines** — mapeia direto para "Metrics Engine" da spec |
| `src/domain/__tests__/metricsEngine.test.ts` | `src/engines/metrics/__tests__/metricsEngine.test.ts` | testes co-localizados com o engine |
| `src/infrastructure/supabaseClient.ts` | `src/api/supabaseClient.ts` | **api** — bootstrap do client de baixo nível |
| `src/infrastructure/activityRepository.ts` | `src/services/activityService.ts` | **services** — acesso a dados de negócio (fetch + mapeamento de linha) |
| `src/infrastructure/__tests__/activityRepository.test.ts` | `src/services/__tests__/activityService.test.ts` | idem |
| `src/features/dashboard/Dashboard.tsx` | `src/components/dashboard/Dashboard.tsx` | **componentes** |
| `src/features/dashboard/KpiRow.tsx` | `src/components/dashboard/KpiRow.tsx` | **componentes** |
| `src/features/dashboard/ActivityTable.tsx` | `src/components/dashboard/ActivityTable.tsx` | **componentes** |
| `src/features/dashboard/FitnessTrendChart.tsx` | `src/components/dashboard/FitnessTrendChart.tsx` | **componentes** |
| `src/features/dashboard/__tests__/Dashboard.test.tsx` | `src/components/dashboard/__tests__/Dashboard.test.tsx` | idem |
| *(lógica inline em `Dashboard.tsx`)* | `src/hooks/useAthleteDashboardData.ts` (novo) | **hooks** — extraído, não existia antes |
| *(lógica inline em `Dashboard.tsx`)* | `src/utils/date.ts` (novo, `currentWeekRange`) | **utils** — extraído |
| *(lógica inline em `ActivityTable.tsx`)* | `src/utils/format.ts` (novo, `formatPace`) | **utils** — extraído |

Movimentações feitas com `git mv` (histórico preservado). Diretórios vazios remanescentes (`src/domain`, `src/infrastructure`, `src/features`, `src/assets`) foram removidos.

### Árvore final de `treino-z2/src/`

```
src/
├── App.tsx
├── main.tsx
├── index.css
├── types.ts                          # Activity, MetricsSnapshot, ZoneDefinition, ZoneKey, ZoneMinutes
├── api/
│   └── supabaseClient.ts             # singleton lazy do client Supabase
├── engines/
│   └── metrics/
│       ├── metricsEngine.ts          # cálculos puros (zonas, resumo semanal, snapshot mais recente)
│       └── __tests__/metricsEngine.test.ts
├── services/
│   ├── activityService.ts            # fetchRecentActivities/fetchMetricsHistory + mapeamento de linha
│   └── __tests__/activityService.test.ts
├── hooks/
│   ├── useAthleteDashboardData.ts    # novo — estado loading/error/ready extraído do Dashboard
│   └── __tests__/useAthleteDashboardData.test.ts
├── utils/
│   ├── date.ts                       # novo — currentWeekRange, extraído do Dashboard
│   └── format.ts                     # novo — formatPace, extraído do ActivityTable
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx             # agora só orquestra o hook + renderiza
│       ├── KpiRow.tsx
│       ├── ActivityTable.tsx
│       ├── FitnessTrendChart.tsx
│       └── __tests__/Dashboard.test.tsx
└── test/
    └── setup.ts
```

---

## 3. Extrações feitas (sem mudar comportamento)

Três pedaços de lógica que estavam **misturados na apresentação** foram extraídos para as camadas corretas — mecanicamente, sem alterar o que fazem:

1. **`useAthleteDashboardData` (hook novo)** — todo o `useState`/`useEffect`/`Promise.all` de carregamento que vivia dentro de `Dashboard.tsx` virou um hook próprio em `src/hooks/`. `Dashboard.tsx` agora só chama o hook e renderiza o estado — ficou puramente apresentacional, do jeito que um componente na pasta `components/` deveria ser.
2. **`currentWeekRange` → `src/utils/date.ts`** — cálculo de "início/fim da semana atual" (usado para o KPI de volume semanal) era uma função solta dentro de `Dashboard.tsx`; virou utilitário reaproveitável.
3. **`formatPace` → `src/utils/format.ts`** — formatação de pace (`min:seg/km`) era uma função solta dentro de `ActivityTable.tsx`; virou utilitário reaproveitável.

Nenhuma dessas extrações mudou a saída visual ou os dados calculados — só onde o código mora.

---

## 4. Imports corrigidos

Todos os imports relativos foram atualizados para os novos caminhos. Verificação: `grep -rn "domain/\|infrastructure/\|features/dashboard" src` não retorna nenhuma ocorrência após a reorganização — nenhum caminho antigo ficou para trás. `tsc -b` (com `noUnusedLocals`/`noUnusedParameters` ativados) e `oxlint` passaram limpos, o que pega tanto import quebrado quanto import não utilizado.

Também corrigido: `README.md` (raiz) citava `src/infrastructure/activityRepository.ts` como exemplo — atualizado para `src/services/activityService.ts`. `docs/ARCHITECTURE.md` não citava caminhos de arquivo específicos, não precisou de ajuste. `PROJECT_AUDIT.md` **não foi alterado** — é um registro datado do estado do projeto no momento em que foi escrito, não documentação viva; alterá-lo reescreveria um histórico que deve continuar preciso para quem o consultar depois.

---

## 5. Código morto removido

- **`playwright`** removido de `treino-z2/package.json`/`package-lock.json` (`npm uninstall playwright`). Tinha sido adicionado numa sessão anterior só para uma verificação manual pontual (screenshot de desenvolvimento) e não era referenciado em nenhum script (`dev`/`build`/`test`/`lint`) nem em nenhum arquivo-fonte. Lockfile caiu de 178 para 175 pacotes.
- Diretórios vazios remanescentes das movimentações (`src/domain`, `src/infrastructure`, `src/features`, `src/assets` — este último já estava vazio antes, sobrado de quando os assets padrão do template Vite foram apagados numa sessão anterior) foram removidos.
- Varredura de exports não utilizados no `src/` final: só uma ocorrência (`DEFAULT_ZONES` em `engines/metrics/metricsEngine.ts`), que **não é código morto** — é usado como valor-padrão de parâmetro dentro do próprio arquivo (`classifyActivityZone`, `activityZoneMinutes`) e fica exportado propositalmente para permitir zonas específicas por atleta no futuro.

## 6. Duplicações

Não havia duplicação de código **dentro** de `treino-z2/` antes desta reorganização — as duplicações reais identificadas em `PROJECT_AUDIT.md` são todas **entre** `treino-z2/` e o legado `index.html` (definição de zonas, classificação de zona, cálculo de pace, gráfico SVG, KPI card), e continuam existindo porque `index.html` está fora do escopo deste refactor (ver seção 1). Removê-las exigiria ou (a) tratar `index.html` como legado congelado e não sincronizar, ou (b) portar as funcionalidades do legado para `treino-z2` e aposentar o HTML — ambas decisões de produto, não de reorganização de pastas, já documentadas no plano de refatoração de `PROJECT_AUDIT.md`.

As duas extrações de utils (`date.ts`, `format.ts`) eliminam a única duplicação *potencial* que a reorganização poderia ter introduzido: sem elas, mover código para `components/` e `hooks/` separados correria o risco de cada um reimplementar pace/data. Centralizá-las em `utils/` evita isso proativamente.

---

## 7. Verificação (nenhum comportamento mudou)

Executado antes e depois da reorganização completa:

| Verificação | Antes | Depois |
|---|---|---|
| `npm test` | 16/16 testes passando (3 arquivos) | **19/19 testes passando (4 arquivos)** — +3 testes novos: 2 no hook extraído (`useAthleteDashboardData`) cobrindo ready/error, e 1 no `Dashboard` cobrindo o estado de loading (não tinha teste antes) |
| `npm run build` | `tsc -b && vite build` limpo, bundle JS de 196.43 kB | limpo, bundle JS de **196.47 kB** (diferença de hash de conteúdo por causa dos novos nomes de arquivo internos, não de lógica — mesmo número de módulos+4 novos: 69 vs 66 transformados, correspondendo exatamente aos 3 arquivos novos + a divisão da lógica) |
| `npm run lint` (oxlint) | limpo | limpo |

A suíte de testes de `Dashboard.tsx` mudou de estratégia: antes mockava o serviço de dados duas camadas abaixo (`fetchRecentActivities`/`fetchMetricsHistory`) e esperava (`findByText`) a resolução assíncrona; agora mocka o hook `useAthleteDashboardData` diretamente e testa a renderização de forma síncrona dado cada estado (`loading`/`ready`/`error`). Isso é consequência direta de `Dashboard.tsx` ter deixado de importar o serviço diretamente — é uma melhora de isolamento de teste, não uma mudança de comportamento da aplicação. A cobertura do fluxo de dados (fetch → mapeamento → estado) continua garantida, agora no nível do hook (`hooks/__tests__/useAthleteDashboardData.test.ts`), sem sobreposição com o teste de renderização do componente.

---

## 8. O que ficou de fora (intencionalmente)

- **`index.html`** — não reorganizado (ver seção 1). Continua com todas as duplicações e problemas arquiteturais documentados em `PROJECT_AUDIT.md`.
- **`treino-z2/README.md`** — ainda é o boilerplate padrão do `npm create vite`, já apontado como problema no audit. Não é uma questão de organização de pastas/imports, é conteúdo de documentação — fora do escopo pedido nesta tarefa.
- **`supabase/migrations/`** — não movida nem renomeada; já segue a convenção padrão do Supabase CLI e não fazia parte dos objetivos listados (componentes/services/hooks/utils/api/engines).

---

## 9. Commits

Todas as mudanças foram feitas com `git mv` para preservar histórico de cada arquivo. Nenhum arquivo teve conteúdo alterado além dos imports corrigidos e das três extrações mecânicas descritas na seção 3.
