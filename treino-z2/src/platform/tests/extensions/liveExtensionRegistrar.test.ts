import { afterEach, describe, expect, it } from "vitest";
import { liveExtensionRegistrar } from "../../extensions/liveExtensionRegistrar";
import { widgetExtensionPoint } from "../../extensions/points";

afterEach(() => {
  widgetExtensionPoint.revoke("test-widget");
});

describe("liveExtensionRegistrar", () => {
  it("wires every one of the 7 extension ports", () => {
    expect(liveExtensionRegistrar.dashboardPages).toBeDefined();
    expect(liveExtensionRegistrar.widgets).toBeDefined();
    expect(liveExtensionRegistrar.metrics).toBeDefined();
    expect(liveExtensionRegistrar.insights).toBeDefined();
    expect(liveExtensionRegistrar.recommendations).toBeDefined();
    expect(liveExtensionRegistrar.integrations).toBeDefined();
    expect(liveExtensionRegistrar.aiCommands).toBeDefined();
  });

  it("contributing through the registrar is visible on the underlying extension point", () => {
    liveExtensionRegistrar.widgets.contribute({ id: "test-widget", title: "Test", slot: "home", render: () => "hi" });
    expect(widgetExtensionPoint.get("test-widget")).not.toBeNull();
  });

  it("revoking through the registrar removes it from the underlying extension point", () => {
    liveExtensionRegistrar.widgets.contribute({ id: "test-widget", title: "Test", slot: "home", render: () => "hi" });
    liveExtensionRegistrar.widgets.revoke("test-widget");
    expect(widgetExtensionPoint.get("test-widget")).toBeNull();
  });
});
