import { afterEach, describe, expect, it, vi } from "vitest";
import { platformEventBus } from "../../events/platformEventBus";

afterEach(() => {
  platformEventBus.clear();
});

describe("platformEventBus", () => {
  it("is a shared bus typed over PlatformEventMap -- publishes and delivers a real event", () => {
    const handler = vi.fn();
    platformEventBus.subscribe("ActivityImported", handler);
    platformEventBus.publish("ActivityImported", { activityId: "a1", athleteId: null, startDate: "2026-07-19", distanceM: 10000 });
    expect(handler).toHaveBeenCalledWith({ activityId: "a1", athleteId: null, startDate: "2026-07-19", distanceM: 10000 });
  });
});
