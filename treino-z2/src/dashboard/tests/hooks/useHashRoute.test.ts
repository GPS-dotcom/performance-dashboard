import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHashRoute } from "../../hooks/useHashRoute";

afterEach(() => {
  window.location.hash = "";
});

describe("useHashRoute", () => {
  it("defaults to 'home' for an empty hash", () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("home");
  });

  it.each([
    ["#/activities", "activities"],
    ["#/metrics", "metrics"],
    ["#/predictions", "predictions"],
    ["#/coach", "coach"],
    ["#/shoes", "shoes"],
    ["#/laboratory", "laboratory"],
    ["#/settings", "settings"],
    ["#/unknown-route", "home"],
  ] as const)("maps %s to %s", (hash, expected) => {
    window.location.hash = hash;
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe(expected);
  });

  it("updates when the hash changes after mount", () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("home");

    act(() => {
      window.location.hash = "#/coach";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current).toBe("coach");
  });
});
