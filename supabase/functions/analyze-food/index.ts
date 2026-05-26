// Supabase Edge Function: analyze-food — v4.0 (2026-04-01)
// Analyzes food photos via AI for nutrition estimation
// Tina (PCOS) = Claude Sonnet (via ClawRouter) primary; everyone else = Gemini only
// POST { food_log_id: string, mode?: "leftovers", leftovers_photo_url?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

// ─── Config ────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const CLAWROUTER_API_KEY = Deno.env.get("CLAWROUTER_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const TINA_USER_ID = "e454325f-b8e6-4251-9a49-9d706eef99c3";
const TINA_CHAT_ID = "5052308275";
const ANTHONY_CHAT_ID = "717932407";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB — Claude's limit

// ─── Types ─────────────────────────────────────────────────────────────────

interface AnalysisResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  pcos_notes: string;
  percent_eaten?: number;
}

interface ImageData {
  base64: string;
  mimeType: string;
}

interface UserProfileData {
  health_condition: string | null;
  calorie_target: number | null;
  protein_target: number | null;
  dietary_preferences: string[] | null;
  cuisine_preferences: string[] | null;
  age: number | null;
  display_name: string | null;
}

/** Classifies API errors for proper handling */
type ApiErrorKind = "rate_limit" | "auth" | "server" | "invalid_response" | "unknown";

