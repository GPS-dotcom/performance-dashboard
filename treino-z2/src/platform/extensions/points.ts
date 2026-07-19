import { createExtensionPoint } from "./extensionPointBase";
import type {
  IAiCommandExtension,
  IDashboardPageExtension,
  IInsightExtension,
  IIntegrationExtension,
  IMetricExtension,
  IRecommendationExtension,
  IWidgetExtension,
} from "../sdk/contracts/extensions";

// One shared instance per extension kind for the whole running app --
// the Dashboard (core) reads from these generically (e.g. "render every
// widget contributed to the 'settings' slot"), and the Plugin Manager is
// the only thing that ever calls `.contribute`/`.revoke` on them, always
// on a plugin's behalf. Exporting them individually (rather than only
// through `liveExtensionRegistrar`) lets a Dashboard component import
// just the one it renders from, e.g. `widgetExtensionPoint.list()`.

export const dashboardPageExtensionPoint = createExtensionPoint<IDashboardPageExtension>("dashboard-page");
export const widgetExtensionPoint = createExtensionPoint<IWidgetExtension>("widget");
export const metricExtensionPoint = createExtensionPoint<IMetricExtension>("metric");
export const insightExtensionPoint = createExtensionPoint<IInsightExtension>("insight");
export const recommendationExtensionPoint = createExtensionPoint<IRecommendationExtension>("recommendation");
export const integrationExtensionPoint = createExtensionPoint<IIntegrationExtension>("integration");
export const aiCommandExtensionPoint = createExtensionPoint<IAiCommandExtension>("ai-command");
