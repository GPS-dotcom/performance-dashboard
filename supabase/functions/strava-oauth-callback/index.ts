// Sync Engine -- OAuth callback. Strava redirects here after the athlete
// authorizes the app (see docs in supabase/functions/README.md for the
// authorize URL to visit once). Exchanges the one-time `code` for an
// access/refresh token pair and stores it in `strava_tokens` (migration
// 0014) using the service role key -- the only key allowed to touch that
// table, per its RLS (no policies at all for anon/authenticated).
import { createClient } from "npm:@supabase/supabase-js@2";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function htmlResponse(status: number, message: string): Response {
  return new Response(`<!doctype html><html><body style="font-family: system-ui; padding: 2rem;"><p>${message}</p></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return htmlResponse(500, "Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET secrets on this Edge Function.");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlResponse(400, `Strava authorization was denied: ${error}`);
  }
  if (!code) {
    return htmlResponse(400, "Missing ?code= in the callback URL.");
  }

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    return htmlResponse(502, `Strava token exchange failed (${tokenResponse.status}): ${body}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    scope?: string;
    athlete?: { id: number };
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error: dbError } = await supabase.from("strava_tokens").upsert({
    id: 1,
    strava_athlete_id: tokenData.athlete?.id ?? null,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: tokenData.expires_at,
    scope: tokenData.scope ?? null,
    updated_at: new Date().toISOString(),
  });

  if (dbError) {
    return htmlResponse(500, `Connected to Strava, but failed to save the token: ${dbError.message}`);
  }

  return htmlResponse(200, "Connected to Strava successfully. You can close this tab and trigger strava-sync.");
});
