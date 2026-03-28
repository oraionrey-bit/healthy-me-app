// Supabase Edge Function: analyze-food
// Analyzes food photos via Gemini 2.5 Flash for PCOS-aware nutrition estimation
// POST { food_log_id: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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

interface AnalysisResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  pcos_notes: string;
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
 * Call Gemini 2.5 Flash with vision for food analysis.
 */
async function analyzeWithGemini(
  description: string,
  images: { base64: string; mimeType: string }[],
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
  const fullPrompt = `${PCOS_PROMPT}\n\nMeal description: ${description || "No description provided"}`;
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
    const { food_log_id } = await req.json();
    if (!food_log_id) {
      return new Response(JSON.stringify({ error: "food_log_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Skip if already analyzed
    if (entry.ai_analyzed) {
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

    // Need at least a description or photo
    if (images.length === 0 && !entry.description) {
      return new Response(
        JSON.stringify({ error: "No photo or description to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Gemini for analysis
    const analysis = await analyzeWithGemini(entry.description, images);

    // Update the food log with results
    const { data: updated, error: updateError } = await supabase
      .from("food_logs")
      .update({
        calories: Math.round(analysis.calories),
        protein: Math.round(analysis.protein * 10) / 10,
        carbs: Math.round(analysis.carbs * 10) / 10,
        fat: Math.round(analysis.fat * 10) / 10,
        fiber: Math.round(analysis.fiber * 10) / 10,
        ai_analyzed: true,
        ai_confidence: analysis.confidence,
        ai_pcos_notes: analysis.pcos_notes,
      })
      .eq("id", food_log_id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update food log", detail: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clean up photos after successful analysis
    if (photoUrls.length > 0) {
      await cleanupPhotos(supabase, photoUrls);
    }

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
