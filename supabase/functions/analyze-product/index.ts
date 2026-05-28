const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface PhotoInput {
  mimeType: string;
  base64: string;
}

interface AnalyzeRequest {
  systemPrompt?: string;
  description?: string;
  photos?: PhotoInput[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!bearer || bearer !== SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (!GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY not configured' }, 500);
    }

    const body = await req.json() as AnalyzeRequest;
    const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';
    const description = typeof body.description === 'string' ? body.description : 'Please analyze this image.';
    const photos = Array.isArray(body.photos) ? body.photos : [];

    if (!systemPrompt || photos.length === 0) {
      return json({ error: 'systemPrompt and photos are required' }, 400);
    }

    const parts: Array<Record<string, unknown>> = photos.map((photo) => ({
      inline_data: {
        mime_type: photo.mimeType || 'image/jpeg',
        data: photo.base64,
      },
    }));
    parts.push({ text: description });

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json',
        },
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return json({ error: `Gemini HTTP ${response.status}: ${text.slice(0, 300)}` }, 502);
    }

    const parsed = JSON.parse(text);
    const content = (parsed.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim();

    if (!content) {
      return json({ error: `Unexpected Gemini response: ${text.slice(0, 300)}` }, 502);
    }

    return json({ content });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
