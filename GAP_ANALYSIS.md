# GAP_ANALYSIS.md

Comparação entre a implementação atual (`index.html` + `treino-z2/` + `supabase/migrations/`) e a arquitetura oficial documentada em `/docs` (`docs/ARCHITECTURE.md`, condensado da spec `Performance.MD`/"Performance OS"). `docs/ARCHITECTURE.md` é tratado aqui como fonte de verdade. Nenhum código foi alterado como parte desta análise.

Estado do código refletido: pós-reorganização de `treino-z2/src/` em `engines/api/services/components/hooks/utils` (ver `REFACTOR_REPORT.md`).

---

## Resumo visual — status por engine/entidade

| Peça da arquitetura (docs) | Status | Onde está (ou não está) |
|---|---|---|
| Sync Engine | ⛔ Fora do repo | Função Supabase `clever-api`, opaca, não versionada aqui |
| Activity Engine | 🟡 Parcial | Tabela `strava_activities` real; sem módulo/validação dedicados |
| Metrics Engine | 🟡 Parcial | `treino-z2/src/engines/metrics/metricsEngine.ts` — só zonas/resumo semanal; CTL/ATL/TSB calculado fora |
| Intelligence Engine | ⛔ Ausente | Só um análogo ad hoc (`analyzeExecution` em `index.html`), sem confidence/persistência |
| Prediction Engine | 🟡 Parcial | Riegel/best efforts em `index.html`, inline, não portado, não persistido |
| Coach Engine / Daily Brief | ⛔ Ausente | Nenhuma recomendação, nenhuma tela "Daily Brief" |
| API Layer | ⛔ Ausente | Frontend fala direto com Supabase; sem camada de API própria |
| Auth (User) | ⛔ Ausente | Nenhum login; atleta único hardcoded nos dois apps |
| Athlete | 🟡 Parcial | Tabela `athletes` desenhada (migration 0001), não aplicada; perfil hoje é constantes no código |
| Device | ⛔ Ausente | Nenhuma tabela, nenhum código |
| Activity | 🟡 Parcial | `strava_activities` real (formato Strava); `activities` genérica desenhada, não aplicada |
| Workout | ⛔ Ausente no banco | Só `localStorage` no `index.html`; tabela `workouts` desenhada, não aplicada |
| Workout Step | ⛔ Ausente | Sem entidade própria |
| Training Plan | ⛔ Ausente | Hardcoded (`WEEKS` em `index.html`), não é dado |
| Goal | ⛔ Ausente | Hardcoded (`RACE_DATE`), não é dado |
| Metrics Snapshot | 🟡 Parcial | `daily_pmc` real, só 3 campos (ctl/atl/tsb) dos ~7 do spec |
| Recovery Snapshot | ⛔ Ausente | Nenhum dado de sono/HRV em lugar nenhum |
| Prediction (persistida) | ⛔ Ausente | Calculada on-the-fly, nunca salva |
| Insight | ⛔ Ausente | Sem entidade, sem confidence score |
| Notification | ⛔ Ausente | Nenhum sistema de notificação |
| AI Conversation / AI Assistant | ⛔ Ausente | Zero funcionalidade de IA em todo o repositório |
| RLS | 🟡 Parcial | Definido na migration nova (não aplicada); não verificado nas tabelas reais |
| Tech stack (React/Supabase/PostgreSQL/Strava/Chart.js) | ✅ Implementado | Presente nos dois apps |

---

## 1. O que já está implementado

### Alta confiança de match com a doc

1. **Stack tecnológica base** — React, Supabase, PostgreSQL (via Supabase), Strava API (via edge function externa), Chart.js. Bate exatamente com a seção "Technology Stack — Current" da doc.
2. **Classificação de zona de treino** (`treino-z2/src/engines/metrics/metricsEngine.ts::classifyActivityZone`/`activityZoneMinutes`) — cálculo determinístico, puro, testado (`__tests__/metricsEngine.test.ts`). É o pedaço que mais fielmente segue os "Design rules" da seção Metrics Engine da doc (deterministic, stateless, pure, fully testable).
3. **Best efforts reais do Strava + extrapolação Riegel** (`index.html`, `realBestEfforts`/`riegelPredictSec`/`buildRacePredictions`) — cobre parte da categoria "Race Equivalents / Best Efforts" da doc, com dados reais (não inventados) quando disponíveis.
4. **CTL/ATL/TSB como conceito de Training Load** — os três números existem e são exibidos nos dois apps (`daily_pmc` → `MetricsSnapshot`), alinhado à categoria "Training Load" da doc, embora *quem calcula* esses números não esteja neste repositório (ver seção 2).
5. **HTTPS everywhere / Row Level Security desenhado** — infraestrutura Supabase serve tudo em HTTPS por padrão; a migration nova (`supabase/migrations/0001_treino_z2_core_schema.sql`) já implementa RLS por `auth.uid()` em todas as tabelas que define, seguindo a seção "Security" da doc — mesmo que ainda não aplicada ao banco real.

