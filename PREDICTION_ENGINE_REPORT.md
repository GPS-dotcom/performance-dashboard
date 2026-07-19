# PREDICTION_ENGINE_REPORT.md

**Escopo:** implementação completa do Prediction Engine em `treino-z2/src/prediction/`, substituindo o antigo `treino-z2/src/engines/prediction/` (removido nesta mudança). Fonte oficial: `09_PREDICTION_ENGINE.md`, `08_INTELLIGENCE_ENGINE.md`, `07_METRICS_ENGINE.md`, `04_DOMAIN_MODEL.md`, `03_ARCHITECTURE.md` (seções nomeadas do documento de especificação original, já usadas como referência em fases anteriores desta sessão).

> Nota sobre os documentos citados: assim como em `METRICS_ENGINE_REPORT.md`/`INTELLIGENCE_ENGINE_REPORT.md`, `03_ARCHITECTURE.md`, `04_DOMAIN_MODEL.md`, `07_METRICS_ENGINE.md`, `08_INTELLIGENCE_ENGINE.md` e `09_PREDICTION_ENGINE.md` são seções nomeadas do documento de especificação original, não arquivos individuais versionados em `docs/`. O único arquivo de arquitetura versionado neste repositório é `docs/ARCHITECTURE.md`. As decisões abaixo seguem o conteúdo real dessas seções: "Prediction Engine — forecasts future performance (race times, FTP, recovery, injury risk, race readiness)" (docs/ARCHITECTURE.md, Platform architecture); "Prediction — race/FTP/VO2/injury-risk/performance-trend forecasts" (docs/ARCHITECTURE.md, Core entities); "every prediction must show its reasoning" (docs/ARCHITECTURE.md, Vision).

## Governança: o Prediction Engine não calcula métricas, não gera recomendações, e nunca é uma caixa preta

Três invariantes explícitos do pedido, cada um verificado por grep sobre o código-fonte final:

**1. Nunca calcula uma métrica fisiológica.** Nenhum arquivo em `algorithms/`/`predictors/` chama uma função `calculate*` do Metrics Engine nem reimplementa uma fórmula fisiológica -- todos consomem `MetricSeriesPoint[]`/`TrainingLoadPoint[]` (saídas já prontas do Metrics Engine), `BestEffort[]` (extraído de `Activity[]` pelo chamador) ou `GoalInput` (extraído de `goals` pelo chamador).

```
$ grep -rn "calculate[A-Z]" src/prediction/algorithms src/prediction/predictors
(nenhuma chamada real -- só 2 comentários citando o Metrics Engine por nome)
```

**2. Nunca gera uma recomendação.** Nenhum `predictor`/`algorithm` produz texto de recomendação nem chama nada do Coach Engine -- uma previsão é um número (ou objeto estruturado) com intervalo de confiança e premissas explícitas, nunca um "faça X". Decidir *o que fazer* a partir de uma previsão continua sendo exclusivamente o Coach Engine.

**3. Nenhuma previsão é uma caixa preta.** Todo algoritmo em `algorithms/` tem um comentário citando sua fórmula/fonte (Riegel 1977, Gabbett 2016, Foster 1998/2001, ou uma dedução analítica documentada passo a passo), e toda saída carrega `assumptions` (premissas explícitas, sempre não-vazias) e um intervalo de confiança (`lowerBound`/`upperBound`) -- ver seção "Algoritmos utilizados" para a fórmula exata de cada um.

O antigo `treino-z2/src/engines/prediction/` (7 arquivos: `types.ts`, `racePrediction.ts`, `thresholdProjection.ts`, `injuryRisk.ts`, `recoveryTime.ts`, `persistence.ts`, `index.ts`, mais seus testes) foi **removido por completo**. Seus 3 consumidores reais (`hooks/assembleDailyBrief.ts`; `components/dailyBrief/{PredictionsSection,RecoverySection}.tsx`; `engines/coach/raceStrategy.ts` e seu teste) foram repontados para `src/prediction`.

---

## Arquitetura

