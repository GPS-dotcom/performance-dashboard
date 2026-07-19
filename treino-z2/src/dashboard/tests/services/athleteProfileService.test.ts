import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchCurrentAthlete } = await import("../../services/athleteProfileService");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    limit: () => handler,
    maybeSingle: async () => result,
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

describe("fetchCurrentAthlete", () => {
  it("maps the athlete row from snake_case to camelCase", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: {
          id: "a1",
          birthday: "1990-01-01",
          sex: "male",
          height_cm: 180,
          weight_kg: 70,
          ftp: 250,
          vo2max: 55,
          max_hr: 190,
          resting_hr: 45,
          threshold_pace_sec_per_km: 240,
          threshold_power: 230,
          preferred_units: "metric",
        },
        error: null,
      }),
    );
    const result = await fetchCurrentAthlete();
    expect(result).toEqual({
      id: "a1",
      birthday: "1990-01-01",
      sex: "male",
      heightCm: 180,
      weightKg: 70,
      ftp: 250,
      vo2max: 55,
      maxHr: 190,
      restingHr: 45,
      thresholdPaceSecPerKm: 240,
      thresholdPower: 230,
      preferredUnits: "metric",
    });
  });

  it("returns null when no athlete row exists", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: null }));
    expect(await fetchCurrentAthlete()).toBeNull();
  });

  it("returns null (not a thrown error) when the query errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: 'relation "athletes" does not exist' } }));
    expect(await fetchCurrentAthlete()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns null (not a thrown error) when the client itself throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => {
      throw new Error("network down");
    });
    expect(await fetchCurrentAthlete()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
