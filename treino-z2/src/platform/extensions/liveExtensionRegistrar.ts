import type { ExtensionRegistrar } from "../sdk/contracts/registrar";
import {
  aiCommandExtensionPoint,
  dashboardPageExtensionPoint,
  insightExtensionPoint,
  integrationExtensionPoint,
  metricExtensionPoint,
  recommendationExtensionPoint,
  widgetExtensionPoint,
} from "./points";

/**
 * The real `ExtensionRegistrar` the Plugin Manager hands to every
 * plugin's `onEnable` hook, assembled from the 7 live extension point
 * registries above. A plugin only ever sees this through the narrow
 * `ExtensionRegistrar` interface (contribute/revoke) -- it never sees
 * `list()`/`get()`, which are host-only (a plugin has no legitimate
 * reason to enumerate another plugin's contributions).
 */
export const liveExtensionRegistrar: ExtensionRegistrar = {
  dashboardPages: dashboardPageExtensionPoint,
  widgets: widgetExtensionPoint,
  metrics: metricExtensionPoint,
  insights: insightExtensionPoint,
  recommendations: recommendationExtensionPoint,
  integrations: integrationExtensionPoint,
  aiCommands: aiCommandExtensionPoint,
};
