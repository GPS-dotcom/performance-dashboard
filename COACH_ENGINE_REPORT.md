# COACH_ENGINE_REPORT.md

**Escopo:** implementação completa do Coach Engine em `treino-z2/src/coach/`, substituindo o antigo `treino-z2/src/engines/coach/` (removido nesta mudança). Fonte oficial: `10_COACH_ENGINE.md`, `09_PREDICTION_ENGINE.md`, `08_INTELLIGENCE_ENGINE.md`, `07_METRICS_ENGINE.md`, `03_ARCHITECTURE.md`, `19_INSIGHTS_LIBRARY.md` (seções nomeadas do documento de especificação original, já usadas como referência em fases anteriores desta sessão).

> Nota sobre os documentos citados: assim como em `METRICS_ENGINE_REPORT.md`/`INTELLIGENCE_ENGINE_REPORT.md`/`PREDICTION_ENGINE_REPORT.md`, `03_ARCHITECTURE.md`, `07_METRICS_ENGINE.md`, `08_INTELLIGENCE_ENGINE.md`, `09_PREDICTION_ENGINE.md`, `10_COACH_ENGINE.md` e `19_INSIGHTS_LIBRARY.md` são seções nomeadas do documento de especificação original, não arquivos individuais versionados em `docs/`. O único arquivo de arquitetura versionado neste repositório é `docs/ARCHITECTURE.md`. As decisões abaixo seguem o conteúdo real dessas seções: "Coach Engine — turns everything into personalized, explainable recommendations; generates the 'Daily Brief'" (docs/ARCHITECTURE.md, Platform architecture); "every recommendation must be evidence-based and explainable, and every prediction must show its reasoning" (docs/ARCHITECTURE.md, Vision); "Alerts have higher priority than recommendations" (10_COACH_ENGINE.md, Escalation Rules, já citado nas fases anteriores desta sessão).

## Governança: o Coach Engine não calcula métricas, não gera previsões, e toda recomendação é explicável

Três invariantes explícitos do pedido, cada um verificado por grep sobre o código-fonte final:

**1. Nunca calcula uma métrica fisiológica.** Nenhum arquivo em `decision-engine/`, `recommendations/`, `alerts/`, `generators/` ou `planners/` chama uma função `calculate*` do Metrics Engine -- todo módulo consome apenas números/strings/booleans já calculados (`TrainingSignals`, `RecoverySignals`, `AlertSignals`, etc., em `types/signals.ts`), nunca dados brutos.

```
$ grep -rn "calculate[A-Z]" src/coach --include="*.ts" | grep -v tests/
(nenhuma chamada real -- só 1 comentário citando o Metrics Engine por nome)
```

**2. Nunca gera uma previsão.** Nenhum módulo chama uma função `predict*` do Prediction Engine -- o único lugar onde este engine toca uma `Prediction<T>` é `planners/goalCoachPlanner.ts`, que **lê** os campos já calculados de uma `Prediction<GoalPredictionValue>` (`probability`, `estimatedAchievementDate`, `limitingFactors`) sem nunca recalculá-los.

```
$ grep -rn "predict[A-Z][a-zA-Z]*(" src/coach --include="*.ts" | grep -v tests/
(nenhum resultado)
```

**3. Nenhuma recomendação é aleatória; toda recomendação é explicável e referencia métricas/insights.** Todo `Recommendation`/`Alert` é construído exclusivamente via `RecommendationFactory.create()`/`AlertFactory.create()` (Factory Pattern -- ver abaixo), e todo gerador de recomendação/alerta é uma cascata de regras determinísticas sobre os sinais recebidos, nunca uma escolha randômica. O campo `reasoning` (Recommendation) e `description` (Alert) sempre existem e nunca são vazios; `supportingMetrics`/`supportingInsights`/`supportingPredictions` sempre refletem exatamente quais sinais motivaram aquela recomendação específica (ver, por exemplo, `criticalFatigueRecoveryStrategy.ts`, que monta `supportingMetrics` dinamicamente conforme qual dos dois sinais -- Recovery Score ou TSB -- de fato disparou a regra).

O antigo `treino-z2/src/engines/coach/` (8 arquivos: `types.ts`, `trainingRecommendation.ts`, `workoutFeedback.ts`, `recoveryRecommendation.ts`, `raceStrategy.ts`, `alerts.ts`, `dailyBrief.ts`, `persistence.ts`, mais seus testes) foi **removido por completo**. Seus 4 consumidores reais (`hooks/assembleDailyBrief.ts`; `components/dailyBrief/{AlertBanner,RecommendationSection,RecoverySection}.tsx`) foram repontados para `src/coach`.

