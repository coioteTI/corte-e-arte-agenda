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
    return handleVerification(url, supabase);
  }

  // POST = Incoming messages
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook received:", JSON.stringify(body).substring(0, 500));

      const tenantIdParam = url.searchParams.get("tenant");
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) {
        return jsonResponse({ status: "no_message" });
      }

      const message = value.messages[0];
      const senderPhone = message.from;
      const messageText = message.text?.body || "";
      const messageType = message.type || "text";
      const whatsappMessageId = message.id;

      // Find tenant
      let tenantId = tenantIdParam;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!tenantId && phoneNumberId) {
        const { data: t } = await supabase
          .from("whatsapp_tenants")
          .select("id")
          .eq("whatsapp_phone_number_id", phoneNumberId)
          .single();
        if (t) tenantId = t.id;
      }
      if (!tenantId) {
        console.error("No tenant found");
        return jsonResponse({ error: "tenant_not_found" });
      }

      // Get or create contact
      const contact = await getOrCreateContact(supabase, tenantId, senderPhone, value);
      if (!contact) return jsonResponse({ error: "contact_creation_failed" });

      // Get or create conversation
      const conversation = await getOrCreateConversation(supabase, tenantId, contact.id, messageText);
      if (!conversation) return jsonResponse({ error: "conversation_creation_failed" });

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

      // Bot logic
      const { data: tenantData } = await supabase
        .from("whatsapp_tenants")
        .select("bot_enabled, company_name, address, instagram, email, phone, business_hours, whatsapp_phone_number_id, whatsapp_access_token")
        .eq("id", tenantId)
        .single();

      if (tenantData?.bot_enabled && tenantData.whatsapp_access_token && tenantData.whatsapp_phone_number_id) {
        await handleBotResponse(supabase, tenantId, tenantData, contact, conversation, messageText, senderPhone);
      }

      return jsonResponse({ status: "ok" });
    } catch (error) {
      console.error("Webhook error:", error);
      return jsonResponse({ error: "internal_error" });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

// ─── Helpers ───

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleVerification(url: URL, supabase: any) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const tenantIdParam = url.searchParams.get("tenant");

  if (mode === "subscribe" && token && tenantIdParam) {
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

async function getOrCreateContact(supabase: any, tenantId: string, phone: string, value: any) {
  let { data: contact } = await supabase
    .from("whatsapp_contacts")
    .select("id, birth_date")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .single();

  if (!contact) {
    const senderName = value.contacts?.[0]?.profile?.name || null;
    const { data: newContact } = await supabase
      .from("whatsapp_contacts")
      .insert({ tenant_id: tenantId, phone, name: senderName, last_message_at: new Date().toISOString() })
      .select("id, birth_date")
      .single();
    return newContact;
  } else {
    await supabase.from("whatsapp_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", contact.id);
    return contact;
  }
}

async function getOrCreateConversation(supabase: any, tenantId: string, contactId: string, messageText: string) {
  let { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, unread_count")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .eq("status", "active")
    .single();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("whatsapp_conversations")
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        last_message_at: new Date().toISOString(),
        last_message_preview: messageText.substring(0, 100),
        unread_count: 1,
      })
      .select("id, unread_count")
      .single();
    return newConv;
  } else {
    await supabase.from("whatsapp_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: messageText.substring(0, 100),
      unread_count: (conversation.unread_count || 0) + 1,
    }).eq("id", conversation.id);
    return conversation;
  }
}

async function handleBotResponse(
  supabase: any,
  tenantId: string,
  tenantData: any,
  contact: any,
  conversation: any,
  messageText: string,
  senderPhone: string
) {
  // Get services
  const { data: services } = await supabase
    .from("whatsapp_services")
    .select("name, description, price, duration")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // Get today's booked slots
  const today = new Date().toISOString().split("T")[0];
  const { data: todayAppointments } = await supabase
    .from("whatsapp_appointments")
    .select("appointment_date, appointment_time")
    .eq("tenant_id", tenantId)
    .gte("appointment_date", today)
    .neq("status", "cancelled");

  const bookedSlots = (todayAppointments || []).map(
    (a: any) => `${a.appointment_date} ${a.appointment_time}`
  );

  // Get last 10 messages for context
  const { data: history } = await supabase
    .from("whatsapp_messages")
    .select("direction, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const historyMessages = (history || []).reverse().map((m: any) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.content,
  }));

  // Check if client has birth_date
  const needsBirthDate = !contact.birth_date;

  // Build knowledge base
  const knowledge = buildKnowledge(tenantData, services, bookedSlots, needsBirthDate);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return;

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
          ...historyMessages,
          { role: "user", content: messageText },
        ],
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", await aiResponse.text());
      return;
    }

    const aiData = await aiResponse.json();
    const botReply = aiData.choices?.[0]?.message?.content;
    if (!botReply) return;

    // Parse scheduling intent from bot reply
    await parseAndExecuteActions(supabase, tenantId, contact, conversation, botReply, messageText, senderPhone, tenantData, services);
  } catch (botErr) {
    console.error("Bot error:", botErr);
  }
}

