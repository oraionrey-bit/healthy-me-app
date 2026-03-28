// Supabase Edge Function: oura-auth
// Handles Oura Ring OAuth2 flow (initiate + callback)
// GET /oura-auth?user_id=<uuid> → redirects to Oura consent screen
// GET /oura-auth/callback?code=<code>&state=<user_id> → exchanges code for tokens

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const OURA_CLIENT_ID = Deno.env.get("OURA_CLIENT_ID")!;
const OURA_CLIENT_SECRET = Deno.env.get("OURA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const REDIRECT_URI =
  "https://xkdagrpbgyjsbnzbpkxb.supabase.co/functions/v1/oura-auth/callback";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Build the Oura OAuth consent URL.
 * state = user_id so we know who to associate tokens with on callback.
 */
function buildOuraAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: OURA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "daily readiness heartrate workout tag session sleep personal",
    state: userId,
  });
  return `${OURA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
async function exchangeCodeForTokens(
  code: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: OURA_CLIENT_ID,
    client_secret: OURA_CLIENT_SECRET,
  });

  const response = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Oura token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshOuraToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: OURA_CLIENT_ID,
    client_secret: OURA_CLIENT_SECRET,
  });

  const response = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Oura token refresh failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // ── Initiate OAuth flow ──
  // GET /oura-auth?user_id=<uuid>
  if (!path.endsWith("/callback")) {
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id query parameter is required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const authUrl = buildOuraAuthUrl(userId);

    // Return the URL for the frontend to open
    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // ── OAuth callback ──
  // GET /oura-auth/callback?code=<code>&state=<user_id>
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h2>Oura Connection Failed</h2><p>${error}</p><p>You can close this window.</p></body></html>`,
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "text/html" },
      },
    );
  }

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: "Missing code or state parameter" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in user_profiles using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        oura_access_token: tokens.access_token,
        oura_refresh_token: tokens.refresh_token,
        oura_connected: true,
      })
      .eq("id", state);

    if (updateError) {
      throw new Error(`Failed to store tokens: ${updateError.message}`);
    }

    // Redirect back to the app with success indicator
    const appUrl = "https://app.withluna.dev/settings?oura=connected";
    return new Response(null, {
      status: 302,
      headers: {
        ...CORS_HEADERS,
        Location: appUrl,
      },
    });
  } catch (err) {
    console.error("oura-auth callback error:", err);
    return new Response(
      `<html><body><h2>Connection Error</h2><p>${String(err)}</p><p>Please try again.</p></body></html>`,
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "text/html" },
      },
    );
  }
});
