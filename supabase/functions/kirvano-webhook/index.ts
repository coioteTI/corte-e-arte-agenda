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

// Interface baseada no formato real da Kirvano
interface KirvanoWebhookPayload {
  event: string;
  event_description?: string;
  checkout_id?: string;
  sale_id?: string;
  payment_method?: string;
  total_price?: string;
  type?: string; // "ONE_TIME" | "RECURRING"
  status?: string;
  created_at?: string;
  customer?: {
    name?: string;
    document?: string;
    email?: string;
    phone_number?: string;
  };
  payment?: {
    method?: string;
    brand?: string;
    installments?: number;
    finished_at?: string;
  };
  plan?: {
    name?: string;
    charge_frequency?: string; // "ANNUALLY" | "MONTHLY"
    next_charge_date?: string;
  };
  products?: Array<{
    id?: string;
    name?: string;
    offer_id?: string;
    offer_name?: string;
    description?: string;
    price?: string;
    is_order_bump?: boolean;
  }>;
  // Campos alternativos (formato antigo)
  email?: string;
  evento?: string;
  produto?: string;
  data_assinatura?: string;
  data_vencimento?: string;
}

function calculateSubscriptionEndDate(plan: string, startDate: Date): Date {
  const endDate = new Date(startDate);
  if (plan === 'premium_anual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
}

function getPlanFromPayload(payload: KirvanoWebhookPayload): string {
  // 1. Verificar charge_frequency do plano (mais confiável)
  if (payload.plan?.charge_frequency) {
    const freq = payload.plan.charge_frequency.toUpperCase();
    if (freq === 'ANNUALLY' || freq === 'YEARLY' || freq === 'ANNUAL') {
      return 'premium_anual';
    }
    if (freq === 'MONTHLY' || freq === 'MONTH') {
      return 'premium_mensal';
    }
  }
  
  // 2. Verificar nome do plano
  if (payload.plan?.name) {
    const planName = payload.plan.name.toLowerCase();
    if (planName.includes('anual') || planName.includes('annual') || planName.includes('yearly')) {
      return 'premium_anual';
    }
    if (planName.includes('mensal') || planName.includes('monthly')) {
      return 'premium_mensal';
    }
  }
  
  // 3. Verificar produtos
  if (payload.products && payload.products.length > 0) {
    for (const product of payload.products) {
      const productName = (product.name || product.offer_name || '').toLowerCase();
      if (productName.includes('anual') || productName.includes('annual') || productName.includes('yearly')) {
        return 'premium_anual';
      }
      if (productName.includes('mensal') || productName.includes('monthly')) {
        return 'premium_mensal';
      }
    }
  }
  
  // 4. Verificar campo produto (formato antigo)
  if (payload.produto) {
    const produtoLower = payload.produto.toLowerCase();
    if (produtoLower.includes('anual') || produtoLower.includes('annual') || produtoLower.includes('yearly')) {
      return 'premium_anual';
    }
    if (produtoLower.includes('mensal') || produtoLower.includes('monthly')) {
      return 'premium_mensal';
    }
  }
  
  // 5. Se é recorrente mas não conseguimos identificar, assume mensal
  if (payload.type === 'RECURRING') {
    return 'premium_mensal';
  }
  
  // 6. Default para free se não conseguir identificar
  return 'free';
}

function isAccessLossEvent(event: string): boolean {
  const lossEvents = [
    'SUBSCRIPTION_CANCELED',
    'SUBSCRIPTION_EXPIRED',
    'SUBSCRIPTION_OVERDUE',
    'REFUND_REQUESTED',
    'CHARGEBACK',
    // Eventos em português (formato antigo)
    'assinatura cancelada',
    'assinatura atrasada',
    'cancelamento',
    'atraso',
    'vencida'
  ];
  return lossEvents.some(e => event.toUpperCase().includes(e.toUpperCase()));
}

function isAccessGrantedEvent(event: string): boolean {
  const grantedEvents = [
    'SALE_APPROVED',
    'SUBSCRIPTION_RENEWED',
    'SUBSCRIPTION_REACTIVATED',
    'PAYMENT_APPROVED',
    // Eventos em português (formato antigo)
    'assinatura renovada',
    'renovação',
    'aprovado',
    'confirmado',
    'pagamento aprovado'
  ];
  return grantedEvents.some(e => event.toUpperCase().includes(e.toUpperCase()));
}

function getEmailFromPayload(payload: KirvanoWebhookPayload): string | null {
  // Tentar customer.email primeiro (formato novo)
  if (payload.customer?.email) {
    return payload.customer.email;
  }
  // Tentar email direto (formato antigo)
  if (payload.email) {
    return payload.email;
  }
  return null;
}

function getEventFromPayload(payload: KirvanoWebhookPayload): string {
  // Tentar event primeiro (formato novo)
  if (payload.event) {
    return payload.event;
  }
  // Tentar evento (formato antigo)
  if (payload.evento) {
    return payload.evento;
  }
  return 'unknown';
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

    // Validar token de segurança (opcional - só valida se o token estiver configurado)
    const receivedToken = req.headers.get('x-webhook-token');
    
    // Se temos um token configurado E a requisição enviou um token, validamos
    // Se não há token na requisição, aceitamos (Kirvano não envia token por padrão)
    if (webhookToken && receivedToken && receivedToken !== webhookToken) {
      console.log('❌ Invalid webhook token');
      
      await supabase.from('kirvano_logs').insert({
        email: getEmailFromPayload(payload) || 'unknown',
        evento: getEventFromPayload(payload),
        produto: payload.products?.[0]?.name || payload.produto,
        status_execucao: 'error',
        error_message: 'Token de webhook inválido',
        detalhes: { ...payload, token_received: 'invalid' }
      });
      
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = getEmailFromPayload(payload);
    const event = getEventFromPayload(payload);
    const productName = payload.products?.[0]?.name || payload.produto || 'unknown';

    if (!email || event === 'unknown') {
      console.log('❌ Missing required fields - email:', email, 'event:', event);
      
      await supabase.from('kirvano_logs').insert({
        email: email || 'unknown',
        evento: event,
        produto: productName,
        status_execucao: 'error',
        error_message: 'Campos obrigatórios ausentes (email ou evento)',
        detalhes: payload
      });
      
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: email and event',
        received: { email, event }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📧 Processing webhook for email: ${email}, event: ${event}, product: ${productName}`);

    // Buscar usuário pelo email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      
      await supabase.from('kirvano_logs').insert({
        email,
        evento: event,
        produto: productName,
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
        evento: event,
        produto: productName,
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
        evento: event,
        produto: productName,
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
    
    if (isAccessGrantedEvent(event)) {
      // Assinatura renovada/aprovada - ativar plano premium
      newPlan = getPlanFromPayload(payload);
      console.log(`✅ Access granted event - setting plan to: ${newPlan}`);
    } else if (isAccessLossEvent(event)) {
      // Assinatura cancelada/atrasada - reverter para free
      newPlan = 'free';
      console.log(`⚠️ Access loss event - setting plan to: ${newPlan}`);
    } else {
      console.log(`ℹ️ Unknown event type: ${event}, keeping current plan: ${company.plan}`);
    }

    // Prepare update data with subscription dates
    const now = new Date();
    const updateData: Record<string, any> = {
      plan: newPlan,
      updated_at: now.toISOString()
    };

    // Set subscription dates when access is granted
    if (isAccessGrantedEvent(event)) {
      // Usar created_at do payload ou data atual
      const startDate = payload.created_at 
        ? new Date(payload.created_at) 
        : (payload.data_assinatura ? new Date(payload.data_assinatura) : now);
      
      // Usar next_charge_date do plano ou calcular
      let endDate: Date;
      if (payload.plan?.next_charge_date) {
        endDate = new Date(payload.plan.next_charge_date);
      } else if (payload.data_vencimento) {
        endDate = new Date(payload.data_vencimento);
      } else {
        endDate = calculateSubscriptionEndDate(newPlan, startDate);
      }
      
      updateData.subscription_start_date = startDate.toISOString();
      updateData.subscription_end_date = endDate.toISOString();
      updateData.subscription_status = 'active';
      
      console.log(`📅 Setting subscription dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    } else if (isAccessLossEvent(event)) {
      // Mark subscription as expired
      updateData.subscription_status = 'expired';
      console.log('⚠️ Marking subscription as expired');
    }

    // Atualizar plano na empresa
    const { error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', company.id);

    if (updateError) {
      console.error('❌ Error updating company plan:', updateError);
      
      await supabase.from('kirvano_logs').insert({
        email,
        evento: event,
        produto: productName,
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
      evento: event,
      produto: productName,
      user_found: true,
      plan_updated: true,
      status_execucao: 'success',
      detalhes: {
        ...payload,
        user_id: user.id,
        company_id: company.id,
        old_plan: company.plan,
        new_plan: newPlan,
        subscription_start: updateData.subscription_start_date,
        subscription_end: updateData.subscription_end_date
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