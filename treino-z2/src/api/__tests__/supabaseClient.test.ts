import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getSupabase", () => {
  it("throws a descriptive error when the env vars are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const { getSupabase } = await import("../supabaseClient");
    expect(() => getSupabase()).toThrow(/Missing VITE_SUPABASE_URL/);
  });

  it("throws when only one of the two env vars is set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const { getSupabase } = await import("../supabaseClient");
    expect(() => getSupabase()).toThrow(/Missing VITE_SUPABASE_URL/);
  });

  it("builds a client when both env vars are present", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    const { getSupabase } = await import("../supabaseClient");
    const client = getSupabase();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("returns the same singleton instance on subsequent calls", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    const { getSupabase } = await import("../supabaseClient");
    const first = getSupabase();
    const second = getSupabase();
    expect(second).toBe(first);
  });
});
