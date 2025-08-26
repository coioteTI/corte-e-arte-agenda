import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔄 Webhook test called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log('📦 Raw body:', body);
    
    let payload;
    try {
      payload = JSON.parse(body);
      console.log('📦 Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('❌ JSON parse error:', e);
      payload = { raw: body };
    }

    const response = {
      success: true,
      message: 'Webhook test received successfully',
      timestamp: new Date().toISOString(),
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body: payload
    };

    console.log('✅ Sending response:', JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Webhook test error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});