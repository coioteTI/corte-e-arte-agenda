import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TOKEN = 'tjud6lgfb19';

interface KiwifyWebhookPayload {
  email: string;
  evento: string;
  produto?: string;
  token: string;
  [key: string]: any;
}

// Plan mapping based on product name
const getPlanFromProduct = (produto: string): { plan: string; storage_limit: number } => {
  const productLower = produto.toLowerCase();
  
  if (productLower.includes('premium anual') || productLower.includes('premium mensal') || productLower.includes('premium')) {
    return { plan: 'premium', storage_limit: 10000000000 }; // 10GB for premium
  }
  
  // Default to free plan
  return { plan: 'free', storage_limit: 1000000000 }; // 1GB for free
};

// Check if event represents loss of access
const isAccessLossEvent = (evento: string): boolean => {
  const eventLower = evento.toLowerCase();
  return eventLower.includes('cancelada') || 
         eventLower.includes('atrasada') || 
         eventLower.includes('suspensa') ||
         eventLower.includes('expirada');
};

// Check if event represents access granted
const isAccessGrantedEvent = (evento: string): boolean => {
  const eventLower = evento.toLowerCase();
  return eventLower.includes('renovada') || 
         eventLower.includes('aprovada') ||
         eventLower.includes('ativa') ||
         eventLower.includes('confirmada');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`❌ Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('🔄 Processing Kiwify webhook...');
    
    // Parse the request body
    const payload: KiwifyWebhookPayload = await req.json();
    console.log('📦 Received payload:', JSON.stringify(payload, null, 2));

    const { email, evento, produto, token } = payload;

    // Validate required fields
    if (!email || !evento || !token) {
      console.log('❌ Missing required fields');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: email, evento, token' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate security token
    if (token !== VALID_TOKEN) {
      console.log('❌ Invalid token provided');
      
      // Log failed attempt
      await supabase.from('webhook_logs').insert({
        email,
        evento,
        produto,
        token_received: token,
        raw_payload: payload,
        user_found: false,
        plan_updated: false,
        error_message: 'Invalid token'
      });

      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Token validation passed');

    // Find user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      throw new Error('Failed to fetch users');
    }

    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      
      // Log user not found
      await supabase.from('webhook_logs').insert({
        email,
        evento,
        produto,
        token_received: token,
        raw_payload: payload,
        user_found: false,
        plan_updated: false,
        error_message: 'User not found'
      });

      return new Response(JSON.stringify({ 
        error: 'User not found',
        message: 'No user found with the provided email address'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ User found: ${user.id}`);

    // Find the company associated with this user
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name, plan')
      .eq('user_id', user.id);

    if (companyError) {
      console.error('❌ Error fetching company:', companyError);
      throw new Error('Failed to fetch company');
    }

    if (!companies || companies.length === 0) {
      console.log(`❌ No company found for user: ${user.id}`);
      
      // Log company not found
      await supabase.from('webhook_logs').insert({
        email,
        evento,
        produto,
        token_received: token,
        raw_payload: payload,
        user_found: true,
        plan_updated: false,
        error_message: 'Company not found for user'
      });

      return new Response(JSON.stringify({ 
        error: 'Company not found',
        message: 'No company found for the user'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const company = companies[0];
    console.log(`✅ Company found: ${company.id} - Current plan: ${company.plan}`);

    // Determine new plan and storage limit based on event
    let newPlan: string;
    let storageLimit: number;

    if (isAccessLossEvent(evento)) {
      // Access lost - downgrade to free
      newPlan = 'free';
      storageLimit = 1000000000; // 1GB
      console.log(`📉 Access loss event detected. Downgrading to: ${newPlan}`);
    } else if (isAccessGrantedEvent(evento)) {
      // Access granted - upgrade based on product
      const planInfo = getPlanFromProduct(produto || '');
      newPlan = planInfo.plan;
      storageLimit = planInfo.storage_limit;
      console.log(`📈 Access granted event detected. Upgrading to: ${newPlan} based on product: ${produto}`);
    } else {
      // Unknown event - log but don't change plan
      console.log(`⚠️ Unknown event type: ${evento}. No plan change applied.`);
      
      await supabase.from('webhook_logs').insert({
        email,
        evento,
        produto,
        token_received: token,
        raw_payload: payload,
        user_found: true,
        plan_updated: false,
        error_message: `Unknown event type: ${evento}`
      });

      return new Response(JSON.stringify({ 
        message: 'Event received but no action taken',
        reason: 'Unknown event type'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update company plan
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        plan: newPlan,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    if (updateError) {
      console.error('❌ Error updating company plan:', updateError);
      
      // Log update error
      await supabase.from('webhook_logs').insert({
        email,
        evento,
        produto,
        token_received: token,
        raw_payload: payload,
        user_found: true,
        plan_updated: false,
        error_message: `Failed to update plan: ${updateError.message}`
      });

      throw new Error('Failed to update company plan');
    }

    console.log(`✅ Company plan updated successfully: ${company.plan} → ${newPlan}`);

    // Log successful processing
    const { error: logError } = await supabase.from('webhook_logs').insert({
      email,
      evento,
      produto,
      token_received: token,
      raw_payload: payload,
      user_found: true,
      plan_updated: true,
      error_message: null
    });

    if (logError) {
      console.error('⚠️ Error logging webhook event:', logError);
      // Don't fail the request if logging fails
    }

    const response = {
      success: true,
      message: 'Webhook processed successfully',
      details: {
        user_id: user.id,
        company_id: company.id,
        previous_plan: company.plan,
        new_plan: newPlan,
        event: evento,
        product: produto
      }
    };

    console.log('✅ Webhook processing completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    try {
      // Try to log the error if we have the email
      const body = await req.clone().json();
      if (body.email) {
        await supabase.from('webhook_logs').insert({
          email: body.email,
          evento: body.evento || 'unknown',
          produto: body.produto,
          token_received: body.token,
          raw_payload: body,
          user_found: false,
          plan_updated: false,
          error_message: error.message
        });
      }
    } catch (logError) {
      console.error('❌ Error logging failed webhook:', logError);
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});