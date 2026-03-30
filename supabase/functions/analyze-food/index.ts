// Supabase Edge Function: analyze-food
// Analyzes food photos via Gemini 2.5 Flash for PCOS-aware nutrition estimation
// POST { food_log_id: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TINA_CHAT_ID = "5052308275";

const PCOS_PROMPT = `You are a nutrition analyst specialized in PCOS management.

Analyze this meal photo and description. Estimate nutritional content.

Patient context:
- Korean female, mid-30s, PCOS (high androgen type, testosterone elevated)
- Daily targets: 1,400-1,600 calories, 80-100g protein
- Diet approach: protein first, carbs last
- Common meals: Korean food, LA restaurants, home cooking
- GI sensitivity: dairy can cause issues, slow digestion (tortuous colon)

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
- calories: estimated total calories
- protein/carbs/fat/fiber: grams
- confidence: 0-1, how confident you are in the estimate
- pcos_notes: brief note about this meal's impact on PCOS (insulin, inflammation, androgens)`;

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

/**
 * Notify Oraion via Telegram that food was logged and analyzed.
 * This triggers the AI assistant to follow up with PCOS-specific feedback.
 */
async function notifyOraion(
  mealType: string,
  description: string,
  analysis: AnalysisResult,
  analyzedBy: string,
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  const text = [
    `🍽️ *Food logged* (${mealType})`,
    description ? `"${description.substring(0, 100)}"` : "",
    "",
    `📊 ${Math.round(analysis.calories)} cal | ${Math.round(analysis.protein)}g protein | ${Math.round(analysis.carbs)}g carbs | ${Math.round(analysis.fat)}g fat`,
    `🤖 Analyzed by: ${analyzedBy}`,
    "",
    `💬 _Tina, I'll follow up with PCOS tips!_`,
  ].filter(Boolean).join("\n");

  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TINA_CHAT_ID,
          text,
          parse_mode: "Markdown",
        }),
      },
    );
  } catch (err) {
    // Non-critical — don't fail the analysis if notification fails
    console.warn("Telegram notification failed:", String(err));
  }
}

/**
 * Download an image from Supabase Storage (private bucket) and return as base64.
 */
async function downloadImageAsBase64(
  supabase: ReturnType<typeof createClient>,
  photoUrl: string,
): Promise<{ base64: string; mimeType: string } | null> {
  // Extract bucket path from the public URL or stored path
  // URL format: https://<project>.supabase.co/storage/v1/object/public/food-photos/<path>
  // or: https://<project>.supabase.co/storage/v1/object/food-photos/<path>
  const bucketMatch = photoUrl.match(/food-photos\/(.+)$/);
  if (!bucketMatch) return null;

  const filePath = bucketMatch[1];
  const { data, error } = await supabase.storage
    .from("food-photos")
    .download(filePath);

  if (error || !data) {
    console.error("Failed to download photo:", error?.message, filePath);
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);
  const mimeType = data.type || "image/jpeg";

  return { base64, mimeType };
}

/**
 * Call Claude (primary) for food analysis with vision.
 */
async function analyzeWithClaude(
  description: string,
  images: { base64: string; mimeType: string }[],
  promptOverride?: string,
): Promise<AnalysisResult> {
  const basePrompt = promptOverride ?? PCOS_PROMPT;
  const fullPrompt = `${basePrompt}\n\nMeal description: ${description || "No description provided"}`;

  // Build content array with images + text
  const content: Record<string, unknown>[] = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.base64,
      },
    });
  }
  content.push({ type: "text", text: fullPrompt });

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content }],
  };

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text;
  if (!text) {
    throw new Error("No response from Claude");
  }

  // Parse JSON — strip code fences if present
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed: AnalysisResult = JSON.parse(cleaned);

  if (typeof parsed.calories !== "number" || typeof parsed.protein !== "number") {
    throw new Error("Invalid analysis result from Claude: missing required fields");
  }

  return parsed;
}

/**
 * Call Gemini 2.5 Flash with vision for food analysis (fallback).
 */
