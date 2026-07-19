export interface PluginConfigStore {
  get<TConfig>(pluginId: string): TConfig | null;
  set<TConfig>(pluginId: string, value: TConfig): void;
  clear(pluginId: string): void;
}

const STORAGE_PREFIX = "treino-z2:plugin-config:";

/**
 * Default `PluginConfigStore`: one `localStorage` entry per plugin,
 * namespaced so plugin A can never read/write plugin B's config even by
 * accident. Same defensive try/catch pattern as
 * dashboard/providers/ThemeProvider.tsx -- a storage failure (private
 * browsing, quota, disabled storage) degrades to "config not persisted
 * this session," never a thrown error that could take a plugin's whole
 * install down. `PluginConfigStore` is an interface specifically so a
 * host embedding this platform outside a browser (or wanting server-side
 * persistence) can swap in a different implementation without touching
 * the Plugin Manager.
 */
export const localStoragePluginConfigStore: PluginConfigStore = {
  get<TConfig>(pluginId: string): TConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + pluginId);
      return raw == null ? null : (JSON.parse(raw) as TConfig);
    } catch {
      return null;
    }
  },
  set<TConfig>(pluginId: string, value: TConfig): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + pluginId, JSON.stringify(value));
    } catch {
      // Config is a convenience, not a requirement for a plugin to keep working this session.
    }
  },
  clear(pluginId: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + pluginId);
    } catch {
      // Same as above.
    }
  },
};

/** In-memory `PluginConfigStore` -- what tests use instead of a real `localStorage`, and a reasonable default for a non-browser host. */
export function createInMemoryPluginConfigStore(): PluginConfigStore {
  const store = new Map<string, unknown>();
  return {
    get<TConfig>(pluginId: string): TConfig | null {
      return (store.has(pluginId) ? (store.get(pluginId) as TConfig) : null);
    },
    set<TConfig>(pluginId: string, value: TConfig): void {
      store.set(pluginId, value);
    },
    clear(pluginId: string): void {
      store.delete(pluginId);
    },
  };
}
