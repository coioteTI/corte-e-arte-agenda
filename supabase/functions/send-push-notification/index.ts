import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, clientId, message }: { 
      userId?: string; 
      clientId?: string; 
      message: PushMessage 
    } = await req.json();

    if (!message.title || !message.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar as subscriptions do usuário/cliente
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase.from('push_subscriptions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Erro ao buscar subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificações para cada subscription
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const payload = JSON.stringify({
          title: message.title,
          body: message.body,
          icon: message.icon || '/icon-192x192.png',
          badge: message.badge || '/icon-192x192.png',
          url: message.url || '/',
          tag: message.tag || 'default',
        });

        // Usar web-push para enviar a notificação
        const webpush = await import('https://esm.sh/web-push@3.6.6');
        
        webpush.setVapidDetails(
          'mailto:contato@corteearte.site',
          vapidPublicKey,
          vapidPrivateKey
        );

        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(subscription, payload);
        return { success: true, subscription_id: sub.id };
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        
        // Se a subscription é inválida, remover do banco
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
        
        return { success: false, subscription_id: sub.id, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Sent ${successful} notifications, ${failed} failed`,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});