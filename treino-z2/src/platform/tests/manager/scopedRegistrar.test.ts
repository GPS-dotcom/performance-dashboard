import { describe, expect, it } from "vitest";
import { createScopedRegistrar } from "../../manager/scopedRegistrar";
import { createExtensionPoint } from "../../extensions/extensionPointBase";
import type { ExtensionRegistrar } from "../../sdk/contracts/registrar";
import type { IDashboardPageExtension, IWidgetExtension } from "../../sdk/contracts/extensions";

function widget(id: string): IWidgetExtension {
  return { id, title: id, slot: "home", render: () => id };
}

function page(id: string): IDashboardPageExtension {
  return { id, navLabel: id, route: id, render: () => id };
}

function makeLiveRegistrar() {
  const widgets = createExtensionPoint<IWidgetExtension>("widget");
  const dashboardPages = createExtensionPoint<IDashboardPageExtension>("dashboard-page");
  const registrar: ExtensionRegistrar = {
    dashboardPages,
    widgets,
    metrics: createExtensionPoint("metric"),
    insights: createExtensionPoint("insight"),
    recommendations: createExtensionPoint("recommendation"),
    integrations: createExtensionPoint("integration"),
    aiCommands: createExtensionPoint("ai-command"),
  };
  return { registrar, widgets, dashboardPages };
}

describe("createScopedRegistrar", () => {
  it("contributions made through the scoped registrar are visible on the live extension point", () => {
    const { registrar, widgets } = makeLiveRegistrar();
    const { registrar: scoped } = createScopedRegistrar(registrar);
    scoped.widgets.contribute(widget("w1"));
    expect(widgets.get("w1")?.id).toBe("w1");
  });

  it("revokeAll() removes every contribution this scope made, across multiple ports", () => {
    const { registrar, widgets, dashboardPages } = makeLiveRegistrar();
    const { registrar: scoped, revokeAll } = createScopedRegistrar(registrar);
    scoped.widgets.contribute(widget("w1"));
    scoped.widgets.contribute(widget("w2"));
    scoped.dashboardPages.contribute(page("page1"));

    revokeAll();

    expect(widgets.list()).toEqual([]);
    expect(dashboardPages.list()).toEqual([]);
  });

  it("revokeAll() does not touch contributions made directly on the live registrar (outside this scope)", () => {
    const { registrar, widgets } = makeLiveRegistrar();
    widgets.contribute(widget("not-scoped"));
    const { registrar: scoped, revokeAll } = createScopedRegistrar(registrar);
    scoped.widgets.contribute(widget("scoped"));

    revokeAll();

    expect(widgets.list().map((w) => w.id)).toEqual(["not-scoped"]);
  });

  it("revoking through the scoped registrar directly also untracks it (so revokeAll afterward is a no-op for it)", () => {
    const { registrar, widgets } = makeLiveRegistrar();
    const { registrar: scoped, revokeAll } = createScopedRegistrar(registrar);
    scoped.widgets.contribute(widget("w1"));
    scoped.widgets.revoke("w1");
    expect(widgets.list()).toEqual([]);

    // Should not throw or double-revoke something already gone.
    expect(() => revokeAll()).not.toThrow();
  });
});
