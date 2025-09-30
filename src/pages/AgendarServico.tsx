// AgendarServico.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateAppointment } from "@/utils/validation";
import { PaymentSection } from "@/components/PaymentSection";

type Company = { /* ...mesmo que antes */ };
type Service = { /* ...mesmo que antes */ };
type Professional = { /* ...mesmo que antes */ };
type Appointment = {
  id?: string;
  company_id: string;
  service_id: string;
  professional_id: string;
  client_id?: string | null;
  clientName?: string; // ✅ corrigido de fullName
  appointment_date: string;
  appointment_time: string;
  notes?: string | null;
  status: string;
  total_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  pix_payment_proof?: string | null;
};

export default function AgendarServico() {
  const { slug } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [clientName, setClientName] = useState<string>(""); // ✅ renomeado
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  const [pixProof, setPixProof] = useState<File | null>(null);
  const [pixProofUrl, setPixProofUrl] = useState<string>("");

  const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [companySettings, setCompanySettings] = useState<any>(null);

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const hasTimeConflict = (startTime: string, duration: number, professionalId: string, dateStr: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + duration;
    const professionalAppointments = appointments.filter(apt => 
      apt.professional_id === professionalId &&
      apt.appointment_date === dateStr &&
      ["confirmed", "scheduled", "pending"].includes(apt.status)
    );
    for (const apt of professionalAppointments) {
      const aptStartMinutes = timeToMinutes(apt.appointment_time);
      const existingService = services.find(s => s.id === apt.service_id);
      const existingDuration = existingService?.duration || 30;
      const aptEndMinutes = aptStartMinutes + existingDuration;
      if (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes) return true;
    }
    return false;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agendamento_form_v1");
      if (saved) {
        const obj = JSON.parse(saved);
        setClientName(obj.fullName || ""); // ✅ ajustar para clientName
        setWhatsapp(obj.whatsapp || "");
        setEmail(obj.email || "");
      }
    } catch (e) { console.warn("Erro ao ler storage", e); }
  }, []);

  useEffect(() => { if (slug) fetchCompanyData(); }, [slug]);

  async function fetchCompanyData() {
    try {
      setLoading(true);
      const searchName = slug?.replace(/-/g, " ") || "";
      const { data: companies } = await supabase.from("companies").select("*").ilike("name", `%${searchName}%`);
      const companyData = companies?.find(c => c.name.toLowerCase().replace(/\s+/g,'-') === slug?.toLowerCase()) || companies?.[0];
      if (!companyData) return;
      setCompany(companyData);

      const { data: servicesData } = await supabase.from("services").select("*").eq("company_id", companyData.id);
      setServices(servicesData || []);

      const { data: professionalsData } = await supabase.rpc("get_professionals_for_booking", { company_uuid: companyData.id });
      setProfessionals(professionalsData || []);

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("company_id", companyData.id)
        .in("status", ["confirmed","scheduled","pending"]);
      setAppointments(appointmentsData || []);

      const { data: settings } = await supabase.rpc('get_or_create_company_settings', { company_uuid: companyData.id });
      if (settings && settings[0]) {
        setCompanySettings(settings[0]);
        const paymentMethods = settings[0].payment_methods || ["no_local"];
        if (paymentMethods.length === 1) setSelectedPaymentMethod(paymentMethods[0]);
      }
    } catch (e) { setServices([]); setProfessionals([]); setCompany(null); }
    finally { setLoading(false); }
  }

  const reloadAppointments = useCallback(async () => {
    if (!company?.id) return;
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("*")
      .eq("company_id", company.id)
      .in("status", ["confirmed","scheduled","pending"]);
    setAppointments(appointmentsData || []);
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    const interval = setInterval(reloadAppointments, 30000);
    return () => clearInterval(interval);
  }, [company?.id, reloadAppointments]);

  const availableTimes = useMemo(() => {
    if (!selectedProfessionalId || !selectedDate) return [];
    const professional = professionals.find(p => p.id === selectedProfessionalId);
    if (!professional) return [];
    const service = services.find(s => s.id === selectedServiceId);
    const duration = service?.duration || 30;
    const times: string[] = [];
    const hours = [9,10,11,12,13,14,15,16,17];
    for (const h of hours) for (const m of [0,30]) {
      const timeStr = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
      if (!hasTimeConflict(timeStr,duration,selectedProfessionalId,format(selectedDate,"yyyy-MM-dd"))) times.push(timeStr);
    }
    return times;
  }, [selectedProfessionalId, selectedDate, selectedServiceId, appointments, professionals, services]);

  const isFormValid = useMemo(() => {
    return validateAppointment({
      clientName, // ✅ corrigido
      whatsapp,
      email,
      selectedServiceId,
      selectedProfessionalId,
      selectedDate,
      selectedTime,
      selectedPaymentMethod,
    });
  }, [clientName, whatsapp, email, selectedServiceId, selectedProfessionalId, selectedDate, selectedTime, selectedPaymentMethod]);

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Preencha todos os campos corretamente."); return; }
    setSubmitting(true);
    try {
      const newAppointment: Appointment = {
        company_id: company!.id,
        service_id: selectedServiceId!,
        professional_id: selectedProfessionalId!,
        clientName, // ✅ corrigido
        appointment_date: format(selectedDate!, "yyyy-MM-dd"),
        appointment_time: selectedTime!,
        notes,
        status: "pending",
        payment_method: selectedPaymentMethod,
      };
      const { error } = await supabase.from("appointments").insert([newAppointment]);
      if (error) toast.error("Erro ao agendar serviço");
      else toast.success("Serviço agendado com sucesso!");
    } catch (e) { toast.error("Erro inesperado"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div>Carregando...</div>;
  if (!company) return <div>Empresa não encontrada</div>;

  return (
    <Card>
      <CardHeader><CardTitle>Agendar Serviço - {company.name}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="clientName">Nome Completo</Label>
            <Input id="clientName" value={clientName} onChange={e=>setClientName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="service">Serviço</Label>
            <Select value={selectedServiceId ?? ""} onValueChange={setSelectedServiceId}>
              <SelectTrigger><SelectValue placeholder="Selecione um serviço"/></SelectTrigger>
              <SelectContent>
                {services.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="professional">Profissional</Label>
            <Select value={selectedProfessionalId ?? ""} onValueChange={setSelectedProfessionalId}>
              <SelectTrigger><SelectValue placeholder="Selecione um profissional"/></SelectTrigger>
              <SelectContent>
                {professionals.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">{selectedDate ? format(selectedDate,"dd/MM/yyyy") : "Selecione a data"}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  disabled={date=>date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="time">Horário</Label>
            <Select value={selectedTime ?? ""} onValueChange={setSelectedTime}>
              <SelectTrigger><SelectValue placeholder="Selecione o horário"/></SelectTrigger>
              <SelectContent>
                {availableTimes.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>

          {companySettings && (
            <PaymentSection
              paymentMethod={selectedPaymentMethod ?? ""}
              setPaymentMethod={setSelectedPaymentMethod}
              pixProof={pixProof}
              setPixProof={setPixProof}
              pixProofUrl={pixProofUrl}
              setPixProofUrl={setPixProofUrl}
              companySettings={companySettings}
            />
          )}

          <Checkbox
            checked={saveForFuture}
            onCheckedChange={(value)=>setSaveForFuture(value === true)} // ✅ TS2322 fix
          >
            Salvar meus dados para próximas vezes
          </Checkbox>

          <Button
            className="mt-4"
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
          >
            {submitting ? "Agendando..." : "Agendar Serviço"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
