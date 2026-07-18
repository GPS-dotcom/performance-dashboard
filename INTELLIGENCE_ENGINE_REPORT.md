# INTELLIGENCE_ENGINE_REPORT.md

**Escopo:** implementação completa do Intelligence Engine em `treino-z2/src/intelligence/`, substituindo o antigo `treino-z2/src/engines/intelligence/` (removido nesta mudança). Fonte oficial: `08_INTELLIGENCE_ENGINE.md`, `07_METRICS_ENGINE.md`, `04_DOMAIN_MODEL.md`, `03_ARCHITECTURE.md`, `19_INSIGHTS_LIBRARY.md` (seções nomeadas do documento de especificação original, já usadas como referência em fases anteriores desta sessão).

> Nota sobre os documentos citados: assim como no `METRICS_ENGINE_REPORT.md`, `03_ARCHITECTURE.md`, `04_DOMAIN_MODEL.md`, `07_METRICS_ENGINE.md`, `08_INTELLIGENCE_ENGINE.md` e `19_INSIGHTS_LIBRARY.md` são seções nomeadas do documento de especificação original, não arquivos individuais versionados em `docs/`. O único arquivo de arquitetura versionado neste repositório é `docs/ARCHITECTURE.md`. As decisões abaixo seguem o conteúdo real dessas seções: "The Intelligence Engine is the brain of Treino Z2. Unlike the Metrics Engine, which only calculates values, the Intelligence Engine interprets them in context" (08_INTELLIGENCE_ENGINE.md, Purpose); "The Intelligence Engine NEVER makes coaching decisions" (08_INTELLIGENCE_ENGINE.md); "Every insight contains: Title, Category, Description, Evidence, Confidence, Severity, Timestamp, Related Metrics, Suggested Action (optional)" (19_INSIGHTS_LIBRARY.md, Insight Structure).

## Governança: o Intelligence Engine não calcula métricas, nem gera texto solto, nem recomenda

Três invariantes explícitos do pedido, cada um verificado por grep sobre o código-fonte final:

**1. Nunca calcula uma métrica fisiológica.** Nenhum arquivo em `analyzers/`/`detectors/` chama uma função `calculate*` do Metrics Engine nem reimplementa uma fórmula fisiológica -- todos consomem `MetricSeriesPoint[]`/`TrainingLoadPoint[]` (saídas já prontas do Metrics Engine) ou `Activity[]` (dados brutos de sessão, para PRs/consistência/equipamento, que nunca foram um "cálculo" do Metrics Engine em primeiro lugar).

```
$ grep -rn "calculate[A-Z]" src/intelligence/analyzers src/intelligence/detectors
(nenhum resultado)
```

O caso mais delicado -- `recoveryAnalyzer`'s "recuperação acima/abaixo do esperado" -- foi resolvido comparando a *tendência* da série de Recovery Score com a *tendência* da série de TSB (ambas já calculadas pelo Metrics Engine), em vez de reimplementar a fórmula privada de `calculateRecoveryScore` para prever um valor "esperado". Ver `rules/recoveryRules.ts` para o raciocínio completo.

**2. Nenhum texto é gerado fora de `insights/insightTemplates.ts`.** Todo `title`/`description` de todo Insight vem de uma das ~27 funções de template ali, chamadas apenas através de `insights/insightBuilder.ts`'s `buildInsight()`. Nenhum analyzer/detector monta uma string de título/descrição inline.

```
$ grep -rn 'title:\s*["`]' src/intelligence/analyzers src/intelligence/detectors src/intelligence/repositories src/intelligence/services
(nenhum resultado)
```

**3. Nunca gera uma recomendação.** `Insight.relatedRecommendations` é sempre `[]` -- `insightBuilder.ts`'s `buildInsight()` é o único lugar que popula esse campo, e sempre com um array vazio, com um comentário citando DEC-0006 (gerar recomendações é responsabilidade exclusiva do Coach Engine).

O antigo `treino-z2/src/engines/intelligence/` (7 arquivos: `trend.ts`, `evolution.ts`, `plateau.ts`, `periodComparison.ts`, `persistence.ts`, `types.ts`, `index.ts`, mais seus testes) foi **removido por completo**, e o único consumidor real (`hooks/assembleDailyBrief.ts`) foi repontado para `src/intelligence`. `components/dailyBrief/{DailyBriefPage,InsightsSection}.tsx` e seus testes também foram migrados para a nova forma do `Insight`.

---

## Arquitetura

```
src/intelligence/
  types/         Insight (estrutura completa), MetricSeriesPoint/MetricPolarity, tipos de entrada por analisador
  rules/         todo threshold/regra de classificação, documentado, em exatamente um lugar
  insights/      insightBuilder.ts (única função que monta um Insight) + insightTemplates.ts (única fonte de texto)
  analyzers/     Trend, Consistency, Fatigue, Recovery, Performance, Training Block, Shoe
    shared/      matemática deduplicada (regressão linear, classificação de série/tendência)
  detectors/     Plateau Detector (estagnação, regressão, aceleração)
  services/      única camada que toca Supabase -- orquestra repository, nunca calcula
  repositories/  I/O Supabase para a tabela `insights`
  tests/         espelha 1:1 a estrutura acima (analyzers/, detectors/, insights/, rules/, repositories/, services/)