```
src/prediction/
  types/        Prediction<T> (envelope universal), PredictionType/PredictionCategory,
                MetricSeriesPoint/MetricPolarity/BestEffort, GoalInput
  models/       PredictionModel<TInput,TValue> + ModelOutput<TValue> -- a fronteira de
                troca por Machine Learning (ver "Roadmap para Machine Learning")
  algorithms/   1 arquivo por família de algoritmo -- puro, sem I/O, documentado,
                cada um implementa PredictionModel
    shared/     matemática deduplicada (regressão linear, intervalo de confiança
                estatístico e heurístico, o tipo InjuryRiskValue comum aos 2 modelos de risco)
  validators/   guards reutilizáveis (isPositiveNumber, hasMinPoints, ...)
  predictors/   1 arquivo por preditor solicitado -- único lugar que chama um
                PredictionModel e monta o envelope Prediction<T> final
    shared/     predictionBuilder.ts -- única função que monta um Prediction<T>
  services/     única camada que toca Supabase -- orquestra repository
  repositories/ I/O Supabase para a tabela `predictions`
  tests/        espelha 1:1 a estrutura acima (models/, algorithms/, validators/,
                predictors/, repositories/, services/)
```

Por que essa separação: `models/predictionModel.ts` é a única interface que `predictors/` conhece -- cada arquivo em `algorithms/` implementa `PredictionModel<TInput, TValue>` e é chamado exclusivamente via `.predict(input)`, nunca por sua função crua diretamente (essas funções cruas continuam exportadas de seus próprios arquivos, para teste unitário focado, mas deliberadamente não são re-exportadas pelo barril público -- ver comentário em `algorithms/index.ts`). Isso é o que torna a troca por um modelo de ML mecânica: escrever um novo objeto que satisfaça a mesma interface e trocar a referência em `predictors/*.ts`; nada mais no engine muda. `predictors/shared/predictionBuilder.ts` é o único lugar que deriva `id`/`expiresAt`/`confidenceLevel`-equivalente a partir de um `ModelOutput<T>`, o mesmo papel que `insightBuilder.ts` cumpre no Intelligence Engine.

---

## Preditores implementados

| # | Preditor | Arquivo | Sub-capacidades | `predictionType`s |
|---|---|---|---|---|
| 1 | Race Predictor | `predictors/racePredictor.ts` | 5K, 10K, 15K, 21K (meia maratona), 30K, Maratona | `race_time_5k` .. `race_time_marathon` |
| 2 | Fitness Predictor | `predictors/fitnessPredictor.ts` | evolução do CTL, da Fitness Score, do Running Effectiveness | `ctl_evolution`, `fitness_score_evolution`, `running_effectiveness_evolution` |
| 3 | Threshold Predictor | `predictors/thresholdPredictor.ts` | LT1, LT2, Critical Power, FTP | `lt1_evolution`, `lt2_evolution`, `critical_power_evolution`, `ftp_evolution` |
| 4 | Recovery Predictor | `predictors/recoveryPredictor.ts` | dias até recuperação completa, impacto da carga atual | `recovery_time`, `current_load_impact` |
| 5 | Injury Risk Predictor | `predictors/injuryRiskPredictor.ts` | risco por carga aguda (ACWR), por monotonia, por fadiga acumulada | `injury_risk_acute_load`, `injury_risk_monotony`, `injury_risk_accumulated_fatigue` |
| 6 | Goal Predictor | `predictors/goalPredictor.ts` | probabilidade + data estimada + fatores limitantes (uma única previsão -- ver nota abaixo) | `goal_achievement` |
| 7 | Readiness Predictor | `predictors/readinessPredictor.ts` | prontidão para competir, prontidão para treinos intensos | `readiness_race`, `readiness_hard_training` |