class ProviderError extends Error {
  constructor(
    public provider: string,
    public kind: ApiErrorKind,
    public statusCode: number,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

// ─── Provider Abstraction ──────────────────────────────────────────────────

interface Provider {
  name: string;
  analyze(prompt: string, images: ImageData[]): Promise<AnalysisResult>;
}

/** ClawRouter — OpenAI-compatible proxy routing to Claude Sonnet */
const clawRouterProvider: Provider = {
  name: "clawrouter",
  async analyze(prompt: string, images: ImageData[]): Promise<AnalysisResult> {
    const content: Record<string, unknown>[] = [];
    for (const img of images) {
      if (estimateBytes(img.base64) <= IMAGE_MAX_BYTES) {
        content.push({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        });
      }
    }
    content.push({ type: "text", text: prompt });

    const response = await fetch("https://api.clawrouter.app/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLAWROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "standard", // Maps to Claude Sonnet
        max_tokens: 1024,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        "clawrouter",
        classifyHttpError(response.status),
        response.status,
        `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      );
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (!text) {
      throw new ProviderError("clawrouter", "invalid_response", 200, "Empty response");
    }

    return parseAnalysisJson(text);
  },
};

/** Anthropic Direct API — fallback if ClawRouter is unavailable */
const anthropicProvider: Provider = {
  name: "anthropic",
  async analyze(prompt: string, images: ImageData[]): Promise<AnalysisResult> {
    const content: Record<string, unknown>[] = [];
    for (const img of images) {
      if (estimateBytes(img.base64) <= IMAGE_MAX_BYTES) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: img.mimeType, data: img.base64 },
        });
      }
    }
    content.push({ type: "text", text: prompt });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        "anthropic",
        classifyHttpError(response.status),
        response.status,
        `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text;
    if (!text) {
      throw new ProviderError("anthropic", "invalid_response", 200, "Empty response");
    }

    return parseAnalysisJson(text);
  },
};

/** Gemini 2.5 Flash — used for non-Tina users and as last-resort fallback */
const geminiProvider: Provider = {
  name: "gemini",
  async analyze(prompt: string, images: ImageData[]): Promise<AnalysisResult> {
    const parts: Record<string, unknown>[] = [];
    for (const img of images) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    }
    parts.push({ text: prompt });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        "gemini",
        classifyHttpError(response.status),
        response.status,
        `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      );
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ProviderError("gemini", "invalid_response", 200, "Empty response");
    }

    return parseAnalysisJson(text);
  },
};

// ─── Provider Chain ────────────────────────────────────────────────────────

/**
 * Try providers in order. Stop on first success.
 * Retry rate limits with backoff. Skip to next provider on auth/persistent errors.
 */
async function analyzeWithProviderChain(
  providers: Provider[],
  prompt: string,
  images: ImageData[],
): Promise<{ result: AnalysisResult; provider: string }> {
  const errors: string[] = [];

  for (const provider of providers) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Trying ${provider.name} (attempt ${attempt}/${maxRetries})...`);
        const result = await provider.analyze(prompt, images);
        return { result, provider: provider.name };
      } catch (err) {
        const msg = String(err);
        console.error(`${provider.name} attempt ${attempt} failed: ${msg}`);

        if (err instanceof ProviderError) {
          // Auth errors: skip to next provider immediately
          if (err.kind === "auth") {
            errors.push(`${provider.name}: auth error (${err.statusCode})`);
            break;
          }
          // Rate limits: retry with backoff, then skip to next provider
          if (err.kind === "rate_limit" && attempt < maxRetries) {
            const delay = attempt * 10_000; // 10s, 20s
            console.log(`Rate limited, waiting ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }

        errors.push(`${provider.name}: ${msg.slice(0, 150)}`);
        if (attempt === maxRetries) break;

        // Generic retry with short backoff
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  throw new Error(`All providers failed:\n${errors.join("\n")}`);
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function estimateBytes(base64: string): number {
  return Math.ceil(base64.length * 3 / 4);
}

function classifyHttpError(status: number): ApiErrorKind {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status >= 500) return "server";
  return "unknown";
}

function parseAnalysisJson(text: string): AnalysisResult {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (typeof parsed.calories !== "number" || typeof parsed.protein !== "number") {
    throw new Error("Invalid analysis: missing calories or protein");
  }

  return parsed as AnalysisResult;
}

// ─── Image Handling ────────────────────────────────────────────────────────

async function downloadImageAsBase64(
  supabase: ReturnType<typeof createClient>,
  photoUrl: string,
): Promise<ImageData | null> {
  const bucketMatch = photoUrl.match(/food-photos\/(.+)$/);
  if (!bucketMatch) return null;

  const filePath = bucketMatch[1];
  const { data, error } = await supabase.storage.from("food-photos").download(filePath);
  if (error || !data) {
    console.error("Failed to download photo:", error?.message, filePath);
    return null;
  }

  let blob: Blob = data;
  const mimeType = data.type || "image/jpeg";

  // Resize if over Claude's 5MB limit
  if (blob.size > IMAGE_MAX_BYTES) {
    console.log(`Image too large (${(blob.size / 1024 / 1024).toFixed(1)}MB), resizing...`);
    blob = await tryResize(supabase, filePath, blob) ?? blob;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }

  return { base64: btoa(binary), mimeType: blob.type || mimeType };
}

async function tryResize(
  _supabase: ReturnType<typeof createClient>,
  filePath: string,
  original: Blob,
): Promise<Blob | null> {
  // Try Supabase render endpoint
  const renderUrl = `${SUPABASE_URL}/storage/v1/render/image/public/food-photos/${filePath}?width=1200&quality=75`;
  try {
    const res = await fetch(renderUrl, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (res.ok) {
      const resized = await res.blob();
      console.log(`Resized: ${(original.size / 1024 / 1024).toFixed(1)}MB → ${(resized.size / 1024 / 1024).toFixed(1)}MB`);
      return resized;
    }
  } catch (err) {
    console.warn("Resize failed:", String(err));
  }

  // Try transform endpoint
  const transformUrl = `${SUPABASE_URL}/storage/v1/object/public/food-photos/${filePath}?width=800&quality=60`;
  try {
    const res = await fetch(transformUrl);
    if (res.ok) return await res.blob();
  } catch { /* fall through */ }

  console.warn("All resize attempts failed, using original");
  return null;
}

// ─── Prompts ───────────────────────────────────────────────────────────────

const PCOS_PROMPT = `You are an expert nutrition analyst specialized in PCOS management with deep knowledge of Korean, Japanese, and LA restaurant portions.

## YOUR TASK
Analyze this meal photo and description. Estimate the nutritional content of WHAT THE USER ACTUALLY ATE.

## CRITICAL ACCURACY RULES
1. **Read the user's description CAREFULLY.** If they say "I only had 3 pieces" or "I shared with my husband" or "I barely touched the rice", that DRAMATICALLY reduces the portion. Do NOT estimate the full plate — estimate only what they actually consumed.
2. **Portions matter more than anything.** A single slice of Japanese bakery cake is 280-400 cal (lighter than American — whipped cream, not buttercream). A shared Korean meal is roughly half per person. One spoonful of rice is ~30 cal.
3. **Know real-world serving sizes:**
   - Japanese bakery cream puff: 200-250 cal
   - Japanese cake slice: 280-400 cal (mousse-style even less)
   - Korean banchan (side dishes): 15-30 cal per small dish
   - Samgyeopsal (pork belly), 1 slice: 60-80 cal
   - Fish cake (odeng): 25-35 cal per piece
   - Bowl of miyeokguk (seaweed soup): 80-120 cal
   - Soft tofu (sundubu) 1 cup: 70-90 cal
   - 1 cup cooked rice: ~200 cal. 1 spoonful: ~30 cal
4. **Estimate CONSERVATIVELY when uncertain.** Slight underestimate > wild overestimate.
5. **Be skeptical of round numbers.** Real estimates look like 340, 520, 185 — not 500, 1000, 1500.
6. **Account for shared meals.** "Shared with husband" = estimate 40-60% of total.

## Patient Context
- Korean female, mid-30s, PCOS (high androgen type, testosterone elevated)
- Daily targets: 1,400-1,600 calories, 80-100g protein
- Diet approach: protein first, carbs last
- Common meals: Korean food, Japanese bakeries, LA restaurants, home cooking
- GI sensitivity: dairy can cause issues, slow digestion (tortuous colon)

## Response Format
Respond in STRICT JSON format only (no markdown, no code fences, no explanation):
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "confidence": number,
  "pcos_notes": "string"
}

Where:
- calories: estimated total calories ACTUALLY CONSUMED
- protein/carbs/fat/fiber: grams actually consumed
- confidence: 0-1 (lower if guessing portions, higher if clear from photo + description)
- pcos_notes: one brief sentence about insulin impact, inflammation, or hormonal effects`;

const LEFTOVERS_PROMPT = `You are a nutrition analyst specialized in PCOS management.

The user originally ate a meal but has leftovers remaining. You are given:
1. The original meal photos and description
2. A photo of the leftovers (what was NOT eaten)

Estimate the ACTUAL nutritional content the user consumed (original minus leftovers).
Look at how much food remains and estimate what percentage was left uneaten.

Patient context:
- Korean female, mid-30s, PCOS (high androgen type, testosterone elevated)
- Daily targets: 1,400-1,600 calories, 80-100g protein

Respond in STRICT JSON format only (no markdown, no code fences, no explanation):
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "confidence": number,
  "pcos_notes": "string",
  "percent_eaten": number
}

Where:
- calories/protein/carbs/fat/fiber: ACTUAL amount consumed (after subtracting leftovers)
- confidence: 0-1, how confident you are
- pcos_notes: brief note about actual intake vs PCOS goals
- percent_eaten: estimated percentage of the meal that was eaten (0-100)`;

function buildDynamicPrompt(profile: UserProfileData): string {
  const calorieTarget = profile.calorie_target || 1800;
  const proteinTarget = profile.protein_target || 50;
  const dietary = profile.dietary_preferences?.length
    ? profile.dietary_preferences.join(", ")
    : "none specified";
  const cuisines = profile.cuisine_preferences?.length
    ? profile.cuisine_preferences.join(", ")
    : "varied";

  let conditionContext: string;
  switch (profile.health_condition) {
    case "pcos":
      conditionContext = "User has PCOS. Note insulin impact, inflammation, and hormonal effects.";
      break;
    case "diabetes":
      conditionContext = "User has diabetes/pre-diabetes. Focus on glycemic index and carb quality.";
      break;
    case "weight_loss":
      conditionContext = "User is focused on weight loss. Note caloric density and satiety factors.";
      break;
    default:
      conditionContext = "General health focus. Provide balanced nutrition notes.";
  }

  return `You are an expert nutrition analyst with deep knowledge of real-world portion sizes.

## YOUR TASK
Analyze this meal photo and description. Estimate the nutritional content of WHAT THE USER ACTUALLY ATE.

## CRITICAL ACCURACY RULES
1. **Read the user's description CAREFULLY.** If they mention partial portions, shared meals, or leftovers, adjust estimates accordingly.
2. **Portions matter more than anything.** Estimate what was consumed, not the full plate.
3. **Know real-world serving sizes** — bakery items, restaurant portions, home cooking.
4. **Estimate CONSERVATIVELY when uncertain.** Slight underestimate > wild overestimate.
5. **Be skeptical of round numbers.** Real estimates look like 340, 520, 185.
6. **Account for shared meals.** If mentioned, estimate individual portion (40-60%).

## User Context
- Daily targets: ${calorieTarget} calories, ${proteinTarget}g protein
- Dietary preferences: ${dietary}
- Common cuisines: ${cuisines}
- ${conditionContext}

## Response Format
Respond in STRICT JSON format only (no markdown, no code fences, no explanation):
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "confidence": number,
  "pcos_notes": "string"
}`;
}

function buildDynamicLeftoversPrompt(profile: UserProfileData): string {
  const calorieTarget = profile.calorie_target || 1800;
  const proteinTarget = profile.protein_target || 50;

  return `You are an expert nutrition analyst.

The user ate a meal but has leftovers. You are given the original meal photos/description and a photo of leftovers.
Estimate the ACTUAL nutritional content consumed (original minus leftovers).

User context: ${calorieTarget} cal target, ${proteinTarget}g protein target.

Respond in STRICT JSON format only:
{
  "calories": number, "protein": number, "carbs": number, "fat": number,
  "fiber": number, "confidence": number, "pcos_notes": "string", "percent_eaten": number
}`;
}

// ─── Notifications ─────────────────────────────────────────────────────────

async function notifyTelegram(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn("Telegram notification failed:", errBody);
    }
  } catch (err) {
    console.warn("Telegram notification failed:", String(err));
  }
}

async function notifyFoodLogged(
  mealType: string,
  description: string,
  analysis: AnalysisResult,
  analyzedBy: string,
): Promise<void> {
  const desc = description ? `"${description.substring(0, 100)}"` : "";
  const text = [
    `🍽️ Food logged (${mealType})`,
    desc,
    "",
    `📊 ${Math.round(analysis.calories)} cal | ${Math.round(analysis.protein)}g protein | ${Math.round(analysis.carbs)}g carbs | ${Math.round(analysis.fat)}g fat`,
    "",
    analysis.pcos_notes ? `💬 ${analysis.pcos_notes}` : "",
  ].filter(Boolean).join("\n");

  await notifyTelegram(TINA_CHAT_ID, text);
}

async function notifyProviderFailure(errors: string): Promise<void> {
  await notifyTelegram(
    ANTHONY_CHAT_ID,
    `⚠️ Claude failed for Tina's food analysis, fell back to Gemini.\n${errors.slice(0, 300)}`,
  );
}

// ─── Main Handler ──────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const DEFAULT_PROFILE: UserProfileData = {
  health_condition: null,
  calorie_target: null,
  protein_target: null,
  dietary_preferences: null,
  cuisine_preferences: null,
  age: null,
  display_name: null,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { food_log_id, mode, leftovers_photo_url } = await req.json();
    if (!food_log_id) {
      return jsonResponse({ error: "food_log_id is required" }, 400);
    }