---

## Arquitetura

```
src/coach/
  types/            Recommendation/Alert (envelopes exatos pedidos) + TrainingDecision,
                     DailyBriefSummary, GoalProgress, WeeklyCoachReport + todo tipo de sinal de entrada
  decision-engine/  Strategy Pattern -- Training Decision Engine (chamada de carga em 5 vias)
    strategy.ts       a interface TrainingDecisionStrategy
    strategies/       7 estratégias concretas, uma por regra de decisão
    trainingDecisionEngine.ts  percorre as estratégias em ordem de prioridade
  recommendations/  Factory Pattern -- Recommendation Engine, 7 sub-tipos
    recommendationFactory.ts  única função que monta um Recommendation
    {recovery,intensity,volume,rest,nutrition,hydration,raceStrategy}Recommendations.ts
  alerts/           Factory Pattern -- Alert Engine, 6 categorias
    alertFactory.ts  única função que monta um Alert
    {injuryRisk,fatigue,performanceDrop,overtraining,consistency,personalRecord}Alerts.ts
    alertEngine.ts   agrega os 6 detectores em detectAlerts()
  generators/       Daily Brief Generator + Weekly Coach Report
  planners/         Goal Coach
  validators/       guards reutilizáveis + a fórmula de "confiança geral" compartilhada
  services/         única camada que toca Supabase -- persiste/lê recomendações e alertas
  repositories/     I/O Supabase para `recommendations` / `coach_alerts`
  tests/            espelha 1:1 a estrutura acima (decision-engine/, recommendations/,
                     alerts/, generators/, planners/, validators/, repositories/, services/)
```

Por que essa separação: `decision-engine/` isola a *decisão de carga* (Strategy Pattern -- cada regra é um objeto intercambiável) da *sugestão de treino específico* (`recommendations/intensityRecommendations.ts`), que são perguntas relacionadas mas distintas -- "quanto treinar hoje" (5 níveis) vs. "que tipo de sessão fazer hoje" (Easy Run, Threshold, ...). `recommendations/recommendationFactory.ts` e `alerts/alertFactory.ts` são os únicos lugares que montam um `Recommendation`/`Alert` -- nenhum gerador constrói o objeto literal diretamente, o mesmo papel que `insightBuilder.ts` e `predictionBuilder.ts` cumprem nos engines anteriores desta sessão.

---

## Fluxo de decisão

```
Metrics Engine (scores/séries já calculados)   ──┐
Intelligence Engine (Insight.description/flags) ├─► types/signals.ts (TrainingSignals,
Prediction Engine (Prediction<T>.value)          ─┘   RecoverySignals, AlertSignals, ...)
                                                              │
                        ┌─────────────────────────────────────┼─────────────────────────────┐
                        ▼                                     ▼                             ▼
              decision-engine/                      recommendations/                  alerts/
              (Strategy Pattern:                     (Factory Pattern:                (Factory Pattern:
              7 estratégias em                       7 geradores, 1 por               6 detectores, 1 por
              ordem de prioridade,                   sub-tipo pedido)                 categoria pedida)
              a 1ª que "appliesTo"                          │                             │
              decide)                                       ▼                             ▼
                        │                          RecommendationFactory              AlertFactory
                        ▼                            .create() -> Recommendation        .create() -> Alert
                TrainingDecision
                        │
                        └───────────────┬─────────────────────┬─────────────────────────────┘
                                         ▼                     ▼
                              generators/dailyBriefGenerator.ts (Daily Brief Generator)
                              -- agrega decision-engine + alerts + recommendations/{intensity,recovery}
                                         │
                                         ▼
                                DailyBriefSummary { summary, keyChanges, attentionPoints,
                                recentEvolution, trainingDecision, recommendations, alerts, ... }

generators/weeklyReportGenerator.ts   -- agrega um WeeklyReportInput já resumido pelo chamador
planners/goalCoachPlanner.ts          -- agrega uma Prediction<GoalPredictionValue> + Alerts ativos
```

