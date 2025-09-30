import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookToken = Deno.env.get('KIRVANO_WEBHOOK_TOKEN');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

interface KirvanoWebhookPayload {
  email: string;
  evento: string;
  produto?: string;
}

function getPlanFromProduct(produto?: string): string {
  if (!produto) return 'free';
  
  if (produto.toLowerCase().includes('anual')) {
    return 'premium_anual';
  } else if (produto.toLowerCase().includes('mensal')) {
    return 'premium_mensal';
  }
  
  return 'free';
}

function isAccessLossEvent(evento: string): boolean {
  const lossEvents = [
    'assinatura cancelada',
    'assinatura atrasada',
    'cancelamento',
    'atraso',
    'vencida'
  ];
  return lossEvents.some(e => evento.toLowerCase().includes(e));
}

function isAccessGrantedEvent(evento: string): boolean {
  const grantedEvents = [
    'assinatura renovada',
    'renovação',
    'aprovado',
    'confirmado',
    'pagamento aprovado'
  ];
  return grantedEvents.some(e => evento.toLowerCase().includes(e));
}

serve(async (req) => {
  console.log('🔄 Kirvano webhook called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validar token de segurança
    const receivedToken = req.headers.get('x-webhook-token');
    
    if (webhookToken && receivedToken !== webhookToken) {
      console.log('❌ Invalid webhook token');
      
      // Registrar tentativa inválida
      await supabase.from('kirvano_logs').insert({
        email: 'unknown',
        evento: 'invalid_token',
        status_execucao: 'error',
        error_message: 'Token de webhook inválido',
        detalhes: { token_received: receivedToken ? 'present' : 'missing' }
      });
      
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    console.log('📦 Raw body:', body);
    
    let payload: KirvanoWebhookPayload;
    try {
      payload = JSON.parse(body);
      console.log('📦 Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('❌ JSON parse error:', e);
      
      await supabase.from('kirvano_logs').insert({
        email: 'unknown',
        evento: 'parse_error',
        status_execucao: 'error',
        error_message: 'Erro ao parsear JSON',
        detalhes: { raw_body: body }
      });
      
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, evento, produto } = payload;

    if (!email || !evento) {
      console.log('❌ Missing required fields');
      
      await supabase.from('kirvano_logs').insert({
        email: email || 'unknown',
        evento: evento || 'unknown',
        produto,
        status_execucao: 'error',
        error_message: 'Campos obrigatórios ausentes (email ou evento)',
        detalhes: payload
      });
      
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: email and evento' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing webhook for email: ${email}, event: ${evento}, product: ${produto}`);

    // Buscar usuário pelo email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      
      await supabase.from('kirvano_logs').insert({
        email,
        evento,
        produto,
        status_execucao: 'error',
        error_message: `Erro ao buscar usuários: ${authError.message}`,
        detalhes: payload
      });
      
      return new Response(JSON.stringify({ error: 'Error fetching users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`⚠️ User not found for email: ${email}`);
      
      await supabase.from('kirvano_logs').insert({
        email,
        evento,
        produto,
        user_found: false,
        status_execucao: 'error',
        error_message: 'Usuário não encontrado',
        detalhes: payload
      });
      
      return new Response(JSON.stringify({ 
        error: 'User not found',
        message: 'No user with this email exists in the system'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ User found: ${user.id}`);

    // Buscar empresa do usuário
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, plan')
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) {
      console.error('❌ Error fetching company:', companyError);
      
      await supabase.from('kirvano_logs').insert({
        email,
        evento,
        produto,
        user_found: true,
        status_execucao: 'error',
        error_message: 'Empresa não encontrada',
        detalhes: { ...payload, user_id: user.id }
      });
      
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Company found: ${company.id}, current plan: ${company.plan}`);

    // Determinar o novo plano baseado no evento
    let newPlan = company.plan;
    
    if (isAccessGrantedEvent(evento)) {
      // Assinatura renovada/aprovada - ativar plano premium
      newPlan = getPlanFromProduct(produto);
      console.log(`✅ Access granted event - setting plan to: ${newPlan}`);
    } else if (isAccessLossEvent(evento)) {
      // Assinatura cancelada/atrasada - reverter para free
      newPlan = 'free';
      console.log(`⚠️ Access loss event - setting plan to: ${newPlan}`);
    } else {
      console.log(`ℹ️ Unknown event type, keeping current plan: ${company.plan}`);
    }

    // Atualizar plano na empresa
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        plan: newPlan,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    if (updateError) {
      console.error('❌ Error updating company plan:', updateError);
      
      await supabase.from('kirvano_logs').insert({
        email,
        evento,
        produto,
        user_found: true,
        plan_updated: false,
        status_execucao: 'error',
        error_message: `Erro ao atualizar plano: ${updateError.message}`,
        detalhes: { 
          ...payload, 
          user_id: user.id,
          company_id: company.id,
          old_plan: company.plan,
          new_plan: newPlan
        }
      });
      
      return new Response(JSON.stringify({ error: 'Error updating plan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Plan updated successfully from ${company.plan} to ${newPlan}`);

    // Registrar sucesso no log
    await supabase.from('kirvano_logs').insert({
      email,
      evento,
      produto,
      user_found: true,
      plan_updated: true,
      status_execucao: 'success',
      detalhes: {
        ...payload,
        user_id: user.id,
        company_id: company.id,
        old_plan: company.plan,
        new_plan: newPlan
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      plan_updated: company.plan !== newPlan,
      old_plan: company.plan,
      new_plan: newPlan
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    try {
      await supabase.from('kirvano_logs').insert({
        email: 'unknown',
        evento: 'unexpected_error',
        status_execucao: 'error',
        error_message: error.message || 'Erro inesperado',
        detalhes: { error: String(error) }
      });
    } catch (logError) {
      console.error('❌ Error logging to database:', logError);
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