    const isLeftovers = mode === "leftovers" && leftovers_photo_url;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the food log
    const { data: entry, error: fetchError } = await supabase
      .from("food_logs")
      .select("*")
      .eq("id", food_log_id)
      .single();

    if (fetchError || !entry) {
      return jsonResponse({ error: "Food log entry not found", detail: fetchError?.message }, 404);
    }

    // Skip if already analyzed (unless leftovers mode)
    if (entry.ai_analyzed && !isLeftovers) {
      return jsonResponse({ data: entry, skipped: true });
    }

    // Fetch user profile
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("health_condition, calorie_target, protein_target, dietary_preferences, cuisine_preferences, age, display_name")
      .eq("id", entry.user_id)
      .single();

    const isTina = entry.user_id === TINA_USER_ID;

    // Download images
    const photoUrls: string[] = Array.isArray(entry.photo_urls)
      ? entry.photo_urls
      : entry.photo_url ? [entry.photo_url] : [];

    const images: ImageData[] = [];
    for (const url of photoUrls) {
      const img = await downloadImageAsBase64(supabase, url);
      if (img) images.push(img);
    }

    if (isLeftovers && leftovers_photo_url) {
      const leftoversImg = await downloadImageAsBase64(supabase, leftovers_photo_url);
      if (leftoversImg) images.push(leftoversImg);
    }

