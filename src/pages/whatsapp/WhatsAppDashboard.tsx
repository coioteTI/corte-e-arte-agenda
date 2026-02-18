import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, CalendarDays, Briefcase, Bot, TrendingUp, Cake, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppDashboard = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMessages: 0,
    messagesToday: 0,
    botResponsesToday: 0,
    contacts: 0,
    appointmentsToday: 0,
    appointmentsPending: 0,
    services: 0,
    birthdaysToday: 0,
  });
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tenant } = await supabase
      .from("whatsapp_tenants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!tenant) return;
    setTenantId(tenant.id);

    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    const [
      totalMsgRes,
      todayMsgRes,
      botTodayRes,
      contactsRes,
      aptTodayRes,
      aptPendingRes,
      servicesRes,
      recentConvRes,
      upcomingAptRes,
    ] = await Promise.all([
      supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", todayStart).lte("created_at", todayEnd),
      supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_bot_response", true).gte("created_at", todayStart).lte("created_at", todayEnd),
      supabase.from("whatsapp_contacts").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("whatsapp_appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("appointment_date", today),
      supabase.from("whatsapp_appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "scheduled"),
      supabase.from("whatsapp_services").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true),
      supabase.from("whatsapp_conversations").select("*, contact:whatsapp_contacts(name, phone)").eq("tenant_id", tenant.id).order("last_message_at", { ascending: false }).limit(5),
      supabase.from("whatsapp_appointments").select("*, contact:whatsapp_contacts(name, phone), service:whatsapp_services(name)").eq("tenant_id", tenant.id).gte("appointment_date", today).eq("status", "scheduled").order("appointment_date").order("appointment_time").limit(5),
    ]);

    // Count birthdays today
    const { data: allContacts } = await supabase
      .from("whatsapp_contacts")
      .select("birth_date")
      .eq("tenant_id", tenant.id)
      .not("birth_date", "is", null);

    const now = new Date();
    const birthdaysToday = (allContacts || []).filter((c: any) => {
      const bd = new Date(c.birth_date + "T12:00:00");
      return bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth();
    }).length;

    setStats({
      totalMessages: totalMsgRes.count || 0,
      messagesToday: todayMsgRes.count || 0,
      botResponsesToday: botTodayRes.count || 0,
      contacts: contactsRes.count || 0,
      appointmentsToday: aptTodayRes.count || 0,
      appointmentsPending: aptPendingRes.count || 0,
      services: servicesRes.count || 0,
      birthdaysToday,
    });

    if (recentConvRes.data) setRecentConversations(recentConvRes.data);
    if (upcomingAptRes.data) setUpcomingAppointments(upcomingAptRes.data);
  };

  const mainCards = [
    { title: "Mensagens Hoje", value: stats.messagesToday, total: stats.totalMessages, icon: MessageCircle, desc: `${stats.totalMessages} total`, color: "text-blue-500" },
    { title: "Respostas do Bot", value: stats.botResponsesToday, icon: Bot, desc: "Hoje", color: "text-purple-500" },
    { title: "Contatos", value: stats.contacts, icon: Users, desc: "Cadastrados", color: "text-green-500" },
    { title: "Agendamentos Hoje", value: stats.appointmentsToday, icon: CalendarDays, desc: `${stats.appointmentsPending} pendentes`, color: "text-orange-500" },
    { title: "Serviços Ativos", value: stats.services, icon: Briefcase, desc: "Disponíveis", color: "text-teal-500" },
    { title: "Aniversariantes", value: stats.birthdaysToday, icon: Cake, desc: "Hoje", color: "text-pink-500" },
  ];

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Dashboard
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Conversas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa ainda</p>
            ) : (
              recentConversations.map((conv: any) => (
                <div key={conv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.contact?.name || conv.contact?.phone}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-[10px] text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="text-xs h-5 min-w-5 p-0 flex items-center justify-center rounded-full">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento pendente</p>
            ) : (
              upcomingAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-primary">{apt.appointment_time?.substring(0, 5)}</div>
                    <div>
                      <p className="text-sm font-medium">{apt.contact?.name || apt.contact?.phone}</p>
                      <p className="text-xs text-muted-foreground">{apt.service?.name || "Sem serviço"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(apt.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    {apt.booked_by === "bot" && (
                      <Badge variant="outline" className="text-[10px]"><Bot className="h-3 w-3 mr-1" />Bot</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