Exemplo real (`hooks/assembleDailyBrief.ts`): `generateDailyBrief()` é chamado uma única vez por Daily Brief, internamente decidindo a carga (`decideTrainingAction`), detectando alertas (`detectAlerts`) e gerando as recomendações de intensidade/recuperação -- o hook então filtra `brief.recommendations` por `type` para alimentar cada seção da UI (`RecommendationSection` pega o `type: "intensity"`; `RecoverySection` pega os `type: "recovery"`), em vez de chamar os geradores de recomendação uma segunda vez sobre os mesmos sinais.

---

## Regras implementadas

### Training Decision Engine (Strategy Pattern), em ordem de prioridade

| # | Estratégia | Condição | Decisão |
|---|---|---|---|
| 1 | `injury_risk_rest` | risco de lesão alto | `full_rest` |
| 2 | `critical_fatigue_recovery` | Recovery Score < 30 OU TSB < -30 | `active_recovery` |
| 3 | `rising_fatigue_reduce` | ATL subindo + HR Drift subindo + Recovery Score caindo (exemplo literal do spec, p.50, confiança 0.92) | `reduce_load` |
| 4 | `low_recovery_reduce` | Recovery Score < 50 | `reduce_load` |
| 5 | `high_recovery_increase` | Recovery Score ≥ 85 + HR Drift melhorando + LT1 subindo (exemplo literal do spec, p.54, confiança 0.95) | `increase_load` |
| 6 | `good_recovery_maintain` | Recovery Score ≥ 70 | `maintain_load` |
| 7 | `default_maintain` | sempre se aplica (fallback) | `maintain_load` |

### Alert Engine (6 categorias, cada uma independente das demais)

| Categoria | Regra |
|---|---|
| `injury_risk` | risco de lesão alto (Prediction Engine) |
| `elevated_fatigue` | TSB < -30 (crítico) OU Recovery Score < 25 (aviso) |
| `performance_drop` | flag `performanceTrendDeclining` de um Insight de alta confiança |
| `overtraining_risk` | ACWR > 2.0 (Overreaching, crítico) OU ACWR < 0.5 (queda abrupta de carga, aviso) |
| `consistency_loss` | flag `consistencyDeclining` de um Insight "Reduced Consistency" |
| `personal_record` | novo recorde pessoal (único alerta `severity: "info"`, sem `actionRequired`) |

### Recommendation Engine (7 sub-tipos, Factory Pattern)

| Tipo | Regra |
|---|---|
| `recovery` | cascata: Recovery Day (crítico) → Lower Intensity (moderado) → Mobility (HR Drift subindo) → Sleep Priority (sem wearable) -- podem coexistir |
| `intensity` | cascata única de 7 níveis (Rest → Recovery Week → Easy Run → Recovery Run → Threshold → Long Run → Easy Run padrão), reaproveitando os 2 exemplos literais do spec |
| `volume` | ACWR/consistência decidem entre Reduce/Rebuild Gradually/Increase/Maintain Progression/Maintain |
| `rest` | dispara (não-nulo) apenas quando risco de lesão alto ou fadiga extrema (TSB/Recovery Score) |
| `nutrition` | faixa de carboidrato g/kg/dia por nível de carga da sessão (ACSM/AND/DC joint position stand, 2016) |
| `hydration` | baseline diário (~32.5ml/kg) + faixa durante o exercício (400-800ml/hora, ampliada em calor) |
| `race_strategy` | pace/HR/potência-alvo (derivados de uma Prediction Engine já calculada) + nutrição/hidratação/aquecimento/recuperação por distância |

---

## Tipos de recomendações

```ts
interface Recommendation {
  id: string;
  type: "recovery" | "intensity" | "volume" | "rest" | "nutrition" | "hydration" | "race_strategy";
  priority: 1 | 2 | 3 | 4 | 5; // 1 = mais urgente
  title: string;
  description: string;
  reasoning: string;               // "Toda recomendação deve ser explicável"
  supportingMetrics: string[];     // "Toda recomendação deve referenciar métricas"
  supportingInsights: string[];    // "...e insights"
  supportingPredictions: string[];
  confidence: number;              // 0-1
  createdAt: string;
}
```

## Tipos de alertas

```ts
interface Alert {
  id: string;
  severity: "info" | "warning" | "critical"; // "info" é o único caso positivo (recorde pessoal)
  category: "overtraining_risk" | "performance_drop" | "elevated_fatigue" | "injury_risk" | "consistency_loss" | "personal_record";
  title: string;
  description: string;
  actionRequired: string | null; // null para alertas puramente informativos
  generatedAt: string;
}
```