**Nota de design -- Goal Predictor:** "probabilidade de atingir meta", "data estimada" e "fatores limitantes" foram implementados como **uma única previsão** (`GoalPredictionValue { probability, estimatedAchievementDate, limitingFactors }`), não três `predictionType`s separados. As três coisas são facetas do mesmo cálculo (uma tendência linear projetada contra uma meta): a data estimada é onde a mesma reta cruza o alvo, e os fatores limitantes são as razões pelas quais aquela mesma projeção pode não ser confiável -- forçá-las em três modelos independentes duplicaria a regressão e poderia produzir uma probabilidade e uma data estimada mutuamente inconsistentes. Ver `algorithms/goalProbabilityModel.ts` para o raciocínio completo.

---

## Algoritmos utilizados

Cada algoritmo abaixo é uma função pura em `algorithms/`, envolvida por um objeto `PredictionModel` com `modelId`/`version` estáveis.

| Algoritmo | Arquivo | Fórmula / Método | Referência |
|---|---|---|---|
| Riegel Race Model | `algorithms/riegelRaceModel.ts` | Usa um recorde real se existir perto da distância alvo; senão extrapola `T2 = T1 * (D2/D1)^1.06` a partir do recorde mais próximo em distância logarítmica | Riegel, P.S. (1977), "Athletic Records and Human Endurance", *American Scientist* 65(4) |
| Linear Trend Model | `algorithms/linearTrendModel.ts` | Regressão linear (mínimos quadrados) sobre a série histórica, projetada N dias à frente. Compartilhado por Fitness Predictor (3 sub-capacidades) e Threshold Predictor (4 sub-capacidades) -- 7 previsões, 1 implementação | Método estatístico padrão (OLS) |
| ATL Decay Recovery Model | `algorithms/atlDecayRecoveryModel.ts` | Resolve analiticamente a recorrência EWMA do próprio Metrics Engine (`atl += (tss-atl)/7`) para TSS constante: `atl(n) = tss + (atl0-tss)*decayFactor^n`; resolve para o menor `n` tal que `atl(n) <= ctl` | Dedução analítica sobre o modelo EWMA de Banister (1975), já usado pelo Metrics Engine |
| ACWR Injury Risk Model | `algorithms/acwrInjuryRiskModel.ts` | Acute:Chronic Workload Ratio = ATL/CTL; zona de risco baixo 0.8-1.3, risco alto acima de 1.5 | Gabbett, T.J. (2016), "The training-injury prevention paradox", *British Journal of Sports Medicine* 50(5) |
| Foster Monotony/Strain Model | `algorithms/monotonyStrainModel.ts` | Monotonia = média/desvio-padrão da carga diária da última semana; Strain = carga semanal total × monotonia | Foster, C. (1998), *Medicine & Science in Sports & Exercise* 30(7); Foster et al. (2001) |
| Sustained-TSB Injury Risk Model | `algorithms/accumulatedFatigueRiskModel.ts` | Conta dias consecutivos com TSB ≤ -15 (crítico ≤ -25); risco cresce com profundidade e duração da fadiga sustentada | Extensão independente do mesmo raciocínio de "TSB sustentado negativo" citado na literatura de carga de treino (ver também Foster/Gabbett acima) |
| Composite Readiness Model | `algorithms/readinessModel.ts` | Média ponderada de 3 componentes normalizados 0-100 (Recovery Score, TSB mapeado, ACWR mapeado à distância do "sweet spot" 1.05); pesos diferentes para prova (TSB 45%) vs. treino intenso (ACWR 35%) | Composição própria sobre sinais já calculados pelo Metrics/Prediction Engine |
| Linear Trend Goal Probability Model | `algorithms/goalProbabilityModel.ts` | Regressão linear projetada até a data-alvo; a margem relativa até o valor-alvo é convertida em probabilidade via função logística (`1/(1+e^(-6*margem))`, centrada em 50% quando a projeção acerta o alvo exatamente); a data estimada é onde a mesma reta cruza o alvo | Regressão linear + squashing logístico (método estatístico padrão) |

### Intervalos de confiança

Toda previsão numérica retorna `lowerBound`/`upperBound`, por uma de duas estratégias documentadas em `algorithms/shared/confidenceInterval.ts`:

