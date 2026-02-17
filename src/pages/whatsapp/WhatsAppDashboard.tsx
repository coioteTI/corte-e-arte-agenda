import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Users, CalendarDays, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppDashboard = () => {
  const [stats, setStats] = useState({ messages: 0, contacts: 0, appointments: 0, services: 0 });
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tenant } = await supabase
      .from("whatsapp_tenants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenant) return;
    setTenantId(tenant.id);

    const [messagesRes, contactsRes, appointmentsRes, servicesRes] = await Promise.all([
      supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("whatsapp_contacts").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("whatsapp_appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "scheduled"),
      supabase.from("whatsapp_services").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true),
    ]);

    setStats({
      messages: messagesRes.count || 0,
      contacts: contactsRes.count || 0,
      appointments: appointmentsRes.count || 0,
      services: servicesRes.count || 0,
    });
  };

  const cards = [
    { title: "Mensagens", value: stats.messages, icon: MessageCircle, desc: "Total de mensagens" },
    { title: "Contatos", value: stats.contacts, icon: Users, desc: "Contatos cadastrados" },
    { title: "Agendamentos", value: stats.appointments, icon: CalendarDays, desc: "Pendentes" },
    { title: "Serviços", value: stats.services, icon: Briefcase, desc: "Ativos" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