async function analyzeWithGemini(
  description: string,
  images: { base64: string; mimeType: string }[],
  promptOverride?: string,
): Promise<AnalysisResult> {
  const parts: Record<string, unknown>[] = [];

  // Add images
  for (const img of images) {
    parts.push({
      inline_data: {
        mime_type: img.mimeType,
        data: img.base64,
      },
    });
  }

  // Add text prompt
  const basePrompt = promptOverride ?? PCOS_PROMPT;
  const fullPrompt = `${basePrompt}\n\nMeal description: ${description || "No description provided"}`;
  parts.push({ text: fullPrompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Parse JSON — strip code fences if present
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed: AnalysisResult = JSON.parse(cleaned);

  // Validate required fields
  if (typeof parsed.calories !== "number" || typeof parsed.protein !== "number") {
    throw new Error("Invalid analysis result: missing required fields");
  }

  return parsed;
}

/**
 * Delete photos from storage after analysis (temporary storage).
 */
async function cleanupPhotos(
  supabase: ReturnType<typeof createClient>,
  photoUrls: string[],
): Promise<void> {
  const paths: string[] = [];
  for (const url of photoUrls) {
    const match = url.match(/food-photos\/(.+)$/);
    if (match) paths.push(match[1]);
  }

  if (paths.length > 0) {
    const { error } = await supabase.storage.from("food-photos").remove(paths);
    if (error) {
      console.error("Photo cleanup failed:", error.message);
    }
  }
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { food_log_id, mode, leftovers_photo_url } = await req.json();
    if (!food_log_id) {
      return new Response(JSON.stringify({ error: "food_log_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isLeftovers = mode === "leftovers" && leftovers_photo_url;

    // Use service role to access private storage + update records
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the food log entry
    const { data: entry, error: fetchError } = await supabase
      .from("food_logs")
      .select("*")
      .eq("id", food_log_id)
      .single();

    if (fetchError || !entry) {
      return new Response(
        JSON.stringify({ error: "Food log entry not found", detail: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Skip if already analyzed (unless leftovers mode)
    if (entry.ai_analyzed && !isLeftovers) {
      return new Response(JSON.stringify({ data: entry, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect all photo URLs
    const photoUrls: string[] = [];
    if (entry.photo_urls && Array.isArray(entry.photo_urls)) {
      photoUrls.push(...entry.photo_urls);
    } else if (entry.photo_url) {
      photoUrls.push(entry.photo_url);
    }

    // Download images for Gemini
    const images: { base64: string; mimeType: string }[] = [];
    for (const url of photoUrls) {
      const img = await downloadImageAsBase64(supabase, url);
      if (img) images.push(img);
    }

    // For leftovers mode, download the leftovers photo and add it
    if (isLeftovers && leftovers_photo_url) {
      const leftoversImg = await downloadImageAsBase64(supabase, leftovers_photo_url);
      if (leftoversImg) images.push(leftoversImg);
    }

    // Need at least a description or photo
    if (images.length === 0 && !entry.description) {
      return new Response(
        JSON.stringify({ error: "No photo or description to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Try Claude first (primary), fall back to Gemini
    const prompt = isLeftovers ? LEFTOVERS_PROMPT : undefined;
    let analysis: AnalysisResult;
    let analyzedBy = "claude";
    try {
      analysis = await analyzeWithClaude(entry.description, images, prompt);
    } catch (claudeErr) {
      console.warn("Claude analysis failed, falling back to Gemini:", String(claudeErr));
      analyzedBy = "gemini";
      analysis = await analyzeWithGemini(entry.description, images, prompt);
    }

    // Update the food log with results
    const updatePayload: Record<string, unknown> = {
      calories: Math.round(analysis.calories),
      protein: Math.round(analysis.protein * 10) / 10,
      carbs: Math.round(analysis.carbs * 10) / 10,
      fat: Math.round(analysis.fat * 10) / 10,
      fiber: Math.round(analysis.fiber * 10) / 10,
      ai_analyzed: true,
      ai_confidence: analysis.confidence,
      ai_pcos_notes: analysis.pcos_notes,
    };
    if (isLeftovers) {
      updatePayload.notes = `adjusted_for_leftovers|${analyzedBy}`;
    } else {
      updatePayload.notes = analyzedBy;
    }

    const { data: updated, error: updateError } = await supabase
      .from("food_logs")
      .update(updatePayload)
      .eq("id", food_log_id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update food log", detail: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Notify Oraion via Telegram
    await notifyOraion(
      entry.meal_type ?? "meal",
      entry.description ?? "",
      analysis,
      analyzedBy,
    );

    // Keep photos for 24h — don't delete immediately.
    // Photos will be cleaned up by a scheduled task or on next day's sync.

    return new Response(JSON.stringify({ data: updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-food error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
