import type {
  IAiCommandExtension,
  IDashboardPageExtension,
  IInsightExtension,
  IIntegrationExtension,
  IMetricExtension,
  IRecommendationExtension,
  IWidgetExtension,
} from "./extensions";

/** One extension point's contribute/revoke surface, generic over the contract it accepts. Every extension point in platform/extensions/ implements this. */
export interface ExtensionPort<TExtension> {
  contribute(extension: TExtension): void;
  revoke(extensionId: string): void;
}

/**
 * Bundles all 7 extension points into the one object a plugin's
 * `onEnable` hook receives -- this, plus `PluginContext`, is the entire
 * surface a plugin has onto the host. manager/pluginManager.ts is the
 * only place that constructs a real `ExtensionRegistrar` (backed by the
 * live extension point registries); tests construct fakes against this
 * same interface.
 */
export interface ExtensionRegistrar {
  dashboardPages: ExtensionPort<IDashboardPageExtension>;
  widgets: ExtensionPort<IWidgetExtension>;
  metrics: ExtensionPort<IMetricExtension>;
  insights: ExtensionPort<IInsightExtension>;
  recommendations: ExtensionPort<IRecommendationExtension>;
  integrations: ExtensionPort<IIntegrationExtension>;
  aiCommands: ExtensionPort<IAiCommandExtension>;
}