Também produzidos por este engine: `TrainingDecision` (ação de carga em 5 vias + `strategyUsed`, tornando a decisão rastreável), `DailyBriefSummary` (resumo diário + principais mudanças + pontos de atenção + evolução recente), `GoalProgress` (progresso + data estimada + obstáculos), `WeeklyCoachReport` (resumo semanal + pontos fortes/fracos + prioridades da próxima semana).

---

## Dependências

- **Nenhuma dependência de terceiros.** `decision-engine/`, `recommendations/`, `alerts/`, `generators/`, `planners/`, `validators/` são TypeScript puro.
- **`repositories/`** dependem de `api/supabaseClient.ts` (já existente, usado por todo o app).
- **`planners/goalCoachPlanner.ts`** depende de `Prediction`/`GoalPredictionValue`, os únicos tipos importados do Prediction Engine (`../../prediction`) -- nunca uma função de cálculo, apenas o contrato de tipo, seguindo o mesmo padrão já estabelecido pelo `raceStrategyRecommendations.ts` (que recebe `predictedTimeSec` já calculado, nunca calcula um novo).
- **Consumidor dentro do repositório:** `hooks/assembleDailyBrief.ts` (chama `generateDailyBrief`); `components/dailyBrief/{AlertBanner,RecommendationSection,RecoverySection}.tsx` (apenas tipos).
- **Tabelas Supabase:** `recommendations` e `coach_alerts` (criadas em `0008_coach_engine.sql`, estendidas e com os `CHECK` antigos removidos por `0012_coach_engine_recommendations_alerts.sql` -- mesmo padrão de `0010`/`0011` para `insights`/`predictions`).

---

## Limitações

