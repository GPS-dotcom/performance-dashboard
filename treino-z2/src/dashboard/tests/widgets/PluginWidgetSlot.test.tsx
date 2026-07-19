import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PluginWidgetSlot } from "../../widgets/PluginWidgetSlot";
import { widgetExtensionPoint } from "../../../platform/extensions/points";
import { platformEventBus } from "../../../platform/events/platformEventBus";

afterEach(() => {
  for (const widget of widgetExtensionPoint.list()) widgetExtensionPoint.revoke(widget.id);
});

describe("PluginWidgetSlot", () => {
  it("renders nothing when no plugin has contributed to this slot", () => {
    const { container } = render(<PluginWidgetSlot slot="home" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a widget contributed to the matching slot", () => {
    widgetExtensionPoint.contribute({ id: "w1", title: "My Widget", slot: "settings", render: () => "Widget content" });
    render(<PluginWidgetSlot slot="settings" />);
    expect(screen.getByText("My Widget")).toBeInTheDocument();
    expect(screen.getByText("Widget content")).toBeInTheDocument();
  });

  it("does not render a widget contributed to a different slot", () => {
    widgetExtensionPoint.contribute({ id: "w1", title: "Home Widget", slot: "home", render: () => "hi" });
    render(<PluginWidgetSlot slot="settings" />);
    expect(screen.queryByText("Home Widget")).not.toBeInTheDocument();
  });

  it("re-renders when a widget is contributed after mount, via the plugin event bus", () => {
    render(<PluginWidgetSlot slot="settings" />);
    expect(screen.queryByText("Late Widget")).not.toBeInTheDocument();

    act(() => {
      widgetExtensionPoint.contribute({ id: "late", title: "Late Widget", slot: "settings", render: () => "late content" });
      platformEventBus.publish("PluginEnabled", { pluginId: "com.example.late" });
    });

    expect(screen.getByText("Late Widget")).toBeInTheDocument();
  });
});
