import { PostgrestClient } from "@supabase/postgrest-js";

let client: PostgrestClient | null = null;

// This app only ever does REST reads/writes via `.from(table)...` -- no
// Supabase Auth, Realtime or Storage calls anywhere in the codebase.
// `@supabase/supabase-js`'s `createClient` unconditionally constructs a
// GoTrueClient (auth) and RealtimeClient (websockets) too, which alone
// added ~180KB to the production bundle for code that never runs.
// `PostgrestClient` is the same query builder `supabase.from(...)` calls
// into internally -- this is the "Standalone import for bundle-sensitive
// environments" pattern documented in @supabase/postgrest-js itself.
export function getSupabase(): PostgrestClient {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.",
    );
  }

  // Mirrors supabase-js's own client construction: base URL + `/rest/v1`,
  // with the anon key sent as both `apikey` and the Bearer token.
  client = new PostgrestClient(new URL("rest/v1", url).href, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  return client;
}
