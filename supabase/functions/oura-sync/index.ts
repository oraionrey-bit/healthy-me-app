// Supabase Edge Function: oura-sync
// Fetches daily sleep, readiness, activity, workout, and tag data from Oura API V2
// POST { user_id: string, start_date?: string, end_date?: string }
// Stores results in oura_daily + oura_workouts tables

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const OURA_CLIENT_ID = Deno.env.get("OURA_CLIENT_ID")!;
const OURA_CLIENT_SECRET = Deno.env.get("OURA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Refresh an expired Oura access token.
 */
async function refreshOuraToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string }> {
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
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch from Oura API with automatic token refresh on 401.
 */
async function ouraFetch(
  endpoint: string,
  accessToken: string,
  refreshToken: string,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  params: Record<string, string>,
): Promise<{ data: unknown[]; newAccessToken: string | null }> {
  const url = new URL(`${OURA_API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  let response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Token expired — refresh and retry
  if (response.status === 401) {
    const tokens = await refreshOuraToken(refreshToken);

    // Update stored tokens
    await supabase
      .from("user_profiles")
      .update({
        oura_access_token: tokens.access_token,
        oura_refresh_token: tokens.refresh_token,
      })
      .eq("id", userId);

    // Retry with new token
    response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Oura API error after refresh (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return { data: result.data ?? [], newAccessToken: tokens.access_token };
  }

  if (!response.ok) {
    // Some endpoints may not be available (e.g. enhanced_tag) — return empty
    if (response.status === 404) {
      return { data: [], newAccessToken: null };
    }
    const errorText = await response.text();
    throw new Error(`Oura API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return { data: result.data ?? [], newAccessToken: null };
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ── Oura API response types ──

interface OuraDailySleep {
  day: string;
  score: number | null;
  contributors?: {
    total_sleep?: number;
    deep_sleep?: number;
    rem_sleep?: number;
  };
}

interface OuraDailyReadiness {
  day: string;
  score: number | null;
  temperature_deviation?: number | null;
}

interface OuraDailyActivity {
  day: string;
  score: number | null;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  low_activity_met_minutes: number | null;
  medium_activity_met_minutes: number | null;
  high_activity_met_minutes: number | null;
  sedentary_met_minutes: number | null;
  equivalent_walking_distance: number | null;
  non_wear_minutes: number | null;
  resting_time: number | null; // seconds
  timestamp: string | null; // when steps/activity was last computed
}

interface OuraSleepDetail {
  day: string;
  average_hrv?: number | null;
  average_heart_rate?: number | null;
  total_sleep_duration?: number | null;
  deep_sleep_duration?: number | null;
  rem_sleep_duration?: number | null;
}

interface OuraWorkout {
  id: string;
  activity: string | null;
  calories: number | null;
  day: string;
  distance: number | null;
  end_datetime: string | null;
  intensity: string | null;
  label: string | null;
  start_datetime: string | null;
  source: string | null;
}

interface OuraEnhancedTag {
  id: string;
  tag_type_code: string | null;
  start_time: string | null;
  end_time: string | null;
  start_day: string | null;
  end_day: string | null;
  comment: string | null;
}

interface OuraTag {
  id: string;
  day: string;
  text: string | null;
  timestamp: string | null;
  tags: string[];
}

// Day map value type
interface DayData {
  sleep_score: number | null;
  readiness_score: number | null;
  activity_score: number | null;
  hrv_average: number | null;
  resting_hr: number | null;
  temperature_deviation: number | null;
  total_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  low_activity_minutes: number | null;
  medium_activity_minutes: number | null;
  high_activity_minutes: number | null;
  sedentary_minutes: number | null;
  equivalent_walking_distance: number | null;
  non_wear_minutes: number | null;
  resting_minutes: number | null;
  activity_timestamp: string | null;
  estimated_steps: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { user_id, start_date, end_date } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's Oura tokens
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("oura_access_token, oura_refresh_token, oura_connected")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (!profile.oura_connected || !profile.oura_access_token) {
      return new Response(
        JSON.stringify({ error: "Oura not connected for this user" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // Default: last 7 days
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 7);

    // Extend range by 1 day in both directions — Oura API can return empty for
    // tight date ranges, especially for today's real-time activity data
    const requestedStart = start_date || toDateString(defaultStart);
    const extendedStart = new Date(requestedStart);
    extendedStart.setDate(extendedStart.getDate() - 1);

    const requestedEnd = end_date || toDateString(now);
    const extendedEnd = new Date(requestedEnd);
    extendedEnd.setDate(extendedEnd.getDate() + 1);

    const dateParams = {
      start_date: toDateString(extendedStart),
      end_date: toDateString(extendedEnd),
    };

    let currentToken = profile.oura_access_token as string;
    const refreshToken = profile.oura_refresh_token as string;

    // Fetch all data in parallel
    const [sleepRes, readinessRes, activityRes, sleepDetailRes, workoutRes, enhancedTagRes, tagRes] =
      await Promise.all([
        ouraFetch("daily_sleep", currentToken, refreshToken, supabase, user_id, dateParams),
        ouraFetch("daily_readiness", currentToken, refreshToken, supabase, user_id, dateParams),
        ouraFetch("daily_activity", currentToken, refreshToken, supabase, user_id, dateParams),
        ouraFetch("sleep", currentToken, refreshToken, supabase, user_id, dateParams),
        ouraFetch("workout", currentToken, refreshToken, supabase, user_id, dateParams),
        ouraFetch("enhanced_tag", currentToken, refreshToken, supabase, user_id, dateParams),
        ouraFetch("tag", currentToken, refreshToken, supabase, user_id, dateParams),
      ]);

    // Track token updates
    for (const res of [sleepRes, readinessRes, activityRes, sleepDetailRes, workoutRes, enhancedTagRes, tagRes]) {
      if (res.newAccessToken) currentToken = res.newAccessToken;
    }

    // Build a map of day → combined data
    const dayMap = new Map<string, DayData>();

    const getDay = (day: string): DayData => {
      if (!dayMap.has(day)) {
        dayMap.set(day, {
          sleep_score: null,
          readiness_score: null,
          activity_score: null,
          hrv_average: null,
          resting_hr: null,
          temperature_deviation: null,
          total_sleep_minutes: null,
          deep_sleep_minutes: null,
          rem_sleep_minutes: null,
          steps: null,
          active_calories: null,
          total_calories: null,
          low_activity_minutes: null,
          medium_activity_minutes: null,
          high_activity_minutes: null,
          sedentary_minutes: null,
          equivalent_walking_distance: null,
          non_wear_minutes: null,
          resting_minutes: null,
          activity_timestamp: null,
          estimated_steps: null,
        });
      }
      return dayMap.get(day)!;
    };

    // Sleep scores
    for (const item of sleepRes.data as OuraDailySleep[]) {
      const d = getDay(item.day);
      d.sleep_score = item.score;
    }

    // Readiness scores + temperature
    for (const item of readinessRes.data as OuraDailyReadiness[]) {
      const d = getDay(item.day);
      d.readiness_score = item.score;
      if (item.temperature_deviation != null) {
        d.temperature_deviation = item.temperature_deviation;
      }
    }

    // Activity scores + steps + calories + expanded fields
    for (const item of activityRes.data as OuraDailyActivity[]) {
      const d = getDay(item.day);
      d.activity_score = item.score;
      d.steps = item.steps;
      d.active_calories = item.active_calories;
      d.total_calories = item.total_calories ?? null;
      d.low_activity_minutes = item.low_activity_met_minutes ?? null;
      d.medium_activity_minutes = item.medium_activity_met_minutes ?? null;
      d.high_activity_minutes = item.high_activity_met_minutes ?? null;
      d.sedentary_minutes = item.sedentary_met_minutes ?? null;
      d.equivalent_walking_distance = item.equivalent_walking_distance ?? null;
      d.non_wear_minutes = item.non_wear_minutes ?? null;
      d.resting_minutes = item.resting_time != null ? Math.round(item.resting_time / 60) : null;
      d.activity_timestamp = item.timestamp ?? null;

      // Compute estimated steps from walking distance when steps timestamp is stale
      // (Oura steps field is computed at 4am and doesn't update throughout the day,
      // but equivalent_walking_distance updates in near-real-time)
      if (item.equivalent_walking_distance != null && item.equivalent_walking_distance > 0) {
        // Average stride length ~0.762m → steps = distance / stride
        const estimatedFromDistance = Math.round(item.equivalent_walking_distance / 0.762);
        d.estimated_steps = estimatedFromDistance;
      }
    }

    // Detailed sleep: HRV, resting HR, sleep durations
    const sleepByDay = new Map<string, OuraSleepDetail>();
    for (const item of sleepDetailRes.data as OuraSleepDetail[]) {
      const existing = sleepByDay.get(item.day);
      if (
        !existing ||
        (item.total_sleep_duration ?? 0) > (existing.total_sleep_duration ?? 0)
      ) {
        sleepByDay.set(item.day, item);
      }
    }

    for (const [day, item] of sleepByDay) {
      const d = getDay(day);
      d.hrv_average = item.average_hrv ?? null;
      d.resting_hr = item.average_heart_rate ?? null;
      if (item.total_sleep_duration != null) {
        d.total_sleep_minutes = Math.round(item.total_sleep_duration / 60);
      }
      if (item.deep_sleep_duration != null) {
        d.deep_sleep_minutes = Math.round(item.deep_sleep_duration / 60);
      }
      if (item.rem_sleep_duration != null) {
        d.rem_sleep_minutes = Math.round(item.rem_sleep_duration / 60);
      }
    }

    // Upsert into oura_daily
    const rows = Array.from(dayMap.entries()).map(([day, data]) => ({
      user_id,
      log_date: day,
      ...data,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("oura_daily")
        .upsert(rows, { onConflict: "user_id,log_date" });

      if (upsertError) {
        throw new Error(`Failed to upsert oura_daily: ${upsertError.message}`);
      }
    }

    // ── Process workouts ──
    const workouts = workoutRes.data as OuraWorkout[];
    let workoutsSynced = 0;

    if (workouts.length > 0) {
      const workoutRows = workouts.map((w) => {
        let durationMinutes: number | null = null;
        if (w.start_datetime && w.end_datetime) {
          const startMs = new Date(w.start_datetime).getTime();
          const endMs = new Date(w.end_datetime).getTime();
          if (!isNaN(startMs) && !isNaN(endMs)) {
            durationMinutes = Math.round((endMs - startMs) / 60000);
          }
        }

        return {
          id: w.id,
          user_id,
          log_date: w.day,
          activity_type: w.activity ?? null,
          calories: w.calories ?? null,
          distance_meters: w.distance ?? null,
          duration_minutes: durationMinutes,
          intensity: w.intensity ?? null,
          label: w.label ?? null,
          start_time: w.start_datetime ?? null,
          end_time: w.end_datetime ?? null,
          source: w.source ?? null,
        };
      });

      const { error: workoutError } = await supabase
        .from("oura_workouts")
        .upsert(workoutRows, { onConflict: "id" });

      if (workoutError) {
        console.error("Failed to upsert oura_workouts:", workoutError.message);
      } else {
        workoutsSynced = workoutRows.length;
      }
    }

    // ── Process period/menstrual tags ──
    // Check enhanced_tag for period-related tags
    const PERIOD_TAG_CODES = [
      "period", "menstruation", "menstrual", "menses",
      "period_start", "period_end", "period_flow",
      "tag_generic_period",
    ];

    const enhancedTags = enhancedTagRes.data as OuraEnhancedTag[];
    const periodTags = enhancedTags.filter((t) =>
      t.tag_type_code && PERIOD_TAG_CODES.some((code) =>
        t.tag_type_code!.toLowerCase().includes(code)
      )
    );

    // Also check regular tags for period-related keywords
    const regularTags = tagRes.data as OuraTag[];
    const periodRegularTags = regularTags.filter((t) =>
      (t.text && /period|menstr/i.test(t.text)) ||
      (t.tags && t.tags.some((tag: string) => /period|menstr/i.test(tag)))
    );

    // Upsert period logs from Oura tags
    let periodDaysSynced = 0;

    // From enhanced tags
    for (const tag of periodTags) {
      const day = tag.start_day ?? (tag.start_time ? tag.start_time.split("T")[0] : null);
      if (!day) continue;

      const { error: periodError } = await supabase
        .from("period_logs")
        .upsert(
          {
            user_id,
            log_date: day,
            flow: "medium" as const,
            cramps: 0,
            headache: false,
            back_pain: false,
            notes: `Synced from Oura (${tag.tag_type_code ?? "period tag"})`,
          },
          { onConflict: "user_id,log_date", ignoreDuplicates: true }
        );

      if (!periodError) periodDaysSynced++;
    }

    // From regular tags
    for (const tag of periodRegularTags) {
      const { error: periodError } = await supabase
        .from("period_logs")
        .upsert(
          {
            user_id,
            log_date: tag.day,
            flow: "medium" as const,
            cramps: 0,
            headache: false,
            back_pain: false,
            notes: `Synced from Oura tag: ${tag.text ?? tag.tags?.join(", ") ?? "period"}`,
          },
          { onConflict: "user_id,log_date", ignoreDuplicates: true }
        );

      if (!periodError) periodDaysSynced++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        days_synced: rows.length,
        workouts_synced: workoutsSynced,
        period_days_synced: periodDaysSynced,
        date_range: dateParams,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("oura-sync error:", err);
    return new Response(
      JSON.stringify({ error: "Sync failed", detail: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
