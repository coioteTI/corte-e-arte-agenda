import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Plus, Bot, User } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  booked_by: string | null;
  notes: string | null;
  contact?: { name: string | null; phone: string };
  service?: { name: string; price: number; duration: number } | null;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  completed: "bg-muted",
  cancelled: "bg-destructive",
};

const WhatsAppAgenda = () => {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ contact_id: "", service_id: "", date: "", time: "", notes: "" });

  useEffect(() => { loadTenant(); }, []);
  useEffect(() => { if (tenantId) loadAppointments(); }, [tenantId, selectedDate]);

  const loadTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("whatsapp_tenants").select("id").eq("user_id", user.id).maybeSingle();
    if (data) {
      setTenantId(data.id);
      const [c, s] = await Promise.all([
        supabase.from("whatsapp_contacts").select("id, name, phone").eq("tenant_id", data.id),
        supabase.from("whatsapp_services").select("id, name, price, duration").eq("tenant_id", data.id).eq("is_active", true),
      ]);
      if (c.data) setContacts(c.data);
      if (s.data) setServices(s.data);
    }
  };

  const loadAppointments = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("whatsapp_appointments")
      .select("*, contact:whatsapp_contacts(name, phone), service:whatsapp_services(name, price, duration)")
      .eq("tenant_id", tenantId)
      .eq("appointment_date", selectedDate)
      .order("appointment_time");
    if (data) setAppointments(data as any);
  };

  const handleSave = async () => {
    if (!tenantId || !form.contact_id || !form.date || !form.time) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("whatsapp_appointments").insert({
        tenant_id: tenantId,
        contact_id: form.contact_id,
        service_id: form.service_id || null,
        appointment_date: form.date,
        appointment_time: form.time,
        booked_by: "manual",
        notes: form.notes || null,
      });
      if (error) throw error;
      toast({ title: "Agendamento criado!" });
      setIsOpen(false);
      setForm({ contact_id: "", service_id: "", date: "", time: "", notes: "" });
      loadAppointments();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("whatsapp_appointments").update({ status }).eq("id", id);
    loadAppointments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6" /> Agenda</h1>
        <div className="flex items-center gap-3">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Contato *</Label>
                  <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.phone}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Serviço</Label>
                  <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} - R${s.price}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><Label>Horário *</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
                </div>
                <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={handleSave}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum agendamento para esta data</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold text-primary">{apt.appointment_time?.substring(0, 5)}</div>
                  <div>
                    <div className="font-medium">{(apt as any).contact?.name || (apt as any).contact?.phone}</div>
                    <div className="text-sm text-muted-foreground">{(apt as any).service?.name || "Sem serviço"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {apt.booked_by === "bot" ? (
                    <Badge variant="outline" className="text-xs"><Bot className="h-3 w-3 mr-1" /> Bot</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs"><User className="h-3 w-3 mr-1" /> Manual</Badge>
                  )}
                  <Badge className={`${statusColors[apt.status] || "bg-muted"} text-white text-xs`}>
                    {apt.status === "scheduled" ? "Agendado" : apt.status === "confirmed" ? "Confirmado" : apt.status === "completed" ? "Concluído" : "Cancelado"}
                  </Badge>
                  {apt.status === "scheduled" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "confirmed")}>Confirmar</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "cancelled")}>Cancelar</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhatsAppAgenda;