function buildKnowledge(tenantData: any, services: any[], bookedSlots: string[], needsBirthDate: boolean) {
  const dayNames: Record<string, string> = {
    monday: "Segunda", tuesday: "Terça", wednesday: "Quarta",
    thursday: "Quinta", friday: "Sexta", saturday: "Sábado", sunday: "Domingo",
  };

  let hoursText = "";
  if (tenantData.business_hours) {
    hoursText = Object.entries(tenantData.business_hours)
      .map(([key, val]: [string, any]) => `${dayNames[key] || key}: ${val.isOpen ? `${val.start} - ${val.end}` : "Fechado"}`)
      .join("\n");
  }

  return `Você é o assistente virtual da empresa "${tenantData.company_name}".
Responda SEMPRE em português do Brasil. Seja cordial, breve e profissional.

DADOS DA EMPRESA:
- Nome: ${tenantData.company_name}
- Endereço: ${tenantData.address || "Não informado"}
- Telefone: ${tenantData.phone || "Não informado"}
- Instagram: ${tenantData.instagram || "Não informado"}
- E-mail: ${tenantData.email || "Não informado"}

HORÁRIOS DE FUNCIONAMENTO:
${hoursText || "Não configurado"}

SERVIÇOS DISPONÍVEIS:
${services?.map((s: any) => `- ${s.name}: R$${Number(s.price).toFixed(2)} (${s.duration} min) ${s.description || ""}`).join("\n") || "Nenhum serviço cadastrado"}

HORÁRIOS JÁ OCUPADOS (não ofereça estes):
${bookedSlots.length > 0 ? bookedSlots.join(", ") : "Nenhum horário ocupado"}

REGRAS DE AGENDAMENTO:
1. Para agendar, você PRECISA coletar: serviço desejado, data e horário.
2. Confirme os dados antes de finalizar.
3. Quando o cliente CONFIRMAR todos os dados do agendamento, inclua no FINAL da sua mensagem uma linha especial oculta no formato:
   [AGENDAR:serviço|YYYY-MM-DD|HH:MM]
   Exemplo: [AGENDAR:Corte de Cabelo|2026-03-15|14:00]
4. NÃO agende em horários já ocupados.
5. NÃO agende fora do horário de funcionamento.
6. NÃO agende em dias que a empresa está fechada.
${needsBirthDate ? `
COLETA DE DATA DE NASCIMENTO:
- Este cliente AINDA NÃO tem data de nascimento cadastrada.
- Antes de finalizar o PRIMEIRO agendamento, pergunte a data de nascimento (DD/MM/AAAA).
- Quando o cliente informar, inclua no final: [NASCIMENTO:DD/MM/AAAA]
- Peça APENAS UMA VEZ.` : ""}

REGRAS GERAIS:
- Não invente informações.
- Se não souber responder, oriente o cliente a entrar em contato pelo telefone.
- Nunca mostre as tags [AGENDAR:...] ou [NASCIMENTO:...] como texto visível ao cliente.`;
}

async function parseAndExecuteActions(
  supabase: any,
  tenantId: string,
  contact: any,
  conversation: any,
  botReply: string,
  _messageText: string,
  senderPhone: string,
  tenantData: any,
  services: any[]
) {
  let cleanReply = botReply;

  // Parse birth date
  const birthMatch = botReply.match(/\[NASCIMENTO:(\d{2})\/(\d{2})\/(\d{4})\]/);
  if (birthMatch) {
    const [, day, month, year] = birthMatch;
    const birthDate = `${year}-${month}-${day}`;
    await supabase.from("whatsapp_contacts").update({ birth_date: birthDate }).eq("id", contact.id);
    console.log(`Birth date saved for contact ${contact.id}: ${birthDate}`);
    cleanReply = cleanReply.replace(/\[NASCIMENTO:[^\]]+\]/, "").trim();
  }

  // Parse appointment
  const appointMatch = botReply.match(/\[AGENDAR:([^|]+)\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\]/);
  if (appointMatch) {
    const [, serviceName, date, time] = appointMatch;
    // Find service ID
    const matchedService = services?.find(
      (s: any) => s.name.toLowerCase() === serviceName.toLowerCase().trim()
    );

    const { error } = await supabase.from("whatsapp_appointments").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      service_id: matchedService?.id || null,
      appointment_date: date,
      appointment_time: time,
      booked_by: "bot",
      notes: `Agendado via WhatsApp Bot`,
    });

    if (error) {
      console.error("Appointment creation error:", error);
    } else {
      console.log(`Appointment created: ${serviceName} on ${date} at ${time}`);
    }
    cleanReply = cleanReply.replace(/\[AGENDAR:[^\]]+\]/, "").trim();
  }

  // Save bot reply
  await supabase.from("whatsapp_messages").insert({
    tenant_id: tenantId,
    conversation_id: conversation.id,
    contact_id: contact.id,
    direction: "outbound",
    content: cleanReply,
    message_type: "text",
    is_bot_response: true,
    status: "sent",
  });

  // Send via Meta API
  try {
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
          text: { body: cleanReply },
        }),
      }
    );
    const sendResult = await sendResponse.json();
    console.log("WhatsApp send result:", JSON.stringify(sendResult));
  } catch (sendErr) {
    console.error("WhatsApp send error:", sendErr);
  }

  // Update conversation
  await supabase.from("whatsapp_conversations").update({
    last_message_preview: cleanReply.substring(0, 100),
    last_message_at: new Date().toISOString(),
  }).eq("id", conversation.id);
}
