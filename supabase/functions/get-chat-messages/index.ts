import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { email, ticket_id } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If ticket_id is provided, get messages for that ticket
    if (ticket_id) {
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('id, sender_type, message, created_at')
        .eq('ticket_id', ticket_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, messages: messages || [], ticket_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Otherwise, find ticket by email from contact_messages
    const { data: contactWithTicket } = await supabase
      .from('contact_messages')
      .select('ticket_id')
      .eq('email', email)
      .not('ticket_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (contactWithTicket?.ticket_id) {
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('id, sender_type, message, created_at')
        .eq('ticket_id', contactWithTicket.ticket_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true, 
          messages: messages || [], 
          ticket_id: contactWithTicket.ticket_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No ticket found, return empty
    return new Response(
      JSON.stringify({ success: true, messages: [], ticket_id: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching chat messages:', error)
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar mensagens' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})