# METRICS_ENGINE_REPORT.md

**Escopo:** reconstrução completa do Metrics Engine em `treino-z2/src/metrics/`, substituindo o antigo `treino-z2/src/engines/metrics/` (removido nesta mudança). Fonte oficial: `07_METRICS_ENGINE.md`, `04_DOMAIN_MODEL.md`, `05_DATABASE.md`, `03_ARCHITECTURE.md` (seções correspondentes do documento de especificação original, já usadas como referência em fases anteriores desta sessão — `docs/ARCHITECTURE.md` é a versão condensada mantida no repositório).

> Nota sobre os documentos citados: `03_ARCHITECTURE.md`, `04_DOMAIN_MODEL.md`, `05_DATABASE.md` e `07_METRICS_ENGINE.md` são seções nomeadas do documento de especificação original (não arquivos individuais versionados em `docs/`). O único arquivo de arquitetura versionado neste repositório é `docs/ARCHITECTURE.md`. As decisões abaixo seguem o conteúdo real dessas seções: "The Metrics Engine is responsible for transforming raw training data into objective physiological metrics. It performs calculations only" (07_METRICS_ENGINE.md, Purpose); "Every calculated metric should expose confidence, data_quality, required_inputs, missing_inputs" (07_METRICS_ENGINE.md, Confidence Scores); "Deterministic, Stateless, Pure calculations, Versioned algorithms, Fully testable, Explainable outputs" (07_METRICS_ENGINE.md, Design Principles); "Store raw data. Calculate intelligence elsewhere" (05_DATABASE.md, Database Philosophy).

## Governança: fonte exclusiva de cálculo

Toda métrica fisiológica calculada nesta aplicação é calculada exclusivamente em `src/metrics/`. Verificado via:

```
grep -rln "^export function calculate\|^export function analyze" src --include="*.ts" | grep -v "^src/metrics/"
```

Único resultado fora de `src/metrics/`: `engines/coach/workoutFeedback.ts`'s `analyzeWorkout` — gera feedback textual pós-treino a partir de métricas já calculadas (nunca recalcula nenhuma), consistente com o próprio cabeçalho desse arquivo ("It never calculates physiological metrics"). Nenhuma outra ocorrência.

O antigo `treino-z2/src/engines/metrics/` (9 arquivos, ~578 linhas) foi **removido por completo**, e todos os consumidores (`hooks/assembleDailyBrief.ts`; `components/dailyBrief/{RecoverySection,TrainingLoadSection,PredictionsSection}.tsx`; `engines/prediction/{injuryRisk,racePrediction,recoveryTime,thresholdProjection}.ts`) foram repontados para `src/metrics`.

---

## Arquitetura

```
src/metrics/
  types/         MetricResult<T> (envelope universal), ZoneTable/ZoneBand (sistema de zonas)
  validators/     guards reutilizáveis (isPositiveNumber, hasMinLength, isMonotonicNonDecreasing, ...)
  models/        objetos de entrada (MaximalEffort, LactateStage, DailyTrainingLoad, SessionLoadInput, ActivityRecordPoint)
  calculators/   1 arquivo por métrica -- puro, sem I/O, testável isoladamente
    shared/      matemática deduplicada usada por 2+ calculators (EWMA, regressão linear, interpolação de lactato, normalização por range próprio, montagem de tabela de zonas)
  analyzers/     compõem calculators sobre uma série (tendência de Training Load, classificação de zona, totais semanais)
  services/      única camada que toca Supabase -- orquestra repository -> calculator/analyzer -> repository
  repositories/  I/O Supabase para metrics_snapshots e lactate_test*
```

Por que essa separação: `calculators/` segue literalmente os "Design Principles" da spec (determinístico, stateless, cálculo puro) -- nenhum arquivo em `calculators/` ou `analyzers/` importa o cliente Supabase. `repositories/` é a única camada com I/O, e `services/` é a única camada que combina cálculo com persistência (ver `trainingLoadService.computeAndPersistTrainingLoad`, o único ponto do engine que calcula *e* grava).

---

## Métricas implementadas