```

Por que essa separação: `rules/` isola cada limiar numérico (com sua justificativa documentada em comentário) do código que o usa, para que "todas as regras documentadas" e "sem regras duplicadas" sejam verificáveis por inspeção de um único arquivo por domínio. `insights/` é o único lugar autorizado a produzir texto -- todo analyzer/detector chama um template e passa o resultado para `buildInsight()`, nunca constrói um objeto `Insight` à mão. `analyzers/shared/trendMath.ts`'s `classifySeries()` é a única implementação de "ajustar uma reta e dizer se está subindo/descendo/estável"; tanto `trendAnalyzer` (tendência da série inteira) quanto `plateauDetector` (tendência da janela recente, para regressão/aceleração) e `performanceAnalyzer`/`recoveryAnalyzer` a reusam em vez de duplicar a regressão.

---

## Módulos implementados

| # | Módulo | Arquivo | Capacidades | Categoria(s) de Insight |
|---|---|---|---|---|
| 1 | Trend Analyzer | `analyzers/trendAnalyzer.ts` | evolução de fitness (CTL), de carga, de potência, de pace, de frequência cardíaca | fitness, training_load, physiology |
| 2 | Plateau Detector | `detectors/plateauDetector.ts` | estagnação (`detectStagnation`), regressão (`detectRegression`), evolução acelerada (`detectAcceleration`) | qualquer categoria passada pelo chamador |
| 3 | Consistency Analyzer | `analyzers/consistencyAnalyzer.ts` | frequência semanal, volume, aderência ao plano, regularidade | consistency |
| 4 | Fatigue Analyzer | `analyzers/fatigueAnalyzer.ts` | fadiga acumulada, recuperação insuficiente, excesso de carga | recovery, training_load |
| 5 | Recovery Analyzer | `analyzers/recoveryAnalyzer.ts` | recuperação acima/abaixo do esperado (Recovery Score vs. tendência do TSB) | recovery |
| 6 | Performance Analyzer | `analyzers/performanceAnalyzer.ts` | recordes pessoais, evolução por distância, por potência, por pace | performance |
| 7 | Training Block Analyzer | `analyzers/trainingBlockAnalyzer.ts` | comparar blocos/temporadas/ciclos (dois períodos ou o melhor entre N) | performance |
| 8 | Shoe Analyzer | `analyzers/shoeAnalyzer.ts` | desgaste (recomendação de troca), rendimento (diferença entre tênis), histórico de uso, PR com tênis novo | equipment |

Cada módulo é uma coleção de funções puras (`(dados, data) => Insight | Insight[] | null`), sem estado e sem I/O -- a persistência (quando desejada) é decisão do chamador, feita via `services/intelligenceService.ts`.

---

## Fluxo de execução

```
Metrics Engine (MetricSeriesPoint[] / TrainingLoadPoint[])  ──┐
Activity Engine (Activity[])                                  ├─► analyzers/ | detectors/
                                                               ─┘        │
                                                                          ▼
                                                          rules/ (thresholds decidem o quê/como classificar)
                                                                          │
                                                                          ▼
                                                     insights/insightTemplates.ts (texto determinístico)
                                                                          │
                                                                          ▼
                                                     insights/insightBuilder.ts (monta o Insight completo:
                                                     id, confidenceLevel, priority, relatedRecommendations=[])
                                                                          │
                                             ┌────────────────────────────┴───────────────────────────┐
                                             ▼                                                          ▼
                                   consumidor em memória                                    services/intelligenceService.ts
                                   (ex.: hooks/assembleDailyBrief.ts)                        → repositories/insightRepository.ts
                                                                                              → tabela `insights` (Supabase)
