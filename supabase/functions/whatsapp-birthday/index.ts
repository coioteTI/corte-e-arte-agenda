import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const today = new Date();
    const dayStr = String(today.getDate()).padStart(2, "0");
    const monthStr = String(today.getMonth() + 1).padStart(2, "0");
    const currentYear = today.getFullYear();

    console.log(`Checking birthdays for ${dayStr}/${monthStr}/${currentYear}`);

    // Get all tenants with birthday messages enabled
    const { data: tenants } = await supabase
      .from("whatsapp_tenants")
      .select("id, company_name, birthday_message_enabled, birthday_message_template, whatsapp_phone_number_id, whatsapp_access_token, business_hours")
      .eq("birthday_message_enabled", true);

    if (!tenants || tenants.length === 0) {
      return jsonResponse({ status: "no_tenants_with_birthday_enabled" });
    }

    let totalSent = 0;

    for (const tenant of tenants) {
      if (!tenant.whatsapp_access_token || !tenant.whatsapp_phone_number_id) continue;

      // Check if within business hours
      if (!isWithinBusinessHours(tenant.business_hours, today)) {
        console.log(`Tenant ${tenant.id} outside business hours, skipping`);
        continue;
      }

      // Find contacts with today's birthday (match day and month)
      const { data: contacts } = await supabase
        .from("whatsapp_contacts")
        .select("id, name, phone, birth_date")
        .eq("tenant_id", tenant.id)
        .not("birth_date", "is", null);

      if (!contacts) continue;

      const birthdayContacts = contacts.filter((c: any) => {
        if (!c.birth_date) return false;
        const bd = new Date(c.birth_date + "T12:00:00");
        return bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
      });

      for (const contact of birthdayContacts) {
        // Check if already sent this year
        const { data: existing } = await supabase
          .from("whatsapp_birthday_logs")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("contact_id", contact.id)
          .eq("year", currentYear)
          .maybeSingle();

        if (existing) {
          console.log(`Already sent birthday to ${contact.phone} for ${currentYear}`);
          continue;
        }

        // Build message
        const template = tenant.birthday_message_template ||
          "🎂 Feliz Aniversário, {nome}! 🎉\n\nA equipe {empresa} deseja um dia incrível para você! ❤️";

        const message = template
          .replace(/{nome}/g, contact.name || "Cliente")
          .replace(/{empresa}/g, tenant.company_name || "nossa empresa");

        // Send via WhatsApp
        try {
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
          console.log(`Birthday sent to ${contact.phone}:`, JSON.stringify(sendResult));

          // Log the send
          await supabase.from("whatsapp_birthday_logs").insert({
            tenant_id: tenant.id,
            contact_id: contact.id,
            year: currentYear,
          });

          // Save as outbound message in conversation
          const { data: conv } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("tenant_id", tenant.id)
            .eq("contact_id", contact.id)
            .eq("status", "active")
            .maybeSingle();

          if (conv) {
            await supabase.from("whatsapp_messages").insert({
              tenant_id: tenant.id,
              conversation_id: conv.id,
              contact_id: contact.id,
              direction: "outbound",
              content: message,
              message_type: "text",
              is_bot_response: true,
              status: "sent",
            });
          }

          totalSent++;
        } catch (sendErr) {
          console.error(`Failed to send birthday to ${contact.phone}:`, sendErr);
        }
      }
    }

    console.log(`Birthday check complete. Sent ${totalSent} messages.`);
    return jsonResponse({ status: "ok", sent: totalSent });
  } catch (error) {
    console.error("Birthday function error:", error);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isWithinBusinessHours(businessHours: any, now: Date): boolean {
  if (!businessHours) return true;

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayKey = days[now.getDay()];
  const dayConfig = businessHours[dayKey];

  if (!dayConfig || !dayConfig.isOpen) return false;

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return currentTime >= dayConfig.start && currentTime <= dayConfig.end;
}