| # | Métrica | Arquivo | Fórmula / Método | Referência |
|---|---|---|---|---|
| 1 | LT1 (limiar aeróbico) | `calculators/lt1Calculator.ts` | Interpolação linear no teste incremental até 2.0 mmol/L | Sjödin & Jacobs, 1981 |
| 2 | LT2 (limiar anaeróbico / OBLA) | `calculators/lt2Calculator.ts` | Interpolação linear até 4.0 mmol/L | Sjödin & Jacobs, 1981; Heck et al., 1985 |
| 3 | Critical Power | `calculators/criticalPowerCalculator.ts` | Regressão linear de trabalho (potência × duração) vs. duração; CP = slope, W' = intercept | Monod & Scherrer, 1965; Moritani et al., 1981 |
| 4 | FTP | `calculators/ftpCalculator.ts` | 95% da potência média de um esforço de ~20 min | Allen & Coggan, *Training and Racing with a Power Meter*, 3ª ed. |
| 5 | Pace Zones | `calculators/paceZonesCalculator.ts` | 7 zonas como % do Threshold Pace | Joe Friel, *The Triathlete's Training Bible* (adaptação de corrida via TrainingPeaks) |
| 6 | Heart Rate Zones | `calculators/heartRateZonesCalculator.ts` | 7 zonas como % da LTHR (Lactate Threshold Heart Rate) | Joe Friel, *The Triathlete's Training Bible* / *The Cyclist's Training Bible* |
| 7 | Power Zones | `calculators/powerZonesCalculator.ts` | 7 zonas como % do FTP | Allen & Coggan, *Training and Racing with a Power Meter* |
| 8 | CTL (Fitness) | `calculators/ctlCalculator.ts` | EWMA de Training Load diário, τ=42 dias | Banister, 1975 |
| 9 | ATL (Fatigue) | `calculators/atlCalculator.ts` | EWMA de Training Load diário, τ=7 dias | Banister, 1975 |
| 10 | TSB (Form) | `calculators/tsbCalculator.ts` | ctl - atl (mesmo dia) | Banister; popularizado por TrainingPeaks/Coggan |
| 11 | HR Drift | `calculators/hrDriftCalculator.ts` | Método Pa:HR -- razão pace:HR na 1ª vs. 2ª metade da atividade | Maffetone; popularizado por TrainingPeaks |
| 12 | Running Effectiveness | `calculators/runningEffectivenessCalculator.ts` | speed (m/min) / power (W/kg) | Definição de "Running Power" da Stryd |
| 13 | Efficiency Factor | `calculators/efficiencyFactorCalculator.ts` | Normalized Power (ou pace) / Average HR | Joe Friel, *The Triathlete's Training Bible* |
| 14 | Training Load (sessão) | `calculators/trainingLoadCalculator.ts` | TSS (potência) → hrTSS (HR) → session-RPE (fallback), nessa ordem de precisão | Coggan (TSS); TrainingPeaks (hrTSS); Foster et al., 2001 (session-RPE) |
| 15 | Recovery Score | `calculators/recoveryScoreCalculator.ts` | TSB normalizado 0-100, refinado por desvio de resting HR / HRV vs. baseline | Composição própria sobre TSB (Banister) + sinais de RecoverySnapshot |
| 16 | Fitness Score | `calculators/fitnessScoreCalculator.ts` | CTL normalizado contra o próprio range recente do atleta (min-max, 0-100) | Composição própria sobre CTL |
| 17 | Fatigue Score | `calculators/fatigueScoreCalculator.ts` | ATL normalizado contra o próprio range recente do atleta (min-max, 0-100) | Composição própria sobre ATL, simétrica ao Fitness Score |

Itens 1-2 (LT1/LT2) foram trazidos da implementação anterior (fora da lista original desta rodada, mas sem consumidor de código real antes desta mudança) para não perder capacidade já testada e para dar a `lactate_test_stages` (migration 0006, nunca lida por nada até agora) um caminho de leitura real via `lactateThresholdService`.

Toda métrica retorna `MetricResult<T> = { value, confidence, dataQuality, requiredInputs, missingInputs }`, conforme `07_METRICS_ENGINE.md`'s "Confidence Scores".

---

## Dependências

- **Nenhuma dependência de terceiros.** `calculators/` e `analyzers/` são TypeScript puro (confirmado via grep: nenhum import fora de `../`/`./`).
- **`repositories/`** dependem de `api/supabaseClient.ts` (já existente, usado por todo o app).
- **Consumidores dentro do repositório:**
  - `hooks/assembleDailyBrief.ts` -- `calculateFitnessScore`, `calculateRecoveryScore`, tipo `TrainingLoadPoint`.
  - `engines/prediction/*.ts` -- reusa apenas o envelope `MetricResult`/`metricResult`/`unavailableMetric` e a constante `ATL_TIME_CONSTANT_DAYS` (não recalcula métricas; usa o mesmo contrato de tipo para suas próprias previsões).
  - `components/dailyBrief/{RecoverySection,TrainingLoadSection,PredictionsSection}.tsx` -- apenas tipos.
