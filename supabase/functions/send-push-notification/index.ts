import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, companyId, branchId, message }: { 
      userId?: string; 
      companyId?: string;
      branchId?: string;
      message: PushMessage 
    } = await req.json();

    console.log('Push notification request:', { userId, companyId, branchId, message });

    if (!message.title || !message.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query to get subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    // If companyId provided, get all users from that company
    if (companyId) {
      // Get the company owner's user_id
      const { data: company } = await supabase
        .from('companies')
        .select('user_id')
        .eq('id', companyId)
        .single();
      
      if (company) {
        query = query.eq('user_id', company.user_id);
      }
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
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

    console.log(`Sending push to ${subscriptions.length} subscriptions`);

    // Send notifications to each subscription
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const payload = JSON.stringify({
          title: message.title,
          body: message.body,
          icon: message.icon || '/icon-192x192.png',
          badge: message.badge || '/icon-192x192.png',
          url: message.url || '/dashboard/agenda',
          tag: message.tag || 'appointment',
          data: message.data || {},
        });

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
        console.log('Push sent successfully to:', sub.id);
        return { success: true, subscription_id: sub.id };
      } catch (error: any) {
        console.error('Error sending push notification:', error);
        
        // If subscription is invalid (expired/unsubscribed), remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Removing invalid subscription:', sub.id);
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

    console.log(`Push results: ${successful} sent, ${failed} failed`);

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

  } catch (error: any) {
    console.error('Push notification function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
