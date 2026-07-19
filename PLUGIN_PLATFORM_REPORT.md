# PLUGIN_PLATFORM_REPORT.md

## Governança: o núcleo não depende de plugins

Todo o código sob `src/{metrics,intelligence,prediction,coach}/` (os 4
Engines) e `src/dashboard/**` (exceto os 2 arquivos listados abaixo)
segue exatamente como estava antes desta fase — **zero imports de
`src/platform/` foram adicionados a qualquer Engine**, e apenas 2 arquivos
do Dashboard tocam a plataforma de plugins, ambos através de abstrações
genéricas do SDK, nunca de um plugin específico:

- `dashboard/widgets/PluginWidgetSlot.tsx` — lê `widgetExtensionPoint.list()`.
- `dashboard/pages/SettingsPage.tsx` — lê `appPluginManager.list()` e monta `<PluginWidgetSlot slot="settings" />`.

Verificado explicitamente nesta fase (`grep -rln "platform" dashboard/`)
e reproduzível a qualquer momento. Nenhum plugin (nem mesmo o de exemplo,
`platform/examples/shoeRetirementCelebrationPlugin.ts`) é importado por
nenhum arquivo de `dashboard/` ou de qualquer Engine — o app roda hoje
com **zero plugins instalados por padrão**.

Nota de governança repetida em todo relatório desta sessão: `docs/`
contém fisicamente apenas `ARCHITECTURE.md` mais os 4 documentos criados
nesta fase (`PLUGIN_SDK.md`, `PLUGIN_API.md`, `PLUGIN_DEVELOPER_GUIDE.md`,
`PLUGIN_EXAMPLES.md`). Não existe um "Performance.MD" com uma seção de
plugins sendo resumida aqui — esta é a fonte primária da arquitetura de
plugins, desenhada do zero para este pedido.

## Arquitetura

```
src/platform/
  sdk/            Interfaces, tipos, contratos, ciclo de vida, permissões, registro automático
    types/          manifest.ts, permissions.ts, lifecycle.ts, context.ts
    contracts/       plugin.ts (IPlugin), extensions.ts (7 contratos), registrar.ts (ExtensionRegistrar)
    registry/        pluginRegistry.ts (definePlugin -- registro automático)
  events/          Event Bus
    eventBus.ts      EventBus<T> genérico (publish/subscribe/once/clear)
    types.ts          PlatformEventMap (ActivityImported, MetricsCalculated, PredictionGenerated,
                       RecommendationCreated, RaceCompleted, ShoeRetired, Plugin*)
    platformEventBus.ts  instância única compartilhada pelo app
  manager/         Plugin Manager
    pluginManager.ts      install/enable/disable/uninstall/updateConfig/get/list
    dependencyResolver.ts  ordenação topológica + detecção de ciclo/dependência ausente
    configStore.ts          PluginConfigStore (localStorage + in-memory)
    pluginContextFactory.ts  constrói o PluginContext isolado de cada plugin
    scopedRegistrar.ts       rastreia contribuições por plugin para revogação automática
    appPluginManager.ts      instância única compartilhada pelo app
  extensions/      7 pontos de extensão
    extensionPointBase.ts   registro genérico id-keyed (contribute/revoke/list/get)
    points.ts                as 7 instâncias (dashboardPages, widgets, metrics, insights,
                              recommendations, integrations, aiCommands)
    liveExtensionRegistrar.ts  monta o ExtensionRegistrar real
  marketplace/     Preparação para marketplace futuro
    manifestValidation.ts   validatePluginManifest
    compatibilityChecker.ts  checkHostCompatibility
    signature.ts              verifyPluginSignature (pluggable, sem crypto real ainda)
    permissionCatalog.ts       catálogo humano de cada PermissionScope
  examples/        Plugin de referência, totalmente testado
  tests/           Espelha toda a estrutura acima
```

### Inversão de dependência, na prática

```
                     ┌────────────────────────┐
                     │   sdk/ (interfaces)     │  ◄── nem plugin nem core
                     └────────────────────────┘
                        ▲                  ▲
          implementa    │                  │  implementa/consome
                        │                  │
        ┌───────────────┘                  └───────────────┐
        │                                                    │
  Um Plugin (ex: shoeRetirementCelebration)         Core (Plugin Manager,
  nunca importa metrics/intelligence/               Dashboard's PluginWidgetSlot)
  prediction/coach/dashboard diretamente             nunca importa um plugin
                                                       específico
```

Nem o core nem um plugin dependem um do outro diretamente — ambos
dependem apenas das interfaces em `sdk/`. O Plugin Manager é o único
componente que conhece os dois lados (recebe um `IPlugin` de fora,
entrega um `PluginContext`/`ExtensionRegistrar` de dentro).

## Ciclo de vida dos plugins

```
registered ──install()──► installed ──enable()──► enabled
                              │  ▲                    │
                              │  └──────disable()──────┘
                              │
                         uninstall()
                              │
                              ▼
                        uninstalled
```

`error` é alcançável de qualquer estado ativo quando um hook lança uma
exceção. `sdk/types/lifecycle.ts`'s `canTransition(from, to)` é a única
fonte de verdade sobre quais transições são legais — o Plugin Manager
nunca decide isso inline.

**Isolamento (FASE 3):** falhas em `install()` são propagadas (erro de
instalação é bug do chamador, deve ser visível). Falhas em `enable()`,
`disable()` e `uninstall()` são capturadas, gravadas no próprio registro
do plugin (`state: "error"`, `errorMessage`), publicadas como evento
`PluginError`, e **nunca relançadas** — um plugin quebrado nunca impede o
chamador de gerenciar os demais. Contribuições parciais de um `enable()`
que lançou exceção são revogadas antes do estado virar `"error"`
(`scopedRegistrar.revokeAll()`).

