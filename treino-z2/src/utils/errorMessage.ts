/**
 * A readable message from any thrown/rejected value. `instanceof Error`
 * alone isn't enough: @supabase/postgrest-js resolves a network-level
 * failure (wrong URL, DNS failure, CORS block) as a plain
 * `{ message: string }` object, not a `PostgrestError` instance -- code
 * that only checked `instanceof Error` fell back to `String(err)`,
 * producing the unhelpful "[object Object]" for exactly the failures
 * (bad Supabase URL, unreachable host) users most need a real message for.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}
