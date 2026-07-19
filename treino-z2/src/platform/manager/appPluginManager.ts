import { HOST_VERSION } from "../shared/hostVersion";
import { PluginManager } from "./pluginManager";

/** The one `PluginManager` the running app shares -- Settings' "Plugins" section and any plugin-installing code both drive this same instance. */
export const appPluginManager = new PluginManager({ hostVersion: HOST_VERSION });