- **Tabelas Supabase:** `metrics_snapshots` (migration 0001, colunas date/ctl/atl/tsb) e `lactate_tests`/`lactate_test_stages` (migration 0006) -- ambas já existiam; esta mudança é a primeira a de fato ler/escrever nelas.

---

## Fluxo de cálculo

Pipeline por métrica, seguindo `07_METRICS_ENGINE.md`'s "Processing Pipeline" (Raw Data → Validation → Cleaning → Normalization → Metric Calculations → Aggregation → Persistence → API):

```
Dado bruto (Activity[] / lactate_test_stages / DailyTrainingLoad[])
        │
        ▼
  validators/ (guards de entrada -- número positivo, tamanho mínimo, série monotônica)
        │
        ▼
  calculators/ (1 métrica por chamada, puro, retorna MetricResult<T>)
        │
        ▼
  analyzers/ (compõem vários calculators sobre uma série -- ex.: trainingLoadTrendAnalyzer
              chama ctlCalculator + atlCalculator + tsbCalculator por dia)
        │
        ▼
  services/ (opcional -- só para as duas métricas com fluxo real de persistência:
              Training Load via metrics_snapshots, LT1/LT2 via lactate_test_stages)
        │
        ▼
  repositories/ (leitura/escrita Supabase, só dentro de services/)
```

As 15 métricas restantes (zonas, FTP, Critical Power, HR Drift, Running Effectiveness, Efficiency
Factor, Recovery/Fitness/Fatigue Score) não têm uma tabela dedicada hoje -- são calculadas sob
demanda a partir de dados já em memória no chamador (ver Limitações).

---

## Entradas

| Camada | Entrada |
|---|---|
| Critical Power, FTP | `MaximalEffort[]` / `TwentyMinuteTestEffort` -- esforços máximos com duração e potência |
| Pace/HR/Power Zones | um único valor de limiar (threshold pace, LTHR, ou FTP) |
| CTL, ATL | `DailyTrainingLoad[]` -- série diária de Training Load (saída do próprio `trainingLoadCalculator`) |
| TSB | `ctl: number, atl: number` do mesmo dia |
| HR Drift | `ActivityRecordPoint[]` -- amostras de sensor (speed, heart rate, recorded_at) |
| Running Effectiveness | `speedMps, powerWatts, weightKg` |
| Efficiency Factor | `output (watts ou m/min), averageHeartRate` |
| Training Load (sessão) | `SessionLoadInput` -- duração + (potência+FTP) ou (HR+threshold HR) ou RPE |
| Recovery Score | `tsb` (obrigatório) + `restingHr/baseline`, `hrv/baseline` (opcionais) |
| Fitness Score / Fatigue Score | `ctl`/`atl` atual + histórico recente (`ctlHistory`/`atlHistory`) |
| LT1, LT2 | `LactateStage[]` -- estágios de teste incremental (stage, speed/power, HR, lactato) |

---

## Saídas

Toda saída é um `MetricResult<T>`. `T` varia por métrica:

- Zonas (Pace/HR/Power): `ZoneTable` -- 7 bandas com `{ zone, name, lowerBound, upperBound }`.
- Critical Power: `{ criticalPowerWatts, anaerobicWorkCapacityJ, rSquared }`.
- FTP, Running Effectiveness, Efficiency Factor, TSB, Recovery/Fitness/Fatigue Score: `number`.
- CTL, ATL: `EwmaPoint[]` (série completa `{ date, value }`).
- Training Load (sessão): `{ load, method, intensityFactor }` -- `method` documenta qual dos três algoritmos foi usado.
- HR Drift: `{ decouplingPercent, firstHalfRatio, secondHalfRatio }`.
- LT1/LT2: `{ intensity, intensityUnit, heartRate }`.
- `trainingLoadTrendAnalyzer`: `TrainingLoadPoint[]` -- CTL+ATL+TSB compostos por dia.

---

## Limitações

