import { Card } from "../../components/ui/Card";
import { widgetExtensionPoint } from "../../platform/extensions";
import type { WidgetSlot } from "../../platform/sdk/contracts/extensions";
import { usePluginRegistryVersion } from "../hooks/usePluginRegistryVersion";

/**
 * Renders every widget any enabled plugin has contributed to `slot`. This
 * is the one place a core Dashboard page reaches into the plugin
 * platform -- and it only ever calls `widgetExtensionPoint.list()`
 * (a generic SDK-level read), never anything specific to one plugin.
 * Renders nothing when no plugin has contributed to this slot, so
 * mounting it unconditionally on every page is always safe.
 */
export function PluginWidgetSlot({ slot }: { slot: WidgetSlot }) {
  usePluginRegistryVersion();
  const widgets = widgetExtensionPoint.list().filter((w) => w.slot === slot);

  if (widgets.length === 0) return null;

  return (
    <>
      {widgets.map((widget) => (
        <Card key={widget.id} title={widget.title}>
          {widget.render()}
        </Card>
      ))}
    </>
  );
}