1. **Intervalo estatístico real** (`regressionPredictionInterval`): para os algoritmos baseados em regressão OLS (Linear Trend Model), usa a fórmula clássica de intervalo de predição de regressão linear simples -- `SE_pred(x0) = s*sqrt(1 + 1/n + (x0-meanX)²/Sxx)`, margem = `1.645 * SE_pred(x0)` (~90% de predição) -- Draper & Smith, *Applied Regression Analysis*, 3ª ed.
2. **Banda heurística escalada por confiança** (`heuristicBound`): para classificações/scores sem modelo estatístico natural (Riegel, ACWR, monotonia, fadiga acumulada, prontidão), uma banda simétrica ao redor do valor que se estreita conforme a confiança cresce, explicitamente documentada como *não* um intervalo estatístico, mas uma forma de nunca deixar `lowerBound`/`upperBound` nulos sem justificativa.

---

## Fluxo de execução

```
Metrics Engine (MetricSeriesPoint[] / TrainingLoadPoint[])  ──┐
Activity Engine (Activity[] -> BestEffort[] pelo chamador)    ├─► predictors/
goals (GoalInput pelo chamador)                               ─┘        │
                                                                          ▼
                                             algorithms/*.ts (implementam PredictionModel)
                                                                          │
                                                                          ▼
                                              ModelOutput<T> { value, confidence,
                                              lowerBound, upperBound, assumptions,
                                              missingInputs }
                                                                          │
                                                                          ▼
                                        predictors/shared/predictionBuilder.ts
                                        (deriva id, category, expiresAt; funde
                                         missingInputs em assumptions)
                                                                          │
                                                                          ▼
                                                    Prediction<T> completo
                                             ┌────────────────────────────┴───────────────────────────┐
                                             ▼                                                          ▼
                                   consumidor em memória                                    services/predictionService.ts
                                   (ex.: hooks/assembleDailyBrief.ts)                        → repositories/predictionRepository.ts
                                                                                              → tabela `predictions` (Supabase)
```

Exemplo real (`hooks/assembleDailyBrief.ts`): `predictAcuteLoadRisk(ctl, atl, today)` e `predictRecoveryTime(ctl, atl, today)` alimentam tanto o `TrainingSignals`/`AlertSignals` do Coach Engine (via `injuryRiskLevel`/`acwr`) quanto a seção "Recovery" do Daily Brief -- a mesma previsão, consumida por dois lugares, nunca recalculada duas vezes.

---

## Tipos de previsão

Estrutura de toda `Prediction<T>` (`types/prediction.ts`), exatamente os campos pedidos:

```ts
interface Prediction<T> {
  id: string;                    // "prediction:<kind>:<data>[:<idSuffix>]"
  predictionType: PredictionType; // 1 dos ~20 valores (1 por sub-capacidade)
  category: PredictionCategory;   // race | fitness | threshold | recovery | injury_risk | goal | readiness
  value: T | null;
  confidence: number;             // 0-1
  lowerBound: number | null;
  upperBound: number | null;
  supportingMetrics: string[];    // "métricas utilizadas"
  supportingInsights: string[];   // ids de Insight do Intelligence Engine, se fornecidos pelo chamador (sempre [] nesta versão -- ver Limitações)
  assumptions: string[];          // premissas explícitas + missingInputs do modelo, com prefixo
  generatedAt: string;            // ISO, sempre fornecido pelo chamador -- nunca lido do relógio do sistema
  expiresAt: string;              // ISO, generatedAt + TTL da categoria (ou override explícito)
}
```