```

Exemplo real (`hooks/assembleDailyBrief.ts`): a série de CTL é classificada uma única vez (`classifySeries`) e o resultado é reaproveitado tanto para montar o Insight de tendência de fitness (`buildTrendInsight`) quanto para decidir o sinal bruto que o Coach Engine recebe (`TrainingSignals.atlTrend`) -- evitando rodar a mesma regressão duas vezes sobre os mesmos dados, seguindo o mesmo padrão de otimização já adotado no `PERFORMANCE_REPORT.md` desta sessão.

---

## Tipos de insight

Categorias (`InsightCategory`, 19_INSIGHTS_LIBRARY.md "Categories", 10 valores): `fitness`, `recovery`, `training_load`, `performance`, `efficiency`, `physiology`, `consistency`, `race_readiness`, `injury_risk`, `equipment`.

Severidades (`InsightSeverity`, "Severity Levels", 4 valores): `information`, `positive`, `warning`, `critical`.

Níveis de confiança (`ConfidenceLevel`, "Confidence Levels", 4 buckets derivados do score bruto 0-1 por `rules/confidenceRules.ts`): `very_high` (≥0.85), `high` (≥0.65), `moderate` (≥0.4), `low` (<0.4).

Prioridade (`InsightPriority`, "Insight Prioritization", 1=mais urgente): severidade `critical` sempre vira prioridade 1 (sobrepõe qualquer categoria); as demais seguem a ordem literal da spec -- 2 Injury Risk, 3 Recovery, 4 Race Readiness, 5 Performance, 6 Fitness, 7 Efficiency, 8 Equipment. As três categorias que este engine produz e que não estão nominadas nessa lista de 8 (`training_load`, `consistency`, `physiology`) foram posicionadas junto à categoria listada mais próxima em assunto/urgência: `training_load` ao lado de `recovery` (ambas descrevem o estado fisiológico atual), `consistency` ao lado de `fitness` (consistência é o que impulsiona a trajetória de fitness), `physiology` ao lado de `efficiency` (ambas são sinais de mecanismo, não de manchete) -- ver `rules/priorityRules.ts`.

Estrutura de cada Insight (`types/insight.ts`), conforme "Insight Structure" + extensões explicitamente pedidas:

```ts
interface Insight {
  id: string;                          // "insight:<kind>:<date>[:<idSuffix>]"
  category: InsightCategory;
  priority: InsightPriority;           // 1 (mais urgente) .. 8
  title: string;
  description: string;                 // a "explicação clara de como foi gerado" pedida
  evidence: string[];                  // números concretos por trás da conclusão (slope, R², contagens...)
  confidence: number;                  // 0-1, bruto
  confidenceLevel: ConfidenceLevel;
  relatedMetrics: string[];            // "métricas utilizadas"
  date: string;                        // YYYY-MM-DD
  severity: InsightSeverity;
  relatedRecommendations: string[];    // sempre [] -- ver Governança #3
}
```

`evidence` é o mecanismo concreto de "cada insight deve possuir explicação clara de como foi gerado": cada função de análise escreve, como string, os números exatos que levaram àquela conclusão (ex.: `"6 data points from 2026-06-01 to 2026-06-06"`, `"slope 2.000 per week (R² 0.98)"`, `"TSB -25.4, at/below -20 for 6 consecutive days"`), nunca apenas um resumo qualitativo.

---

## Dependências

- **Nenhuma dependência de terceiros.** `analyzers/`, `detectors/`, `insights/` e `rules/` são TypeScript puro.
- **`repositories/`** dependem de `api/supabaseClient.ts` (já existente, usado por todo o app).
- **Todo analyzer/detector depende de `insights/insightBuilder.ts` (e, através dele, de `rules/confidenceRules.ts` e `rules/priorityRules.ts`)** -- é o único ponto de acoplamento comum entre os 8 módulos, por design.
- **Consumidor dentro do repositório:** `hooks/assembleDailyBrief.ts` -- usa `classifySeries`, `buildTrendInsight`, `detectStagnation` para montar os insights do Daily Brief e para derivar os sinais brutos (`TrainingSignals`) que o Coach Engine consome.
- **Tabela Supabase:** `insights` (criada em `0001_treino_z2_core_schema.sql`, estendida por `0010_intelligence_engine_insights.sql` com `title`, `category`, `priority`, `evidence`, `client_insight_id` + índice único `(athlete_id, client_insight_id)` para upsert idempotente).

---

## Limitações

1. **`insights.severity` (constraint do banco) só aceita `'info'|'warning'|'critical'`.** A distinção de 4 níveis deste engine (`information` vs. `positive` vs. `warning` vs. `critical`) é, portanto, gravada com perda: tanto `information` quanto `positive` viram `info` na escrita. Na leitura, `info` é reconstruído como `information` (o mais conservador dos dois significados originais) -- a distinção exata `information`/`positive` de um insight já persistido não é recuperável a partir do banco. O valor rico de 4 níveis permanece correto em memória (nunca é perdido antes da escrita) e em `title`/`evidence`, que também são persistidos.
2. **Shoe Analyzer não tem uma entidade de "tênis" dedicada.** Opera sobre `Activity.shoe` (coluna de texto livre, hoje pouco usada) via um tipo de entrada local (`ActivityWithShoe`) -- não há normalização de nome de tênis (ex.: "Pegasus 40" vs. "pegasus40" contam como tênis diferentes) nem uma tabela `shoes` com mileage acumulado independente de recálculo a cada chamada.
3. **`relatedRecommendations` é estruturalmente sempre vazio.** O campo existe no tipo `Insight` (conforme pedido: "recomendações relacionadas") como o slot que um consumidor futuro (Coach Engine) poderia preencher ao associar uma recomendação já gerada a um insight, mas este engine nunca o escreve -- population desse campo é, por design (DEC-0006), responsabilidade de uma camada de orquestração fora deste engine, ainda não implementada.
4. **Consistency Analyzer depende de um `WeeklyTrainingSummary[]` já agregado pelo chamador.** Este engine não deriva "sessões por semana" a partir de `Activity[]` bruto -- essa agregação (que já existe como `weeklyLoadAnalyzer` no Metrics Engine) é responsabilidade de quem chama, para não duplicar lógica de agregação temporal entre os dois engines.
5. **Training Block Analyzer não define automaticamente o que é um "bloco"/"temporada"/"ciclo".** Recebe `NamedPeriod[]` já delimitados pelo chamador (`{ label, series }`); a lógica de "onde um bloco de treino começa e termina" (ex.: baseado em `training_plans`/`workout_steps`) não existe ainda em nenhum engine deste repositório.
6. **Nenhum analyzer roda automaticamente hoje.** Como o Metrics Engine antes dele, este é um conjunto de funções puras chamadas sob demanda por quem tem os dados (`hooks/assembleDailyBrief.ts` hoje só chama Trend Analyzer e Plateau Detector para CTL/ATL) -- Consistency, Fatigue, Recovery, Performance, Training Block e Shoe Analyzer estão implementados, testados e exportados, mas ainda não têm um chamador de produção que os invoque com dados reais do app.

---

## Roadmap de evolução

Por prioridade, seguindo `08_INTELLIGENCE_ENGINE.md` e as lacunas da seção Limitações:

1. **Conectar os 6 analisadores ainda não chamados em produção** (Consistency, Fatigue, Recovery, Performance, Training Block, Shoe) ao Daily Brief ou a uma nova superfície de UI -- hoje só Trend/Plateau alimentam `assembleDailyBrief.ts`.
2. **Job de geração periódica de insights**, via `services/intelligenceService.ts`'s `persistInsights`, rodando após cada sincronização de atividades/métricas (em vez de apenas gerar insights sob demanda na leitura do Daily Brief).
3. **Resolver a Limitação 1** (severidade `positive`/`information` perdida na escrita) ampliando o `CHECK` constraint de `insights.severity` para os 4 valores reais deste engine, evitando o mapeamento com perda.
4. **Entidade `shoes` dedicada** (mileage acumulado incrementalmente, nome normalizado) para dar ao Shoe Analyzer uma fonte de dados mais confiável que `Activity.shoe` texto livre.
5. **Definição automática de blocos de treino** a partir de `training_plans`, para que o Training Block Analyzer possa comparar períodos sem exigir que o chamador delimite manualmente cada `NamedPeriod`.
6. **Conectar `relatedRecommendations`** quando o Coach Engine ganhar uma camada de orquestração que associe uma recomendação já gerada de volta ao(s) insight(s) que a motivaram.

---

## Verificação final

```
$ npx tsc -b
 (sem erros)

$ npx vitest run --coverage
 Test Files  90 passed (90)
      Tests  561 passed (561)
 Statements: 99.11% | Branches: 96.2% | Functions: 100% | Lines: 99.56%
 src/intelligence/** : 99.76% statements / 98.45% branches / 100% functions / 100% lines
   (threshold configurado em vite.config.ts: 90%+ em todas as dimensões)
 Nenhum threshold de cobertura falhou (services/api 100%, engines/hooks/utils/metrics/intelligence 90%, components 80%)

$ npm run lint
 (sem erros)

$ npm run build
 tsc -b && vite build
 ✓ built in 224ms
```

16 arquivos de teste novos em `src/intelligence/tests/` (analyzers/, detectors/, insights/, rules/, repositories/, services/), totalizando 173 testes, cobrindo cada um dos 8 módulos, os dois módulos de `rules/` com lógica não trivial (`confidenceRules`, `priorityRules`), as ~27 funções de template, o `insightBuilder`, a matemática compartilhada (`linearRegression`, `classifySeries`) e as duas camadas de I/O (`insightRepository`, `intelligenceService`), com o mesmo padrão de mock de Supabase já usado nos testes do Metrics Engine.
