export interface ExtensionPointRegistry<TExtension extends { id: string }> {
  contribute(extension: TExtension): void;
  revoke(extensionId: string): void;
  list(): TExtension[];
  get(extensionId: string): TExtension | null;
}

export class DuplicateExtensionError extends Error {}

/**
 * The one implementation every extension point (widget/dashboard-page/
 * metric/insight/recommendation/integration/ai-command) is built from --
 * a simple id-keyed registry. Kept generic and dependency-free (no
 * plugin/manager knowledge) so it's trivially unit-testable and so
 * adding an 8th extension point later is a 3-line file, not new
 * infrastructure.
 */
export function createExtensionPoint<TExtension extends { id: string }>(kindLabel: string): ExtensionPointRegistry<TExtension> {
  const items = new Map<string, TExtension>();

  return {
    contribute(extension: TExtension): void {
      if (items.has(extension.id)) {
        throw new DuplicateExtensionError(`A ${kindLabel} extension with id "${extension.id}" is already registered.`);
      }
      items.set(extension.id, extension);
    },
    revoke(extensionId: string): void {
      items.delete(extensionId);
    },
    list(): TExtension[] {
      return Array.from(items.values());
    },
    get(extensionId: string): TExtension | null {
      return items.get(extensionId) ?? null;
    },
  };
}
