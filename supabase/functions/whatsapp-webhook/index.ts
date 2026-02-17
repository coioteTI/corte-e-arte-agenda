import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // GET = Meta webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const tenantIdParam = url.searchParams.get("tenant");

    if (mode === "subscribe" && token && tenantIdParam) {
      // Verify token matches tenant's verify_token
      const { data: tenant } = await supabase
        .from("whatsapp_tenants")
        .select("whatsapp_verify_token")
        .eq("id", tenantIdParam)
        .single();

      if (tenant && tenant.whatsapp_verify_token === token) {
        console.log("Webhook verified for tenant:", tenantIdParam);
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST = Incoming messages
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook received:", JSON.stringify(body));

      const tenantIdParam = url.searchParams.get("tenant");

      // Extract message data from Meta webhook payload
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) {
        return new Response(JSON.stringify({ status: "no_message" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = value.messages[0];
      const senderPhone = message.from;
      const messageText = message.text?.body || "";
      const messageType = message.type || "text";
      const whatsappMessageId = message.id;

      // Find tenant by phone_number_id or param
      let tenantId = tenantIdParam;
      const phoneNumberId = value.metadata?.phone_number_id;

      if (!tenantId && phoneNumberId) {
        const { data: tenant } = await supabase
          .from("whatsapp_tenants")
          .select("id")
          .eq("whatsapp_phone_number_id", phoneNumberId)
          .single();
        if (tenant) tenantId = tenant.id;
      }

      if (!tenantId) {
        console.error("No tenant found for this webhook");
        return new Response(JSON.stringify({ error: "tenant_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create contact
      let { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone", senderPhone)
        .single();

      if (!contact) {
        const senderName = value.contacts?.[0]?.profile?.name || null;
        const { data: newContact } = await supabase
          .from("whatsapp_contacts")
          .insert({ tenant_id: tenantId, phone: senderPhone, name: senderName, last_message_at: new Date().toISOString() })
          .select("id")
          .single();
        contact = newContact;
      } else {
        await supabase.from("whatsapp_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", contact.id);
      }

      if (!contact) {
        return new Response(JSON.stringify({ error: "contact_creation_failed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create conversation
      let { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("id, unread_count")
        .eq("tenant_id", tenantId)
        .eq("contact_id", contact.id)
        .eq("status", "active")
        .single();

      if (!conversation) {
        const { data: newConv } = await supabase
          .from("whatsapp_conversations")
          .insert({ tenant_id: tenantId, contact_id: contact.id, last_message_at: new Date().toISOString(), last_message_preview: messageText.substring(0, 100), unread_count: 1 })
          .select("id, unread_count")
          .single();
        conversation = newConv;
      } else {
        await supabase.from("whatsapp_conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageText.substring(0, 100),
          unread_count: (conversation.unread_count || 0) + 1,
        }).eq("id", conversation.id);
      }

      if (!conversation) {
        return new Response(JSON.stringify({ error: "conversation_creation_failed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save inbound message
      await supabase.from("whatsapp_messages").insert({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        direction: "inbound",
        content: messageText,
        message_type: messageType,
        whatsapp_message_id: whatsappMessageId,
        status: "received",
      });

      // Check if bot is enabled for this tenant
      const { data: tenantData } = await supabase
        .from("whatsapp_tenants")
        .select("bot_enabled, company_name, address, instagram, email, phone, business_hours, whatsapp_phone_number_id, whatsapp_access_token")
        .eq("id", tenantId)
        .single();

      if (tenantData?.bot_enabled && tenantData.whatsapp_access_token && tenantData.whatsapp_phone_number_id) {
        // Get services for bot knowledge
        const { data: services } = await supabase
          .from("whatsapp_services")
          .select("name, description, price, duration")
          .eq("tenant_id", tenantId)
          .eq("is_active", true);

        // Build knowledge base
        const knowledge = `
Você é o assistente virtual da empresa "${tenantData.company_name}".
Responda APENAS com base nas informações abaixo. Seja breve e objetivo.

Empresa: ${tenantData.company_name}
Endereço: ${tenantData.address || "Não informado"}
Telefone: ${tenantData.phone || "Não informado"}
Instagram: ${tenantData.instagram || "Não informado"}
E-mail: ${tenantData.email || "Não informado"}

Horários: ${JSON.stringify(tenantData.business_hours)}

Serviços disponíveis:
${services?.map(s => `- ${s.name}: R$${s.price} (${s.duration} min) ${s.description || ""}`).join("\n") || "Nenhum serviço cadastrado"}

Regras:
- Responda sempre em português do Brasil.
- Seja cordial e profissional.
- Se não souber a resposta, oriente o cliente a entrar em contato pelo telefone.
- Não invente informações.
`;

        try {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (LOVABLE_API_KEY) {
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: knowledge },
                  { role: "user", content: messageText },
                ],
                max_tokens: 500,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const botReply = aiData.choices?.[0]?.message?.content;

              if (botReply) {
                // Save bot reply
                await supabase.from("whatsapp_messages").insert({
                  tenant_id: tenantId,
                  conversation_id: conversation.id,
                  contact_id: contact.id,
                  direction: "outbound",
                  content: botReply,
                  message_type: "text",
                  is_bot_response: true,
                  status: "sent",
                });

                // Send via Meta WhatsApp API
                const sendResponse = await fetch(
                  `https://graph.facebook.com/v21.0/${tenantData.whatsapp_phone_number_id}/messages`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${tenantData.whatsapp_access_token}`,
                    },
                    body: JSON.stringify({
                      messaging_product: "whatsapp",
                      to: senderPhone,
                      type: "text",
                      text: { body: botReply },
                    }),
                  }
                );

                const sendResult = await sendResponse.json();
                console.log("WhatsApp send result:", JSON.stringify(sendResult));

                // Update conversation preview
                await supabase.from("whatsapp_conversations").update({
                  last_message_preview: botReply.substring(0, 100),
                  last_message_at: new Date().toISOString(),
                }).eq("id", conversation.id);
              }
            }
          }
        } catch (botErr) {
          console.error("Bot error:", botErr);
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: "internal_error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