---

## 2. O que está parcialmente implementado

Ordenado por prioridade (Alta = maior risco/impacto se ficar assim; Baixa = aceitável ficar parcial por mais tempo).

### Prioridade Alta

1. **Metrics Engine calcula só uma fração do que deveria, e não é dono do cálculo mais importante.** `treino-z2/src/engines/metrics/metricsEngine.ts` cobre zonas e resumo semanal — mas CTL/ATL/TSB, o dado central de todo o produto, é calculado pela edge function `clever-api` (fora do repositório, opaca) e só *lido* aqui. Isso viola diretamente a Decisão DEC-0002 da spec ("Metrics são calculadas só pelo Metrics Engine. Nenhum outro componente pode gerar métricas fisiológicas."). Hoje há dois "calculadores" de métrica: a edge function (não versionada) e o `treino-z2` (versionado, mas incompleto).
2. **`Activity` só existe no formato Strava-específico (`strava_activities`), não no formato genérico da spec.** A tabela `activities` (multi-provider, com `provider`/`external_id`) está desenhada na migration 0001 mas nunca foi aplicada nem populada. Enquanto isso, tudo depende do formato bruto de uma única fonte (Strava), contrariando a meta de "Provider Agnostic" da doc.
3. **`Athlete` existe como conceito, não como dado.** Perfil fisiológico (FTP, VO2max, threshold pace/power, max HR) está hardcoded em constantes no `index.html` (`VDOT`, `FTP`, tabela "Âncoras fisiológicas") em vez de ser um registro de `Athlete` consultável/editável. A tabela `athletes` existe na migration, não aplicada, e nenhum código (nem `index.html`, nem `treino-z2`) a usa.
4. **`Metrics Snapshot` cobre só 3 dos ~7 campos que a doc especifica.** `daily_pmc` (real) e `metrics_snapshots` (desenhada) têm `ctl`/`atl`/`tsb` — faltam `training_load`, `fitness` (como campo derivado explícito), `running_economy`, `efficiency_factor`, `decoupling`, todos citados explicitamente na doc.

### Prioridade Média

5. **Prediction Engine existe como função solta, não como engine.** A lógica de Riegel e best efforts (`index.html`) faz o que a doc pede da categoria "Race Equivalents", mas vive inline numa página de UI, não como módulo isolado e testável, não foi portada para `treino-z2`, e o resultado nunca é persistido como entidade `Prediction`.
6. **RLS desenhado só para o schema novo, não confirmado no schema real em produção.** A migration 0001 tem RLS completo — mas as tabelas que o app realmente usa hoje (`strava_activities`, `daily_pmc`) não têm RLS verificado (já registrado como risco em `PROJECT_AUDIT.md`).

### Prioridade Baixa

7. **Imutabilidade de dado histórico é uma convenção, não uma garantia.** A doc pede "Activity — raw imported session, never modified after import" como regra de design; no código atual isso é respeitado por convenção (nenhum caminho de código escreve em `strava_activities` fora da edge function), mas não há constraint de banco nem trigger que **impeça** uma escrita futura acidental.

---

## 3. O que falta implementar

### Prioridade Alta