1. **Zonas HR/Power (7 zonas, Friel/Coggan) não se conectam ao `Activity.zoneMinutes` legado (5 zonas, `Z1`-`Z5`).** Esse campo vem de um provedor externo (edge function de sync do Strava) com seu próprio esquema de zonas; mapear 5→7 zonas de forma correta exigiria os streams brutos por segundo, não apenas o resumo já agregado. `zoneClassifierAnalyzer.computeTimeInZone` funciona com o novo sistema de 7 zonas, mas não é alimentado automaticamente pelos dados hoje sincronizados.
2. **A maioria das métricas não tem tabela de persistência própria.** Apenas Training Load (via `metrics_snapshots`) e LT1/LT2 (via `lactate_test_stages`, somente leitura) têm um `service`/`repository` real. FTP, Critical Power, zonas, HR Drift, Running Effectiveness e Efficiency Factor são recalculadas a cada chamada a partir de dados fornecidos pelo chamador -- não há histórico armazenado dessas métricas.
3. **`weeklyLoadAnalyzer` soma `Activity.rtss`, um valor calculado externamente (Strava), não pelo `trainingLoadCalculator` deste engine.** Ele lê um fato já computado (mesmo raciocínio que já se aplica a CTL/ATL/TSB lidos de `daily_pmc` em `assembleDailyBrief.ts`), não recalcula nada -- mas significa que o "Weekly Load" resultante não é, estritamente, uma soma de saídas deste engine.
4. **`hrTSS` (Training Load via HR) é uma aproximação estrutural, não uma medida direta.** Não corrige por deriva cardíaca dentro da sessão (ver HR Drift, que é uma métrica separada); documentado no próprio `missingInputs` do resultado.
5. **CTL/ATL calculados neste engine ainda não substituem os valores de `daily_pmc` consumidos por `assembleDailyBrief.ts`** -- aquele fluxo continua lendo CTL/ATL/TSB pré-calculados externamente (decisão já registrada em `PROJECT_AUDIT.md`/`GAP_ANALYSIS.md` de sessões anteriores). `trainingLoadService`/`ctlCalculator`/`atlCalculator` existem e estão testados, prontos para essa migração assim que a Activity Engine expuser um `DailyTrainingLoad[]` real por atleta.
6. **VO2max, Normalized Power, VDOT, Grade Adjusted Pace e Power Duration Curve** (listados em 07_METRICS_ENGINE.md's "Performance" category) não foram implementados nesta rodada -- fora da lista de 15 métricas solicitada.

---

## Próximos cálculos sugeridos

Por prioridade, seguindo `07_METRICS_ENGINE.md`'s "Future Metrics" e as categorias ainda não cobertas:

1. **Normalized Power** -- pré-requisito natural para tornar `trainingLoadCalculator`'s `power_tss` totalmente correto (hoje aceita `normalizedPowerWatts` como entrada já calculada; calculá-lo aqui fecharia o ciclo).
2. **VDOT / Race Equivalent** -- complementa Pace Zones com previsão de tempos de prova baseada em fisiologia, distinto do método puramente estatístico já usado pelo Prediction Engine (Riegel).
3. **Ligar `trainingLoadTrendAnalyzer` a uma fonte real de `DailyTrainingLoad[]`** (Activity Engine agregando `trainingLoadCalculator` por atividade) para que `assembleDailyBrief.ts` possa migrar de "ler CTL/ATL/TSB de `daily_pmc`" para "calcular via este engine", encerrando a Limitação 5.
4. **Migração 5→7 zonas** para os dados de `zoneMinutes` já sincronizados, ou uma segunda tabela para armazenar zone-minutes na resolução de 7 zonas quando streams brutos estiverem disponíveis.
5. **Monotony e Strain** (Foster et al.) -- métricas de variabilidade de carga semanal, mencionadas em 07_METRICS_ENGINE.md's "Training Load" category, complementares a CTL/ATL/TSB.
6. **Persistência de FTP/Critical Power/thresholds ao longo do tempo** -- hoje só `metrics_snapshots` (CTL/ATL/TSB) tem histórico gravado; uma tabela `athlete_thresholds_history` permitiria ao Intelligence Engine detectar tendências de FTP/CP da mesma forma que já detecta tendências de CTL.

---

## Verificação final

```
$ npx vitest run --coverage
 Test Files  79 passed (79)
      Tests  412 passed (412)
 Statements: 98.73% | Branches: 94.02% | Functions: 100% | Lines: 99.32%
 src/metrics/** : 90%+ em todas as dimensões (threshold configurado em vite.config.ts)
 Nenhum threshold de cobertura falhou (services/api 100%, engines/hooks/utils/metrics 90%, components 80%)

$ tsc -b
 (sem erros)

$ npm run lint
 (sem erros)
```

45 arquivos novos em `src/metrics/` (17 calculators + 5 helpers compartilhados + 3 analyzers + 2 services + 2 repositories + 5 models + 2 types + 2 validators + 7 barris `index.ts`), mais 32 arquivos de teste cobrindo cada um.