    if (images.length === 0 && !entry.description) {
      return jsonResponse({ error: "No photo or description to analyze" }, 400);
    }

    // Choose prompt and providers based on user
    let prompt: string;
    let providers: Provider[];

    if (isTina) {
      prompt = isLeftovers ? LEFTOVERS_PROMPT : PCOS_PROMPT;
      // Claude (via ClawRouter) primary → Anthropic direct fallback → Gemini last resort
      providers = [];
      if (CLAWROUTER_API_KEY) providers.push(clawRouterProvider);
      if (ANTHROPIC_API_KEY) providers.push(anthropicProvider);
      providers.push(geminiProvider); // Always available as fallback
    } else {
      const profile = userProfile ?? DEFAULT_PROFILE;
      prompt = isLeftovers
        ? buildDynamicLeftoversPrompt(profile)
        : buildDynamicPrompt(profile);
      providers = [geminiProvider]; // Non-Tina = Gemini only
    }

    const fullPrompt = `${prompt}\n\nMeal description: ${entry.description || "No description provided"}`;

    // Run the analysis through the provider chain
    const { result: analysis, provider: analyzedBy } = await analyzeWithProviderChain(
      providers,
      fullPrompt,
      images,
    );

    // If Claude failed and we fell back to Gemini for Tina, notify Anthony
    if (isTina && analyzedBy === "gemini") {
      await notifyProviderFailure("Claude providers failed, used Gemini fallback");
    }

    // Update the food log
    const updatePayload: Record<string, unknown> = {
      calories: Math.round(analysis.calories),
      protein: Math.round(analysis.protein * 10) / 10,
      carbs: Math.round(analysis.carbs * 10) / 10,
      fat: Math.round(analysis.fat * 10) / 10,
      fiber: Math.round(analysis.fiber * 10) / 10,
      ai_analyzed: true,
      ai_confidence: analysis.confidence,
      ai_pcos_notes: analysis.pcos_notes,
      notes: isLeftovers ? `adjusted_for_leftovers|${analyzedBy}` : analyzedBy,
    };

    const { data: updated, error: updateError } = await supabase
      .from("food_logs")
      .update(updatePayload)
      .eq("id", food_log_id)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({ error: "Failed to update food log", detail: updateError.message }, 500);
    }

    // Notify Tina via Telegram
    if (isTina) {
      await notifyFoodLogged(
        entry.meal_type ?? "meal",
        entry.description ?? "",
        analysis,
        analyzedBy,
      );
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    console.error("analyze-food error:", err);
    return jsonResponse({ error: "Internal error", detail: String(err) }, 500);
  }
});