TTL padrão por categoria (`predictors/shared/predictionBuilder.ts`'s `DEFAULT_TTL_DAYS_BY_CATEGORY`): race/threshold/fitness 14-30 dias (tendências de semanas mudam pouco em poucos dias); goal 7 dias; injury_risk 3 dias; recovery/readiness 1 dia (inerentemente de curtíssimo prazo -- o TSB de hoje já é outro amanhã).

---

## Dependências

- **Nenhuma dependência de terceiros.** `algorithms/`, `predictors/`, `models/`, `validators/` são TypeScript puro.
- **`repositories/`** dependem de `api/supabaseClient.ts` (já existente, usado por todo o app).
- **`algorithms/atlDecayRecoveryModel.ts`** depende de `ATL_TIME_CONSTANT_DAYS`, a única constante pública importada do Metrics Engine (`../../metrics`) -- o mesmo contrato público que o engine antigo já usava.
- **Consumidores dentro do repositório:** `hooks/assembleDailyBrief.ts` (Race, Recovery e Injury Risk Predictors); `components/dailyBrief/{PredictionsSection,RecoverySection}.tsx` (apenas tipos); `engines/coach/raceStrategy.ts` (apenas `RACE_DISTANCES_KM`, uma constante, não uma previsão).
- **Tabela Supabase:** `predictions` (criada em `0002_treino_z2_extended_entities.sql`, `kind` CHECK ajustado em `0007_prediction_engine.sql`, agora estendida e com o CHECK removido por `0011_prediction_engine_predictions.sql` -- ver Governança #2 do `INTELLIGENCE_ENGINE_REPORT.md` para o precedente dessa decisão com `insights.category`).

---

## Limitações

1. **`supportingInsights` é sempre `[]` nesta versão.** O campo existe no tipo `Prediction<T>` (conforme pedido) como o slot onde um chamador poderia anexar ids de `Insight` do Intelligence Engine que embasaram a previsão (ex.: um `injury_risk_accumulated_fatigue` poderia referenciar o insight `fatigue_accumulated` correspondente), mas nenhum `predictor` neste engine busca Insights por conta própria -- isso exigiria uma dependência direta do Intelligence Engine, que `docs/ARCHITECTURE.md` proíbe explicitamente ("engines communicate through contracts, never direct dependencies"). Popular esse campo é responsabilidade de uma camada de orquestração futura que já tenha ambos os resultados em mãos.
2. **Goal Predictor não deriva `valueHistory` sozinho.** Recebe a série histórica já relevante à meta (ex.: histórico de tempo previsto de 5K, ou histórico de FTP) montada pelo chamador -- este engine não sabe, por si, qual métrica corresponde a qual `GoalKind`; essa correspondência (`5k` → histórico de previsão de 5K, `cycling_ftp` → histórico de FTP, etc.) precisa ser feita por quem chama `predictGoalAchievement`.
3. **Injury Risk Predictor produz 3 sinais independentes, não um score composto.** Foi uma decisão deliberada (ver `predictors/injuryRiskPredictor.ts`) para que o chamador veja qual fator específico (carga aguda, monotonia, fadiga acumulada) está motivando a preocupação -- mas significa que este engine não oferece hoje um único "risco de lesão" combinado; combinar os três (com um peso justificado) é trabalho de uma camada acima.
4. **Nenhum preditor roda automaticamente hoje**, com exceção de Race/Recovery/Injury Risk (Acute Load), que já alimentam o Daily Brief via `assembleDailyBrief.ts`. Fitness, Threshold, Goal, Readiness e os outros 2 sinais de Injury Risk (Monotony, Accumulated Fatigue) estão implementados, testados e exportados, mas ainda não têm um chamador de produção com dados reais.
5. **`daily_training_load` (entrada do Monotony Model) não tem uma fonte real hoje.** O Monotony Predictor espera `dailyLoads: number[]` (carga diária dos últimos 7+ dias) -- nem `assembleDailyBrief.ts` nem nenhum outro consumidor monta essa série ainda a partir de `Activity[]`/`daily_pmc`; é a mesma lacuna de agregação diária discutida na Limitação 4 do `METRICS_ENGINE_REPORT.md`.
6. **A tabela `predictions` grava o `value` estruturado em `value_json`, não em `predicted_value`.** `predicted_value`/`unit` (colunas legadas de `0002`) só são populadas quando `value` é um número solto -- nenhuma das ~20 previsões deste engine tem `value` como número solto (todas retornam um objeto com pelo menos 2 campos), então esse par de colunas fica sempre `null` na prática hoje; documentado explicitamente em `repositories/predictionRepository.ts`.

---

## Roadmap para Machine Learning

A interface `PredictionModel<TInput, TValue>` (`models/predictionModel.ts`) é a fronteira de troca deliberadamente preparada para isso: qualquer modelo de ML futuro só precisa satisfazer

```ts
interface PredictionModel<TInput, TValue> {
  readonly modelId: string;
  readonly version: string;
  predict(input: TInput): ModelOutput<TValue>; // { value, confidence, lowerBound, upperBound, assumptions, missingInputs }
}
```

e ser trocado na única linha de `predictors/*.ts` que hoje referencia o modelo estatístico correspondente -- nenhuma mudança em `types/`, `predictors/`, `services/` ou `repositories/` seria necessária. Por prioridade, os candidatos mais valiosos para uma primeira substituição:

1. **Race Predictor**: um modelo treinado sobre o histórico populacional de treino→corrida (não só a fórmula de Riegel, que ignora treino recente, terreno, condições) provavelmente reduz o erro de extrapolações distantes (ex.: 5K → maratona), hoje a fraqueza mais citada do modelo atual (`confidence` já decai propositalmente para refletir isso).
2. **Goal Probability Model**: hoje assume tendência linear constante; um modelo que incorpore sazonalidade de treino (blocos de base/build/peak/taper) daria estimativas de data mais realistas que uma reta.
3. **Injury Risk (composto)**: um modelo que combine ACWR, monotonia e fadiga acumulada (hoje três sinais independentes, ver Limitação 3) com pesos aprendidos, em vez de heurísticas fixas, é o caso de uso mais citado na literatura de ML aplicado a ciência do esporte.
4. **Readiness Model**: os pesos fixos (45%/40%/15% para prova, 50%/35%/15% para treino intenso) foram escolhidos por raciocínio de domínio, não ajustados a dados reais -- um modelo aprendido a partir de resultado real de sessões (RPE reportado, desempenho vs. previsão) poderia recalibrar esses pesos por atleta.
5. **Threshold/Fitness evolution**: uma vez que haja histórico suficiente por atleta, um modelo por-atleta (em vez do OLS genérico atual) poderia capturar taxas de adaptação individuais em vez de assumir que todo mundo responde ao treino da mesma forma.

Em todos os casos, a mudança seria estritamente aditiva: um novo arquivo em `algorithms/`, um novo objeto satisfazendo `PredictionModel`, e uma troca de referência em `predictors/`.

---

## Verificação final

```
$ npx tsc -b
 (sem erros)

$ npx vitest run --coverage
 Test Files  108 passed (108)
      Tests  670 passed (670)
 Statements: 99.31% | Branches: 96.56% | Functions: 100% | Lines: 99.56%
 src/prediction/** : 99.7% statements / 95.48% branches / 100% functions / 99.67% lines
   (threshold configurado em vite.config.ts: 90%+ em todas as dimensões)
 Nenhum threshold de cobertura falhou (services/api 100%, engines/hooks/utils/metrics/intelligence/prediction 90%, components 80%)

$ npm run lint
 (sem erros)

$ npm run build
 tsc -b && vite build
 ✓ built em 711ms
```

Migration `0011_prediction_engine_predictions.sql` verificada localmente contra PostgreSQL 16 (cadeia completa 0001→0011 reaplicada do zero, caminho de upsert idempotente testado -- linha legada preservada, nova linha inserida, re-upsert no mesmo `client_prediction_id` atualiza em vez de duplicar, migration reaplicável sem erros).

23 arquivos de teste novos em `src/prediction/tests/` (models/, algorithms/, validators/, predictors/, repositories/, services/), totalizando 140 testes, cobrindo os 8 algoritmos (incluindo suas fórmulas exatas via casos calculados manualmente), o `predictionBuilder`, os 7 preditores e as duas camadas de I/O, com o mesmo padrão de mock de Supabase já usado nos testes do Metrics/Intelligence Engine.
