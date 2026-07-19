import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../../events/eventBus";

interface TestEventMap {
  Ping: { count: number };
  Pong: { message: string };
}

describe("EventBus", () => {
  it("delivers a published event to every subscriber of that type", () => {
    const bus = new EventBus<TestEventMap>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    bus.subscribe("Ping", handlerA);
    bus.subscribe("Ping", handlerB);

    bus.publish("Ping", { count: 3 });

    expect(handlerA).toHaveBeenCalledWith({ count: 3 });
    expect(handlerB).toHaveBeenCalledWith({ count: 3 });
  });

  it("never delivers a Ping subscriber a Pong event", () => {
    const bus = new EventBus<TestEventMap>();
    const pingHandler = vi.fn();
    bus.subscribe("Ping", pingHandler);

    bus.publish("Pong", { message: "hi" });

    expect(pingHandler).not.toHaveBeenCalled();
  });

  it("publishing with no subscribers is a no-op, not an error", () => {
    const bus = new EventBus<TestEventMap>();
    expect(() => bus.publish("Ping", { count: 1 })).not.toThrow();
  });

  it("unsubscribe stops further delivery, and is safe to call twice", () => {
    const bus = new EventBus<TestEventMap>();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe("Ping", handler);

    unsubscribe();
    bus.publish("Ping", { count: 1 });
    expect(handler).not.toHaveBeenCalled();

    expect(() => unsubscribe()).not.toThrow();
  });

  it("once() only fires for the first matching event", () => {
    const bus = new EventBus<TestEventMap>();
    const handler = vi.fn();
    bus.once("Ping", handler);

    bus.publish("Ping", { count: 1 });
    bus.publish("Ping", { count: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ count: 1 });
  });

  it("a throwing subscriber does not stop the remaining subscribers from running", () => {
    const bus = new EventBus<TestEventMap>();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const throwingHandler = vi.fn(() => {
      throw new Error("boom");
    });
    const survivingHandler = vi.fn();
    bus.subscribe("Ping", throwingHandler);
    bus.subscribe("Ping", survivingHandler);

    expect(() => bus.publish("Ping", { count: 1 })).not.toThrow();
    expect(survivingHandler).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("clear(type) removes only that type's subscribers", () => {
    const bus = new EventBus<TestEventMap>();
    const pingHandler = vi.fn();
    const pongHandler = vi.fn();
    bus.subscribe("Ping", pingHandler);
    bus.subscribe("Pong", pongHandler);

    bus.clear("Ping");
    bus.publish("Ping", { count: 1 });
    bus.publish("Pong", { message: "hi" });

    expect(pingHandler).not.toHaveBeenCalled();
    expect(pongHandler).toHaveBeenCalled();
  });

  it("clear() with no argument removes every subscriber", () => {
    const bus = new EventBus<TestEventMap>();
    const pingHandler = vi.fn();
    const pongHandler = vi.fn();
    bus.subscribe("Ping", pingHandler);
    bus.subscribe("Pong", pongHandler);

    bus.clear();
    bus.publish("Ping", { count: 1 });
    bus.publish("Pong", { message: "hi" });

    expect(pingHandler).not.toHaveBeenCalled();
    expect(pongHandler).not.toHaveBeenCalled();
  });

  it("listenerCount reflects active subscribers", () => {
    const bus = new EventBus<TestEventMap>();
    expect(bus.listenerCount("Ping")).toBe(0);
    const unsubscribe = bus.subscribe("Ping", vi.fn());
    expect(bus.listenerCount("Ping")).toBe(1);
    unsubscribe();
    expect(bus.listenerCount("Ping")).toBe(0);
  });

  it("a handler subscribing during publish does not receive the event already in flight", () => {
    const bus = new EventBus<TestEventMap>();
    const lateHandler = vi.fn();
    bus.subscribe("Ping", () => {
      bus.subscribe("Ping", lateHandler);
    });

    bus.publish("Ping", { count: 1 });
    expect(lateHandler).not.toHaveBeenCalled();
  });
});