1. **Weekly Coach Report não tem uma fonte de dados semanal automática hoje.** `generateWeeklyReport` espera um `WeeklyReportInput` já agregado (sessões, distância, Δctl/Δatl, TSB médio, consistência) -- nenhum consumidor de produção monta essa agregação ainda a partir de `Activity[]`/`daily_pmc`; é a mesma lacuna de agregação semanal/diária já documentada nas Limitações do `METRICS_ENGINE_REPORT.md` e `PREDICTION_ENGINE_REPORT.md`.
2. **Goal Coach depende de um `baselineValue` fornecido pelo chamador.** `trackGoalProgress` não sabe, por si, qual era o valor da métrica quando a meta foi criada -- calcular `progressPercent` corretamente exige que o chamador tenha esse histórico; hoje nenhum consumidor de produção fornece esse dado (a `goals` table não grava um valor-baseline).
3. **`consistencyDeclining`/`missedWeeksEvidence`/`newPersonalBest` (AlertSignals) e `hrDriftTrend`/`lt1Trend` (TrainingSignals) não são preenchidos por `assembleDailyBrief.ts` hoje.** Ficam `false`/`null` porque os dados de origem (Intelligence Engine's Consistency/Performance Analyzers para os primeiros três; streams de atividade por segundo e histórico de teste de lactato para os últimos dois) ainda não estão conectados a esse hook -- os alertas de "consistency_loss"/"personal_record" e as regras de decisão que dependem de HR Drift/LT1 estão implementados e testados, mas nunca disparam em produção até essa conexão existir.
4. **Injury Risk Predictor tem 3 sinais independentes (ACWR, monotonia, fadiga acumulada) no Prediction Engine, mas o Alert Engine só consome o de ACWR hoje.** `overtrainingAlerts.ts`/`fatigueAlerts.ts` leem apenas `acwr`/`tsb`/`recoveryScore` -- os alertas de monotonia e fadiga-acumulada-via-Prediction-Engine (distintos do TSB direto já usado em `fatigueAlerts.ts`) ainda não têm um caminho de dados até `AlertSignals`.
5. **`race_strategy` recommendations não persistem nenhuma referência ao `Insight` que embasou a previsão de tempo de prova.** `supportingPredictions` é preenchido corretamente a partir do `Prediction.id` recebido, mas `supportingInsights` fica sempre `[]` nesse gerador -- consistente com a Limitação 1 do `PREDICTION_ENGINE_REPORT.md` (o próprio Prediction Engine também nunca preenche `supportingInsights`).
6. **`recommendations.predicted_value`/`evidence` (colunas legadas) recebem apenas uma projeção parcial do novo envelope** (título como `recommendation`, `reasoning` como `reason`, `supportingMetrics` como `evidence`) -- qualquer leitor legado que espere `expected_outcome`/`alternative` (colunas que a spec original tinha, mas o novo tipo `Recommendation` não replica) sempre verá `null`, documentado explicitamente em `repositories/recommendationRepository.ts`.

---

## Roadmap futuro

Por prioridade, seguindo as lacunas da seção Limitações e o que `10_COACH_ENGINE.md` descreve como capacidades futuras:

1. **Conectar as agregações semanais/diárias que faltam** (Limitação 1 e 3) -- uma vez que o Activity Engine exponha `DailyTrainingLoad[]`/agregação semanal real (já apontado como próximo passo no `METRICS_ENGINE_REPORT.md`), tanto o Weekly Coach Report quanto os alertas de consistência/PR passam a disparar em produção sem mudança de lógica, só de dados de entrada.
2. **Alimentar `hrDriftTrend`/`lt1Trend`** a partir da Activity Engine's `records` table (streams por segundo) e do histórico de `lactate_tests`, destravando as duas regras de decisão que hoje nunca disparam (Tier 3 e Tier 5 do Training Decision Engine, e o Threshold/Long Run tiers do Intensity Recommendation).
3. **Compor um score de risco de lesão único** a partir dos 3 sinais já calculados pelo Prediction Engine (ACWR, monotonia, fadiga acumulada via TSB) em vez de o Alert Engine só ler ACWR -- resolveria a Limitação 4 sem exigir nenhuma mudança no Prediction Engine.
4. **Baseline automático para o Goal Coach** -- gravar o valor da métrica relevante no momento em que uma meta é criada (nova coluna em `goals`), eliminando a Limitação 2.
5. **Persistência do próprio `TrainingDecision`/`DailyBriefSummary`/`GoalProgress`/`WeeklyCoachReport`** -- hoje só `Recommendation`/`Alert` têm tabela própria; um histórico de decisões de carga e de relatórios semanais permitiria ao Coach Engine (ou a um futuro Assistente de IA) comparar "o que eu disse ontem" com "o que realmente aconteceu."
6. **Pesos aprendidos em vez de fixos** nas poucas regras que hoje usam constantes de julgamento de domínio (ex.: `generalConfidence`'s incremento por sinal, os pesos do Volume Recommendation) -- uma vez que haja histórico suficiente de recomendação → resultado real, esses números poderiam ser recalibrados por atleta, seguindo a mesma lógica já traçada no roadmap de ML do `PREDICTION_ENGINE_REPORT.md`.

---

## Verificação final

```
$ npx tsc -b
 (sem erros)

$ npx vitest run --coverage
 Test Files  133 passed (133)
      Tests  774 passed (774)
 Statements: 99.43% | Branches: 96.54% | Functions: 100% | Lines: 99.6%
 src/coach/** : 99.7% statements / 96.81% branches / 100% functions / 100% lines
   (threshold configurado em vite.config.ts: 90%+ em todas as dimensões)
 Nenhum threshold de cobertura falhou (services/api 100%, engines/hooks/utils/metrics/intelligence/prediction/coach 90%, components 80%)

$ npm run lint
 (sem erros)

$ npm run build
 tsc -b && vite build
 ✓ built em 740ms
```

Migration `0012_coach_engine_recommendations_alerts.sql` verificada localmente contra PostgreSQL 16 (cadeia completa 0001→0012 reaplicada do zero, caminho de upsert idempotente testado em ambas as tabelas -- linhas legadas preservadas, novas linhas inseridas, re-upsert no mesmo `client_recommendation_id`/`client_alert_id` atualiza em vez de duplicar, migration reaplicável sem erros).

32 arquivos de teste novos em `src/coach/tests/` (decision-engine/, recommendations/, alerts/, generators/, planners/, validators/, repositories/, services/), totalizando 155 testes, cobrindo as 7 estratégias do Training Decision Engine, os 7 geradores de Recommendation, os 6 detectores de Alert (mais o `alertEngine` agregador), os 2 geradores de relatório, o Goal Coach, as duas camadas de I/O e os 2 utilitários compartilhados de `validators/`, com o mesmo padrão de mock de Supabase já usado nos testes do Metrics/Intelligence/Prediction Engine.
