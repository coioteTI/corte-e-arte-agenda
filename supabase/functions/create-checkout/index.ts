import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Recebida requisição: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando processamento do checkout...");
    
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!supabaseUrl || !supabaseKey || !stripeKey) {
      console.error("Variáveis de ambiente não configuradas:", {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        stripeKey: !!stripeKey
      });
      throw new Error("Configuração do servidor incompleta");
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log("Cliente Supabase criado com sucesso");

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorização não fornecido");
    }
    
    const token = authHeader.replace("Bearer ", "");
    console.log("Verificando autenticação do usuário...");
    
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      console.error("Erro na autenticação:", authError);
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      throw new Error("Usuário não autenticado ou email não disponível");
    }
    
    console.log("Usuário autenticado:", user.email);

    // Inicializar Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    console.log("Cliente Stripe inicializado");

    // Verificar se cliente já existe no Stripe
    console.log("Verificando cliente existente no Stripe...");
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Cliente existente encontrado:", customerId);
    } else {
      console.log("Nenhum cliente existente encontrado");
    }

    // Obter origem para URLs de redirect
    const origin = req.headers.get("origin") || "http://localhost:3000";
    console.log("Origem da requisição:", origin);

    // Criar sessão de checkout
    console.log("Criando sessão de checkout no Stripe...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { 
              name: "Plano Premium - Corte & Arte",
              description: "Acesso completo à plataforma de agendamentos"
            },
            unit_amount: 5900, // R$ 59,00 em centavos
            recurring: { 
              interval: "month" 
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/pagamento-sucesso`,
      cancel_url: `${origin}/pagamento-cancelado`,
    });

    console.log("Sessão de checkout criada com sucesso:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Erro no create-checkout:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    console.error("Mensagem de erro:", errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});