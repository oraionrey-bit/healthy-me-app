// Supabase Edge Function: chat-respond
// Called by Oraion to write analysis responses back to chat_messages
// POST { chat_message_id, response_text, analysis_data }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { chat_message_id, response_text, analysis_data } = await req.json();

    if (!chat_message_id) {
      return new Response(JSON.stringify({ error: 'chat_message_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the original message to copy context
    const { data: original } = await supabase
      .from('chat_messages')
      .select('user_id, message_type')
      .eq('id', chat_message_id)
      .single();

    if (!original) {
      return new Response(JSON.stringify({ error: 'Original message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert Oraion's response
    const { data: responseMsg, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: original.user_id,
        direction: 'oraion',
        content: response_text || '',
        analysis: analysis_data || null,
        message_type: original.message_type,
        status: 'complete',
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Update original message status
    await supabase
      .from('chat_messages')
      .update({ status: 'complete' })
      .eq('id', chat_message_id);

    return new Response(JSON.stringify({ id: responseMsg.id, status: 'complete' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
