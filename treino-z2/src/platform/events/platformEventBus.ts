import { EventBus } from "./eventBus";
import type { PlatformEventMap } from "./types";

/**
 * The single shared bus for the running app -- Engines/Dashboard publish
 * onto it (see PLUGIN_API.md for the publish call sites), and every
 * enabled plugin's PluginContext exposes a subscribe-only view of it
 * (manager/pluginContextFactory.ts never hands a plugin this instance
 * directly, so a plugin can never `clear()` someone else's subscribers).
 */
export const platformEventBus = new EventBus<PlatformEventMap>();
