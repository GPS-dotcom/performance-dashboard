import { afterEach, describe, expect, it, vi } from "vitest";
import { clearActivityEventHandlers, emitActivityEvent, onActivityEvent } from "../eventBus";

afterEach(() => {
  clearActivityEventHandlers();
});

describe("event bus", () => {
  it("calls subscribed handlers with the emitted event", () => {
    const handler = vi.fn();
    onActivityEvent("activity_created", handler);

    const event = { athleteId: "a1", activityId: "act1", eventType: "activity_created" as const };
    emitActivityEvent(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("does not call handlers subscribed to a different event type", () => {
    const handler = vi.fn();
    onActivityEvent("activity_updated", handler);

    emitActivityEvent({ athleteId: "a1", activityId: "act1", eventType: "activity_created" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple handlers for the same event type", () => {
    const first = vi.fn();
    const second = vi.fn();
    onActivityEvent("activity_archived", first);
    onActivityEvent("activity_archived", second);

    emitActivityEvent({ athleteId: "a1", activityId: "act1", eventType: "activity_archived" });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops calling a handler after it unsubscribes", () => {
    const handler = vi.fn();
    const unsubscribe = onActivityEvent("activity_created", handler);
    unsubscribe();

    emitActivityEvent({ athleteId: "a1", activityId: "act1", eventType: "activity_created" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does nothing when an event has no subscribers", () => {
    expect(() =>
      emitActivityEvent({ athleteId: "a1", activityId: null, eventType: "activity_validation_failed" }),
    ).not.toThrow();
  });
});