1. **Persistência real do Training Log (calendário de treinos planejados).** Hoje vive só em `localStorage` do navegador no `index.html` — não existe em `treino-z2`, não sincroniza entre dispositivos, não tem entidade `Workout`/`Workout Step` no banco apesar de a tabela `workouts` já estar desenhada na migration 0001. É dado real que o usuário levou tempo cadastrando manualmente, sem backup.
2. **Autenticação (Supabase Auth).** A doc lista Auth como parte do stack "Current" e como controle de segurança obrigatório — mas nenhum dos dois apps tem tela de login; ambos assumem um único atleta implícito. Sem isso, a tabela `athletes` (que referencia `auth.users`) não pode nem ser populada de verdade.
3. **Sync Engine dentro do repositório (ou ao menos seu contrato documentado).** Hoje é uma função Supabase opaca (`clever-api`) fora de qualquer controle de versão visível aqui — não auditável, não testável, não segue o resto da arquitetura em camadas que o resto do projeto está adotando.

### Prioridade Média

4. **`Goal` e `Training Plan` como dados, não como constantes.** `RACE_DATE` e o array `WEEKS` (16 semanas de plano fixo) estão hardcoded no `index.html`. Isso trava o dashboard a um único atleta com um único objetivo de corrida, e impede qualquer futuro de múltiplos atletas/objetivos.
5. **Metadados de confiança em métricas calculadas.** A doc exige que toda métrica calculada exponha `confidence`, `data_quality`, `required_inputs`, `missing_inputs`. Nenhuma métrica em nenhum dos dois apps expõe isso hoje — todo número é exibido "cru".
6. **`Recovery Snapshot`.** Nenhum dado de sono/HRV/recovery score é capturado, calculado ou exibido em lugar nenhum — categoria inteira ausente (e vai continuar ausente até existir integração com Whoop/Oura/Garmin, que também não existe).
7. **`Device`.** Nenhuma modelagem de dispositivos conectados (hoje só Strava, via edge function, sem tabela de dispositivos).

### Prioridade Baixa (funcionalidades de plataforma maior — não bloqueiam o MVP atual)

8. **Intelligence Engine** (insights com confidence/explicação/severidade, detecção de tendência, personalização).
9. **Coach Engine + Daily Brief** — a doc explicitamente escolhe o Daily Brief em vez de um dashboard de métricas como tela principal (DEC-0004); hoje os dois apps são exatamente o padrão que a decisão rejeitou.
10. **AI Assistant / AI Conversation** — o pilar "AI-first" da visão do produto não tem nenhuma implementação: sem prompts, sem system prompt, sem histórico de conversa, sem nenhuma chamada a LLM em lugar nenhum do código.
11. **Notification** — sem sistema de notificação (in-app, push ou email).
12. **Cauda longa de métricas fisiológicas avançadas** — VO2max calculado, Critical Power/Speed, Running Economy, Efficiency Factor, Normalized Power, GAP, Power-Duration Curve, HR Drift, HRR, Aerobic Decoupling, Cardiac Efficiency, métricas específicas de corrida (cadência, GCT, oscilação vertical) e de ciclismo (IF, VI, torque effectiveness), Monotony/Strain, métricas de consistência (frequência, compliance, streaks). Nenhuma dessas ~20 métricas está implementada.
13. **API Layer própria.** Hoje o frontend fala direto com o Supabase (REST via `@supabase/supabase-js`) sem nenhuma camada de API que sirva de "único ponto de entrada", como a doc pede em `API.md` ("The API is the only entry point into the system"). É uma decisão arquitetural grande (adicionar um backend) — por isso prioridade baixa por ora, mas vale registrar como divergência.
14. **Multi-provider sync** (Garmin, TrainingPeaks, Whoop, Oura, Polar, Coros, Apple Health, Google Fit) — só Strava existe.

---

## 4. O que precisa ser removido

### Prioridade Alta

1. **Anon key do Supabase hardcoded em texto puro em `index.html`.** Versionada no Git, servida como site estático. Ainda que chaves anônimas sejam feitas para ser públicas quando protegidas por RLS, isso só é seguro se RLS estiver de fato habilitado nas tabelas que ela acessa (`strava_activities`, `daily_pmc`) — não verificado. Já registrado como risco em `PROJECT_AUDIT.md`; aqui reforçado porque a doc lista "Encrypted Secrets" como princípio de segurança explícito, e uma chave em texto puro versionada é o oposto disso, independente do RLS.
2. **`localStorage` como fonte de verdade para o calendário de treinos.** A doc é explícita: "Historical data is immutable" e o dado deveria estar no banco (`Workout`). Manter `localStorage` como persistência primária contradiz "Single Source of Truth" — deve ser removido assim que a tabela `workouts` estiver em uso (ver seção 3, item 1).

