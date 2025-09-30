// AgendarServico.tsx
import { useEffect, useState, useCallback, useMemo, Dispatch, SetStateAction } from "react";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GallerySection } from "@/components/GallerySection";
import { PaymentSection } from "@/components/PaymentSection";

// Tipagens
type Company = {
  id: string;
  name: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  business_hours: any;
  likes_count: number;
  instagram: string | null;
  logo_url: string | null;
  email: string;
  phone: string;
};

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  professional_responsible: string | null;
};

type Professional = {
  id: string;
  company_id: string;
  name: string;
  specialty: string | null;
  phone?: string | null;
  email?: string | null;
  is_available: boolean;
  created_at?: string;
};

type Appointment = {
  id?: string;
  company_id: string;
  service_id: string;
  professional_id: string;
  client_id?: string | null;
  fullName: string; // ✅ agora existe fullName
  appointment_date: string;
  appointment_time: string;
  notes?: string | null;
  status: string;
  total_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  pix_payment_proof?: string | null;
};

// PaymentSection Props
type PaymentSectionProps = {
  paymentMethod: string | undefined;
  setPaymentMethod: Dispatch<SetStateAction<string | undefined>>;
  pixProof: File | null;
  setPixProof: Dispatch<SetStateAction<File | null>>;
  pixProofUrl: string;
  setPixProofUrl: Dispatch<SetStateAction<string>>;
  companySettings: any;
};

// Função de validação
export function validateAppointment(appointment: {
  fullName: string;
  whatsapp: string;
  email: string;
  selectedServiceId?: string;
  selectedProfessionalId?: string;
  selectedDate?: Date;
  selectedTime?: string;
  selectedPaymentMethod?: string;
}) {
  return (
    appointment.fullName.trim().length > 0 &&
    appointment.whatsapp.trim().length > 0 &&
    appointment.email.trim().length > 0 &&
    !!appointment.selectedServiceId &&
    !!appointment.selectedProfessionalId &&
    !!appointment.selectedDate &&
    !!appointment.selectedTime &&
    !!appointment.selectedPaymentMethod
  );
}

export default function AgendarServico() {
  const { slug } = useParams();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [fullName, setFullName] = useState<string>("");
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

  // Funções auxiliares
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
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

      if (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agendamento_form_v1");
      if (saved) {
        const obj = JSON.parse(saved);
        setFullName(obj.fullName || "");
        setWhatsapp(obj.whatsapp || "");
        setEmail(obj.email || "");
      }
    } catch (e) {
      console.warn("Erro ao ler storage", e);
    }
  }, []);

  useEffect(() => {
    if (slug) fetchCompanyData();
  }, [slug]);

  async function fetchCompanyData() {
    try {
      setLoading(true);
      const searchName = slug?.replace(/-/g, " ") || "";
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", `%${searchName}%`);

      if (companyError || !companies || companies.length === 0) {
        toast.error("Empresa não encontrada");
        return;
      }

      const companyData = companies.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === slug?.toLowerCase()
      ) || companies[0];
      
      setCompany(companyData);

      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("company_id", companyData.id);
      
      setServices(servicesData || []);

      const { data: professionalsData } = await supabase
        .from("professionals")
        .select("*")
        .eq("company_id", companyData.id);
      
      setProfessionals(professionalsData || []);

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("company_id", companyData.id)
        .in("status", ["confirmed", "scheduled", "pending"]);
      
      setAppointments(appointmentsData || []);

      const { data: settings } = await supabase
        .rpc('get_or_create_company_settings', { company_uuid: companyData.id });
      
      if (settings && settings[0]) {
        setCompanySettings(settings[0]);
        const paymentMethods = settings[0].payment_methods || ["no_local"];
        if (paymentMethods.length === 1) setSelectedPaymentMethod(paymentMethods[0]);
      }

    } catch (error) {
      setCompany(null);
      setServices([]);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }

  const reloadAppointments = useCallback(async () => {
    if (!company?.id) return;

    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("*")
      .eq("company_id", company.id)
      .in("status", ["confirmed", "scheduled", "pending"]);
    
    setAppointments(appointmentsData || []);
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    const interval = setInterval(reloadAppointments, 30000);
    return () => clearInterval(interval);
  }, [company?.id, reloadAppointments]);

  const availableTimes = useMemo(() => {
    if (!selectedProfessionalId || !selectedDate) return [];

    const service = services.find(s => s.id === selectedServiceId);
    const duration = service?.duration || 30;
    const times: string[] = [];
    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

    for (const h of hours) {
      for (const m of [0, 30]) {
        const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        if (!hasTimeConflict(timeStr, duration, selectedProfessionalId, format(selectedDate, "yyyy-MM-dd"))) {
          times.push(timeStr);
        }
      }
    }

    return times;
  }, [selectedProfessionalId, selectedDate, selectedServiceId, appointments, services]);

  const isFormValid = useMemo(() => validateAppointment({
    fullName,
    whatsapp,
    email,
    selectedServiceId,
    selectedProfessionalId,
    selectedDate,
    selectedTime,
    selectedPaymentMethod
  }), [fullName, whatsapp, email, selectedServiceId, selectedProfessionalId, selectedDate, selectedTime, selectedPaymentMethod]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Por favor, preencha todos os campos obrigatórios corretamente.");
      return;
    }

    setSubmitting(true);
    try {
      const newAppointment: Appointment = {
        company_id: company!.id,
        service_id: selectedServiceId!,
        professional_id: selectedProfessionalId!,
        fullName,
        appointment_date: format(selectedDate!, "yyyy-MM-dd"),
        appointment_time: selectedTime!,
        notes,
        status: "pending",
        payment_method: selectedPaymentMethod,
      };

      const { error } = await supabase.from("appointments").insert([newAppointment]);
      if (error) toast.error("Erro ao agendar serviço");
      else toast.success("Serviço agendado com sucesso!");
    } catch {
      toast.error("Erro inesperado ao agendar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!company) return <div>Empresa não encontrada</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendar Serviço - {company.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="service">Serviço</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="professional">Profissional</Label>
            <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione a data"}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="time">Horário</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <PaymentSection
            paymentMethod={selectedPaymentMethod}
            setPaymentMethod={setSelectedPaymentMethod}
            pixProof={pixProof}
            setPixProof={setPixProof}
            pixProofUrl={pixProofUrl}
            setPixProofUrl={setPixProofUrl}
            companySettings={companySettings}
          />

          <Checkbox checked={saveForFuture} onCheckedChange={setSaveForFuture}>
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
