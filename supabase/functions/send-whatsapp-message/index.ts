import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenantId, contactId, conversationId, message } = await req.json();

    if (!tenantId || !contactId || !conversationId || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify tenant ownership
    const { data: tenant } = await supabase
      .from("whatsapp_tenants")
      .select("whatsapp_phone_number_id, whatsapp_access_token")
      .eq("id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (!tenant || !tenant.whatsapp_access_token || !tenant.whatsapp_phone_number_id) {
      return new Response(JSON.stringify({ error: "Tenant not found or not configured" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get contact phone
    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("phone")
      .eq("id", contactId)
      .eq("tenant_id", tenantId)
      .single();

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Meta WhatsApp API
    const sendRes = await fetch(
      `https://graph.facebook.com/v21.0/${tenant.whatsapp_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tenant.whatsapp_access_token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const sendResult = await sendRes.json();
    console.log("Send result:", JSON.stringify(sendResult));

    const whatsappMessageId = sendResult?.messages?.[0]?.id || null;

    // Save message in DB
    await supabase.from("whatsapp_messages").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: "outbound",
      content: message,
      message_type: "text",
      is_bot_response: false,
      whatsapp_message_id: whatsappMessageId,
      status: sendRes.ok ? "sent" : "failed",
    });

    // Update conversation
    await supabase.from("whatsapp_conversations").update({
      last_message_preview: message.substring(0, 100),
      last_message_at: new Date().toISOString(),
    }).eq("id", conversationId);

    return new Response(
      JSON.stringify({ status: "ok", whatsapp_message_id: whatsappMessageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