### Prioridade Média

3. **Constantes de plano/atleta hardcoded no código** (`RACE_DATE`, `WEEKS`, `VDOT`, `FTP`, a tabela "Âncoras fisiológicas" em `index.html`). A doc é explícita: "The database should never contain duplicated derived values... Store raw data. Calculate intelligence elsewhere." — o inverso também vale: dado de atleta/plano não deveria estar hardcoded no código-fonte, deveria vir do banco (`Athlete`, `Goal`, `Training Plan`). Remover depois que essas entidades existirem de verdade (depende da seção 3).
4. **Uma das duas definições de zona fisiológica duplicadas** (`ZONE_DEFS` em `index.html` vs `DEFAULT_ZONES` em `treino-z2/src/engines/metrics/metricsEngine.ts`). Viola "Single Source of Truth", princípio-guia citado nominalmente na doc. Não dá pra simplesmente apagar uma sem decidir primeiro qual app é a fonte de verdade (ver seção 5, item 1) — por isso está listado aqui como "precisa ser removida" (a duplicata) mas depende de uma decisão de refatoração antes.

### Já resolvido (não é mais gap — registrado para continuidade)

5. ~~Dependência `playwright` não utilizada em `treino-z2/package.json`~~ — já removida no refactor anterior (`REFACTOR_REPORT.md`, seção 5).

---

## 5. O que precisa ser refatorado

### Prioridade Alta

1. **Decidir o destino do `index.html` e agir de acordo.** Enquanto os dois apps evoluírem em paralelo sem essa decisão, toda nova duplicação encontrada aqui vai se repetir a cada gap analysis futura. Ou (a) `index.html` é tratado como legado congelado e `treino-z2` recebe port de toda a funcionalidade que falta (Training Log, sync, predictions — ver seção 3), ou (b) o esforço de arquitetura vai continuar sendo gasto duas vezes.
2. **Extrair a lógica de cálculo de CTL/ATL/TSB para dentro do Metrics Engine versionado**, tirando-a da edge function opaca (ou, no mínimo, versionar o código da edge function neste repositório). Necessário para cumprir DEC-0002 e para que o "Metrics Engine" do `docs/ARCHITECTURE.md` deixe de ser, na prática, só um wrapper de leitura.

### Prioridade Média

3. **Extrair a lógica de Prediction (Riegel + best efforts) de `index.html` para um módulo próprio**, testável, e portá-la para `treino-z2` — hoje é a única categoria de metrics/engine com lógica real que ainda não tem nenhum equivalente na base de código nova.
4. **Atualizar `docs/ARCHITECTURE.md`** — a seção final ("What exists in this repo today") ainda descreve `treino-z2` com a estrutura anterior à reorganização (fala em "a `metricsEngine` domain module" e "a repository layer"; hoje são `engines/metrics/metricsEngine.ts` e `services/activityService.ts`, ver `REFACTOR_REPORT.md`). Documentação sobre a própria arquitetura desatualizada em relação ao código é um risco recorrente — vale um passo de manutenção regular, não só um fix pontual.
5. **Formalizar uma camada de API**, mesmo que fina no início, para que o frontend pare de falar direto com o Supabase — alinhado ao princípio "API First" / "the only entry point into the system" da doc. Não precisa ser feito de uma vez; pode começar pelas rotas que hoje já têm lógica não trivial (ex.: predictions, quando existirem no `treino-z2`).

### Prioridade Baixa

6. **Padronizar helpers de formatação (pace, duração) numa única implementação compartilhada**, se e quando a decisão do item 1 desta seção for "compartilhar código entre os dois apps". Sem essa decisão, não vale a pena mexer agora.

---

## Nota metodológica

Esta análise compara **o que está no código** com **o que está documentado em `docs/ARCHITECTURE.md`**, que por sua vez é um resumo condensado de uma spec de 236 páginas (`Performance.MD`) não presente neste repositório. Itens muito granulares da spec original (ex.: sub-métricas específicas de ciclismo, prompts de IA) foram agrupados aqui em vez de listados um a um, para manter o documento acionável. Nenhuma implementação foi feita como parte desta análise.