## APIs públicas

Referência completa em `docs/PLUGIN_API.md`; resumo:

- **Event Bus**: `EventBus<TEventMap>` genérico + `platformEventBus`
  (instância real, tipada sobre `PlatformEventMap`) + 11 tipos de evento
  (6 pedidos explicitamente + 5 de ciclo de vida de plugin).
- **Plugin Manager**: `PluginManager` (install/enable/disable/uninstall/
  updateConfig/get/list) + `appPluginManager` (instância compartilhada) +
  `resolveDependencyOrder` (ordenação topológica pura) +
  `PluginConfigStore` (localStorage + in-memory).
- **Extension Points**: 7 registros genéricos id-keyed
  (`contribute`/`revoke`/`list`/`get`), montados em `liveExtensionRegistrar`.
- **Marketplace**: `validatePluginManifest`, `checkHostCompatibility`,
  `verifyPluginSignature`, `PERMISSION_CATALOG`.

## Exemplos de uso

`docs/PLUGIN_EXAMPLES.md` tem o código completo. Resumo: um plugin real e
totalmente testado (`shoeRetirementCelebrationPlugin` — reage ao evento
`ShoeRetired`, contribui um widget, persiste configuração) mais 6
trechos ilustrativos (um por extensionPoint restante: dashboard page,
metric, insight, recommendation, integration, ai-command).

```ts
const manager = new PluginManager({ hostVersion: "1.0.0" });
await manager.install(createShoeRetirementCelebrationPlugin());
await manager.enable("com.example.shoe-retirement-celebration");
// Settings → Plugins já lista o plugin; seu widget aparece no slot
// "settings" -- nenhum arquivo do Dashboard precisou ser editado.
```

## Limitações

1. **Sem aprovação de permissões via UI**: `install()` concede hoje
   exatamente o que o manifesto pede (política MVP), sem um fluxo
   "este plugin quer: ... [permitir/negar]". `grantedPermissions` já
   existe como campo próprio no registro do plugin especificamente para
   que essa UI possa ser adicionada depois sem mudar a assinatura de
   `install()`.
2. **Sem verificação criptográfica de assinatura real**: `verifyPluginSignature`
   é pluggable, mas nenhum verificador ed25519/RSA real está incluído —
   plugins assinados hoje são sempre rejeitados por segurança (nunca
   confiados sem um verificador real configurado); plugins não assinados
   (o caso local/dev) passam.
3. **Sem carregamento dinâmico de código de terceiros**: instalar um
   plugin hoje significa importar seu módulo TypeScript no mesmo bundle
   (`import` estático ou dinâmico dentro do próprio app) -- não há
   sandboxing de execução (iframe, Web Worker, VM) nem carregamento de
   um pacote publicado externamente. Um plugin roda com o mesmo nível de
   confiança do resto do app.
4. **Event Bus é síncrono e em processo**: adequado para comunicação
   dentro de uma sessão do app, não para filas de mensagens distribuídas
   (workers em background, processamento assíncrono entre serviços).
5. **`IMetricExtension`/`IInsightExtension`/`IRecommendationExtension` recebem
   dados já buscados pelo chamador** (`activities`/`metricsHistory` como
   `unknown[]`), não uma query própria — um plugin não pode hoje pedir
   dados que o host ainda não buscou.
6. **Nenhum plugin real roda em produção hoje**: o app inicia com zero
   plugins instalados; `shoeRetirementCelebrationPlugin` existe apenas
   como referência testada, não é instalado automaticamente no bootstrap
   (`main.tsx`/`App.tsx`) -- decisão deliberada para manter a garantia
   "core não depende de plugins" honesta e verificável.

## Roadmap da plataforma de extensões

- UI de aprovação de permissões no fluxo de instalação (Settings).
- Verificador de assinatura real (ed25519) + chave pública do host.
- Marketplace real: catálogo pesquisável, publicação de manifesto,
  download/instalação a partir de uma URL (hoje `install()` só aceita um
  `IPlugin` já importado em processo).
- Carregamento dinâmico via `import()` de um módulo remoto/CDN, com
  validação de manifesto antes de sequer buscar o código.
- UI de configuração por plugin (hoje `PluginConfigStore` só tem
  get/set programático, sem um formulário gerado a partir de um schema).
- Sandboxing (Web Worker ou iframe) para plugins não confiáveis.
- Fila de eventos assíncrona/persistente para integrações que processam
  em segundo plano (hoje o Event Bus é só em memória, síncrono).
- Ligar o `IAiCommandExtension` ao módulo de IA Conversacional quando ele
  for construído (ainda não implementado neste projeto).

## Verificação final

- `npx tsc -b` — sem erros.
- `npx vitest run --coverage` — **1084 testes, 188 arquivos, 100%
  passando**. Bucket `src/platform/**` (90% statements/branches/functions/
  lines) configurado em `vite.config.ts` e cumprido; todos os demais
  buckets do projeto continuam passando.
- `npm run lint` (`oxlint`) — zero warnings.
- `npm run build` (`tsc -b && vite build`) — sucesso.
- Critério "núcleo não depende de plugins" verificado por grep: nenhum
  Engine importa `platform/`; apenas 2 arquivos do Dashboard importam
  `platform/`, e nenhum importa `platform/examples`.
