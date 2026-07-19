import { afterEach, describe, expect, it, vi } from "vitest";
import { createInMemoryPluginConfigStore, localStoragePluginConfigStore } from "../../manager/configStore";

afterEach(() => {
  localStorage.clear();
});

describe("localStoragePluginConfigStore", () => {
  it("returns null when nothing has been set for a plugin", () => {
    expect(localStoragePluginConfigStore.get("com.example.a")).toBeNull();
  });

  it("round-trips a set value through get()", () => {
    localStoragePluginConfigStore.set("com.example.a", { level: 3 });
    expect(localStoragePluginConfigStore.get("com.example.a")).toEqual({ level: 3 });
  });

  it("keeps two plugins' config fully separate", () => {
    localStoragePluginConfigStore.set("com.example.a", { value: "a" });
    localStoragePluginConfigStore.set("com.example.b", { value: "b" });
    expect(localStoragePluginConfigStore.get("com.example.a")).toEqual({ value: "a" });
    expect(localStoragePluginConfigStore.get("com.example.b")).toEqual({ value: "b" });
  });

  it("clear() removes a plugin's config", () => {
    localStoragePluginConfigStore.set("com.example.a", { value: "a" });
    localStoragePluginConfigStore.clear("com.example.a");
    expect(localStoragePluginConfigStore.get("com.example.a")).toBeNull();
  });

  it("get() returns null (not a thrown error) when localStorage.getItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(localStoragePluginConfigStore.get("com.example.a")).toBeNull();
    spy.mockRestore();
  });

  it("get() returns null when the stored value is not valid JSON", () => {
    localStorage.setItem("treino-z2:plugin-config:com.example.a", "{not json");
    expect(localStoragePluginConfigStore.get("com.example.a")).toBeNull();
  });

  it("set() does not throw when localStorage.setItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => localStoragePluginConfigStore.set("com.example.a", { value: 1 })).not.toThrow();
    spy.mockRestore();
  });

  it("clear() does not throw when localStorage.removeItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => localStoragePluginConfigStore.clear("com.example.a")).not.toThrow();
    spy.mockRestore();
  });
});

describe("createInMemoryPluginConfigStore", () => {
  it("round-trips values and keeps stores from different calls independent", () => {
    const storeA = createInMemoryPluginConfigStore();
    const storeB = createInMemoryPluginConfigStore();
    storeA.set("p1", { value: "from A" });
    expect(storeA.get("p1")).toEqual({ value: "from A" });
    expect(storeB.get("p1")).toBeNull();
  });

  it("clear() removes a value", () => {
    const store = createInMemoryPluginConfigStore();
    store.set("p1", { value: 1 });
    store.clear("p1");
    expect(store.get("p1")).toBeNull();
  });
});
