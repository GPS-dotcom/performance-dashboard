# DASHBOARD_REPORT.md

## Governança: o Dashboard não calcula métricas e não toma decisões

Antes de qualquer detalhe técnico, o ponto mais importante: **o Dashboard é uma camada de apresentação, nada mais.**

- Toda métrica (CTL, ATL, TSB, FTP, Critical Power, Pace/HR/Power Zones, Training Load...) vem do **Metrics Engine**.
- Todo insight (tendências, platôs, comparações) vem do **Intelligence Engine**.
- Toda previsão (corridas, evolução de fitness, risco de lesão, tempo de recuperação) vem do **Prediction Engine**.
- Toda recomendação e alerta vem do **Coach Engine**.

O código do Dashboard (`src/dashboard/**`) nunca importa um `calculator`, `algorithm` ou `rule` diretamente de dentro de um Engine para recalcular algo — ele só chama as funções públicas já expostas por `metrics`, `intelligence`, `prediction` e `coach`, ou lê linhas de tabelas de apresentação (lista de atividades, lista de testes de lactato) sem interpretar o dado. Onde isso não foi possível com o schema atual (ver "Limitações"), o Dashboard mostra um `EmptyState` explicando o porquê, em vez de inventar um número.

Nota de governança repetida em todo relatório desta sessão: os documentos citados na tarefa (`docs/14_FRONTEND_GUIDELINES.md`, `docs/15_DESIGN_SYSTEM.md`, `docs/16_COMPONENT_LIBRARY.md`, `docs/10_COACH_ENGINE.md`, `docs/09_PREDICTION_ENGINE.md`, `docs/08_INTELLIGENCE_ENGINE.md`, `docs/07_METRICS_ENGINE.md`) **não existem como arquivos neste repositório** — só `docs/ARCHITECTURE.md` existe fisicamente. Os comentários no código que citam "DESIGN_SYSTEM.md", "COMPONENT_LIBRARY.md" etc. referenciam as seções nomeadas da especificação original (fora do repo), seguindo a mesma convenção usada em `COACH_ENGINE_REPORT.md`, `PREDICTION_ENGINE_REPORT.md`, `INTELLIGENCE_ENGINE_REPORT.md` e `METRICS_ENGINE_REPORT.md`. Os design tokens e primitivos de UI (`Card`, `Badge`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfidenceBadge`) já existiam de uma fase anterior; esta fase os reutiliza e estende.

## Arquitetura

```
src/dashboard/
  types/          DashboardRoute, NAV_ITEMS, LoadState<T>
  providers/       ThemeProvider (dark mode manual, com fallback para prefers-color-scheme)
  layouts/         AppShell (header + nav + main)
  hooks/           useAthleteData (fetch central) + um hook por página + assemble*View (funções puras)
  components/      primitivos reutilizáveis entre páginas (KpiCard, TrendCard, InsightCard, ...)
  widgets/         composições específicas de uma página (ActivityListItem, ActivityDetailPanel)
  pages/           as 8 páginas
  services/        leituras somente-leitura que não pertencem a nenhum Engine (perfil do atleta, lista de testes de lactato)
  tests/           espelha a estrutura acima (mesma convenção usada por metrics/, intelligence/, prediction/, coach/)
```

### Decisões de arquitetura (adaptações explícitas ao stack real)

A tarefa pede explicitamente "Server Components", "virtualização para listas grandes" e um conjunto de páginas — mas o projeto real (`treino-z2`) é uma **SPA client-side rendered com Vite + React 19**, sem framework de SSR, sem router e sem biblioteca de gráficos/virtualização instalada. Consistente com a filosofia "zero dependências novas" mantida em toda a sessão (nenhum pacote npm foi adicionado nas reconstruções dos 4 Engines anteriores), as seguintes adaptações foram feitas e são documentadas aqui em vez de escondidas:

| Pedido da tarefa | Equivalente real neste stack | Por quê |
|---|---|---|
| Server Components | `React.lazy` + `Suspense` por página, em `App.tsx` | Não existe SSR/RSC numa SPA Vite CSR. O objetivo prático de Server Components (não enviar código de uma página não visitada) é atingido via code-splitting: o build confirma um chunk JS separado por página (`HomePage-*.js`, `CoachPage-*.js` etc.), carregado só quando a rota é visitada. |
| Roteamento entre 8 páginas | Hash routing hand-rolled (`useHashRoute`, `window.location.hash`) | Sem `react-router-dom` instalado; hash routing não exige configuração de servidor (esta SPA não tem servidor de app para reescrever rotas) e é suficiente para 8 rotas fixas. |
| Charts | `LineChart` (SVG hand-rolled, generalização do `FitnessTrendChart` já existente do Daily Brief) | Nenhuma lib de gráficos instalada; o padrão já estabelecido no projeto é SVG desenhado à mão. |
| Virtualização para listas grandes | `VirtualList` (windowing hand-rolled: altura fixa por item, cálculo de offset por `scrollTop`) | Nenhuma lib de virtualização instalada (`react-window` etc.); usado na página Activities. |
| Dark Mode | `ThemeProvider` com preferência manual (`light`/`dark`/`system`) persistida em `localStorage`, sobrepondo `prefers-color-scheme` via `:root[data-theme]` | O CSS já tinha suporte a `prefers-color-scheme`; esta fase adiciona a opção manual pedida em Settings sem quebrar o comportamento automático existente. |

## Páginas

Todas as 8 páginas pedidas foram implementadas, cada uma com estado `loading` / `error` (com retry) / `ready`, seguindo o mesmo padrão de `useDailyBrief` já usado no Daily Brief.

1. **Home** (`pages/HomePage.tsx`) — reaproveita o `DailyBriefPage` já construído em uma fase anterior (readiness, recovery, treino recomendado, alertas, recomendações, metas, próximos eventos: as 8 seções já existiam e já tinham testes). Não foi reconstruído — seria duplicar trabalho que já satisfaz exatamente o pedido desta página.
2. **Activities** (`pages/ActivitiesPage.tsx`) — histórico completo (`fetchRecentActivities`, já buscado por `useAthleteData`), busca por nome, filtro por período, lista virtualizada (`VirtualList`), painel de detalhes ao selecionar uma atividade (`ActivityDetailPanel`: distância, duração, pace, FC média, potência média/ponderada, rTSS, melhores esforços, minutos por zona).
3. **Metrics** (`pages/MetricsPage.tsx`) — CTL/ATL/TSB atuais e histórico (`TrendCard`), totais da semana atual (`analyzeWeeklyLoad`, Metrics Engine), minutos por zona agregados, tabelas de zona de potência/pace (`calculatePowerZones`/`calculatePaceZones`, Metrics Engine, a partir do FTP/pace de limiar do atleta).
4. **Predictions** (`pages/PredictionsPage.tsx`) — previsões de prova (5K/10K/meia/maratona), evolução do fitness (CTL, 30 dias), tempo de recuperação, risco de lesão (ACWR) — todos `Prediction<T>` do Prediction Engine, nunca recalculados aqui.
5. **Coach** (`pages/CoachPage.tsx`) — prioridades de hoje (recomendações ordenadas por `priority`) e alertas (reaproveitando `assembleDailyBrief`, a mesma função pura que monta o Daily Brief), Weekly Coach Report (`generateWeeklyReport`, Coach Engine, alimentado com atividades/métricas da semana ISO atual) e histórico persistido de recomendações/alertas (`getRecommendationHistory`/`getAlertHistory`, Coach Engine).
6. **Shoes** (`pages/ShoesPage.tsx`) — usa o `shoeAnalyzer` do Intelligence Engine (`computeShoeUsageSummary`, `analyzeShoeWear`, `analyzeShoePerformanceDifference`, `detectNewShoePersonalBests`). Ver "Limitações": sempre vazio hoje porque o schema não tem coluna de equipamento.
7. **Laboratory** (`pages/LaboratoryPage.tsx`) — lista os testes de lactato registrados e, ao selecionar um, computa LT1/LT2 via `computeLactateThresholds` (Metrics Engine). Ver "Limitações" para os demais tipos de teste pedidos.
8. **Settings** (`pages/SettingsPage.tsx`) — preferência de tema (funcional, com persistência real), perfil do atleta somente-leitura (FTP, peso, FC máxima, pace de limiar, unidades), lista estática de integrações, estado vazio para sincronização.

## Componentes

Os 12 componentes/padrões pedidos, em `dashboard/components/` (reutilizáveis entre páginas):

| Componente | Arquivo |
|---|---|
| KPI Cards | `KpiCard.tsx` |
| Trend Cards | `TrendCard.tsx` (envolve `LineChart.tsx`) |
| Insight Cards | `InsightCard.tsx` |
| Recommendation Cards | `RecommendationCard.tsx` |
| Alert Cards | `AlertCard.tsx` |
| Prediction Cards | `PredictionCard.tsx` (genérico sobre `Prediction<T>`) |
| Timeline | `Timeline.tsx` (generaliza o `TimelineSection` do Daily Brief) |
| Charts | `LineChart.tsx` |
| Filters | `FilterBar.tsx` |
| Loading States | reaproveita `ui/LoadingState.tsx` (fase anterior) |
| Error States | reaproveita `ui/ErrorState.tsx` (fase anterior) |
| Empty States | reaproveita `ui/EmptyState.tsx` (fase anterior) |
| Virtualização | `VirtualList.tsx` |

`dashboard/widgets/` guarda composições específicas de uma página só (não reutilizáveis por design): `ActivityListItem.tsx` e `ActivityDetailPanel.tsx`, ambos usados apenas pela página Activities.

## Fluxo de dados

```
useAthleteData()  ──►  Promise.all([
                          fetchRecentActivities(),      // services/activityService.ts (fase anterior)
                          fetchMetricsHistory(),        // services/activityService.ts (fase anterior)
                          fetchUpcomingGoal(),           // services/goalService.ts (fase anterior)
                          fetchCurrentAthlete(),          // dashboard/services/athleteProfileService.ts (novo)
                        ])
                        │
                        ▼
        { activities, metricsHistory, upcomingGoal, athlete, today }
                        │
        ┌───────────────┼────────────────────────────────┐
        ▼               ▼                                ▼
assembleMetricsView  assemblePredictionsView   assembleDailyBrief (reaproveitado)
        │               │                                │
        ▼               ▼                                ▼
  MetricsPage      PredictionsPage              HomePage / CoachPage
```

`useAthleteData` é o único ponto de fetch de dados "amplos" (atividades + histórico de métricas + meta + perfil), reaproveitado por Activities, Metrics, Predictions, Coach e Shoes — nenhuma dessas páginas faz sua própria query redundante para os mesmos dados. Coach e Laboratory fazem uma segunda busca, pequena e específica, assim que o `athlete.id` resolve (histórico de recomendações/alertas; lista de testes de lactato) — o mesmo padrão de "fetch em cascata assim que a dependência resolve" já usado em `useDailyBrief`.

Cada `assemble*View` é uma função **pura** (sem I/O), testável com dados sintéticos, que só chama funções já publicadas pelos 4 Engines — o mesmo padrão que `hooks/assembleDailyBrief.ts` já estabeleceu numa fase anterior. `extractBestEfforts` foi exportado de `assembleDailyBrief.ts` para ser reaproveitado por `assemblePredictionsView.ts`, em vez de duplicado.

## Integrações

- **Metrics Engine**: `analyzeWeeklyLoad`, `calculatePowerZones`, `calculatePaceZones`, `computeLactateThresholds`.
- **Intelligence Engine**: `computeShoeUsageSummary`, `analyzeShoeWear`, `analyzeShoePerformanceDifference`, `detectNewShoePersonalBests`.
- **Prediction Engine**: `predictRace5K/10K/21K/Marathon`, `predictCtlEvolution`, `predictRecoveryTime`, `predictAcuteLoadRisk`.
- **Coach Engine**: `generateDailyBrief` (via `assembleDailyBrief` reaproveitado), `generateWeeklyReport`, `getRecommendationHistory`, `getAlertHistory`.
- **Supabase** (leitura direta, fora de qualquer Engine, para dados de apresentação puros): `dashboard/services/athleteProfileService.ts` (tabela `athletes`) e `dashboard/services/laboratoryService.ts` (tabela `lactate_tests`) — ambos seguem o padrão defensivo já usado em `services/goalService.ts`: tabela ausente ou erro de query nunca vira exceção, vira "sem dado ainda".

## Decisões de UX

- **Alertas sempre acima de recomendações** (Coach page), replicando a regra do Coach Engine ("Alerts have higher priority than recommendations").
- **Prioridades ordenadas por `priority` numérica** (1 = mais urgente), nunca reordenadas por heurística própria do Dashboard.
- **Toda previsão mostra `confidence` e `assumptions`** (`PredictionCard`) — nunca uma previsão "caixa-preta".
- **Nenhum número fictício**: onde o schema não suporta o pedido (Shoes, parte de Laboratory, probabilidade de meta), a página mostra um `EmptyState` explicando exatamente o que falta, não um placeholder de "0" ou "N/A" ambíguo.
- **Navegação por hash** com `aria-current="page"` no item ativo, `focus-visible` herdado dos tokens de design existentes, alvos de toque ≥44px (mesma convenção de acessibilidade já aplicada ao Daily Brief).
- **Tema**: o seletor "System" remove qualquer override, deixando o `@media (prefers-color-scheme)` original decidir — trocar de tema nunca é uma operação destrutiva/irreversível.

## Limitações

Documentadas explicitamente em vez de contornadas com dado inventado:

1. **Shoes**: `strava_activities` não tem coluna de equipamento e `Activity` não tem campo `shoe`. A página `Shoes` está com o `shoeAnalyzer` do Intelligence Engine já ligado corretamente (mapeando `shoe: null` hoje), mas por isso sempre retorna listas vazias. Assim que o módulo de História (próxima fase, "Shoes Manager") adicionar a coluna de equipamento, esta página passa a mostrar dado real sem nenhuma mudança de código aqui.
2. **Laboratory**: o schema atual só tem `lactate_tests`/`lactate_test_stages`. FTP Test, Critical Power Test, VO2 Test, Cooper Test, Time Trial, Body Composition e Blood Exams — todos pedidos explicitamente na tarefa — não têm tabela própria ainda; a página mostra um `EmptyState` explicando isso, escopado para o módulo de Laboratório da próxima fase.
3. **FTP evolution / Critical Power evolution** (Predictions): os preditores `predictFtpEvolution`/`predictCriticalPowerEvolution` já existem no Prediction Engine, mas exigem uma série histórica de FTP/CP — o schema só guarda um valor atual (`athletes.ftp`), não histórico. Fora de escopo desta fase resolver (exigiria uma nova tabela/migração, que é trabalho de Engine/schema, não de Dashboard).
4. **Goal achievement probability** (Predictions): `predictGoalAchievement` exige um `targetValue` numérico na meta; a tabela `goals` só guarda `target_date`. A página mostra um `EmptyState` explicando o gap em vez de inventar uma meta numérica.
5. **Sem autenticação real**: não existe fluxo de login nesta aplicação (nenhuma sessão Supabase Auth é criada; o `PostgrestClient` usa só a anon key). `athleteProfileService.fetchCurrentAthlete()` assume um único atleta (a primeira linha de `athletes`), consistente com o resto do app (`activityService` já não filtra por atleta). Edição de perfil, múltiplos atletas e status de sincronização real ficam fora de escopo.
6. **Sem teste em navegador real**: como nas fases anteriores desta sessão, não há Supabase real disponível neste sandbox (`.env` aponta para um projeto placeholder) nem infraestrutura de browser E2E configurada ainda — a verificação desta fase foi `tsc -b`, `vitest run --coverage` (935 testes) e `vite build` (confirma um chunk JS por página, validando o code-splitting). Teste manual em navegador com dados reais fica para a fase de Produção.
7. **Laps/splits/mapa de atividade**: a Activity Engine já grava `laps`/`records` (migração 0005), mas não existe repositório de leitura exposto à camada de apresentação. `ActivityDetailPanel` documenta isso e mostra o que está disponível hoje (distância, duração, FC, potência, melhores esforços, minutos por zona).

## Roadmap futuro

- Módulo de História/Timeline/Laboratory (próxima fase) populando as tabelas que faltam para Shoes e os demais tipos de teste de laboratório.
- Repositório de leitura de `laps`/`records` para mapa/splits na página Activities.
- Migração de FTP/Critical Power históricos (série temporal) para viabilizar `predictFtpEvolution`/`predictCriticalPowerEvolution` no Dashboard.
- `goals.target_value` numérico para viabilizar a probabilidade de atingir meta.
- Job periódico (cron/edge function) que rode os 4 Engines e persista `recommendations`/`coach_alerts`/`insights`/`predictions` automaticamente — hoje o histórico persistido existe só como leitura (o Dashboard nunca escreve).

## Verificação final

- `npx tsc -b` — sem erros.
- `npx vitest run --coverage` — **935 testes, 168 arquivos, 100% passando**. Cobertura acima dos limiares configurados em `vite.config.ts` (90% para `dashboard/{components,hooks,services,providers}`, 80% para `dashboard/{pages,layouts,widgets}`): 98.71% statements / 96.3% branches / 97.06% functions / 99.5% lines no projeto inteiro.
- `npm run lint` (`oxlint`) — zero warnings.
- `npm run build` (`tsc -b && vite build`) — sucesso; confirma um chunk JS separado por página (`HomePage-*.js`, `ActivitiesPage-*.js`, `MetricsPage-*.js`, `PredictionsPage-*.js`, `CoachPage-*.js`, `ShoesPage-*.js`, `LaboratoryPage-*.js`, `SettingsPage-*.js`), validando a decisão de `React.lazy`/`Suspense` como equivalente prático a Server Components nesta stack.
