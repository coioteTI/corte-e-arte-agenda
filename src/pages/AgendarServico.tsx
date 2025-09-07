// AgendarServico.tsx
import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  phone: string | null;
  email: string | null;
  is_available: boolean;
};

type Appointment = {
  id?: string;
  company_id: string;
  service_id: string;
  professional_id: string;
  client_id?: string | null;
  appointment_date: string;
  appointment_time: string;
  notes?: string | null;
  status: string;
  total_price?: number | null;
  payment_method?: string | null;
};

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
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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
    if (slug) {
      fetchCompanyData();
    }
  }, [slug]);

  async function fetchCompanyData() {
    try {
      setLoading(true);

      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", `%${slug?.replace("-", " ")}%`);

      if (companyError) throw companyError;
      if (!companies || companies.length === 0) {
        toast.error("Empresa não encontrada");
        return;
      }

      const companyData = companies[0];
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
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  }

  const filteredProfessionals = professionals.filter((p) => {
    if (!selectedServiceId) return p.is_available;
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return p.is_available;
    // Se o serviço não tem profissional específico, mostra todos disponíveis
    if (!service.professional_responsible) return p.is_available;
    return service.professional_responsible === p.name && p.is_available;
  });

  const availableTimes = () => {
    if (!selectedProfessionalId || !selectedDate || !company) return [];
    
    const businessHours = company.business_hours;
    if (!businessHours) return [];

    const date = new Date(selectedDate + "T00:00:00");
    const weekday = date.getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[weekday];

    const daySchedule = businessHours[dayName];
    if (!daySchedule || !daySchedule.isOpen) return [];

    const times: string[] = [];
    const start = daySchedule.start;
    const end = daySchedule.end;

    let currentTime = start;
    while (currentTime < end) {
      const hasAppointment = appointments.some(
        (apt) =>
          apt.professional_id === selectedProfessionalId &&
          apt.appointment_date === selectedDate &&
          apt.appointment_time === currentTime
      );

      if (!hasAppointment) {
        times.push(currentTime);
      }

      const [hours, minutes] = currentTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + 30; // Incrementa 30 minutos
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
    }

    return times;
  };

  useEffect(() => {
    setSelectedProfessionalId(undefined);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
  }, [selectedServiceId]);

  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedTime(undefined);
  }, [selectedProfessionalId]);

  function validate() {
    if (!fullName.trim()) return "Preencha o nome completo.";
    if (!whatsapp.trim()) return "Preencha o WhatsApp.";
    if (!selectedServiceId) return "Selecione um serviço.";
    if (!selectedProfessionalId) return "Selecione um profissional.";
    if (!selectedDate) return "Selecione uma data.";
    if (!selectedTime) return "Selecione um horário.";
    return null;
  }

  async function handleConfirm(e?: React.FormEvent) {
    e?.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    if (!company) return toast.error("Dados da empresa não encontrados");

    setSubmitting(true);
    try {
      const selectedService = services.find((s) => s.id === selectedServiceId);

      // Primeiro criar/buscar o cliente
      let clientId: string | undefined;
      
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", whatsapp)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: fullName,
            phone: whatsapp,
            email: email || null,
          })
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Criar o agendamento
      const appointmentData = {
        company_id: company.id,
        service_id: selectedServiceId!,
        professional_id: selectedProfessionalId!,
        client_id: clientId,
        appointment_date: selectedDate!,
        appointment_time: selectedTime!,
        notes: notes || null,
        status: "pending",
        total_price: selectedService?.price || 0,
        payment_method: "pending",
      };

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert([appointmentData]);

      if (appointmentError) throw appointmentError;

      // Salvar dados para futuro se solicitado
      if (saveForFuture) {
        localStorage.setItem("agendamento_form_v1", JSON.stringify({ fullName, whatsapp, email }));
      } else {
        localStorage.removeItem("agendamento_form_v1");
      }

      toast.success(`🎉 Obrigado, ${fullName}! Seu agendamento foi realizado com sucesso.`);

      // Limpar formulário
      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes("");

      // Recarregar dados para refletir novo agendamento
      await fetchCompanyData();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao confirmar agendamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const phoneDigits = (company?.phone || "").replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}`
    : undefined;

  const igHandle = (company?.instagram || "").trim();
  const instagramUrl = igHandle
    ? igHandle.startsWith("http")
      ? igHandle
      : `https://instagram.com/${igHandle.replace(/^@/, "")}`
    : undefined;

  const emailUrl = company?.email ? `mailto:${company.email}` : undefined;
  const mapsQuery = encodeURIComponent(
    [company?.address, company?.number, company?.neighborhood, company?.city, company?.state, company?.zip_code]
      .filter(Boolean)
      .join(", ")
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-center">
        <p className="text-muted-foreground">Empresa não encontrada</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Voltar */}
      <div className="mb-4">
        <Button size="sm" className="mb-2" onClick={() => window.history.back()}>
          🔙 Voltar
        </Button>
      </div>

      {/* Header card */}
      <Card className="mb-4 bg-card border-border">
        <CardHeader className="flex flex-col items-center gap-3">
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt={`Logo da ${company.name}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
            />
          )}
          <CardTitle className="text-center text-foreground">Agendar em {company.name}</CardTitle>
        </CardHeader>

        <CardContent>
          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href={whatsappUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--wa hover:scale-105"
              style={{ backgroundColor: "#25D366" }}
            >
              📱 WhatsApp
            </a>
            <a
              href={instagramUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--ig hover:scale-105"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #F58529, #FEDA77, #DD2A7B, #8134AF, #515BD4)",
              }}
            >
              📸 Instagram
            </a>
            <a
              href={emailUrl || "#"}
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--mail hover:scale-105"
              style={{ backgroundColor: "#4285F4" }}
            >
              ✉️ E-mail
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--maps hover:scale-105"
              style={{ backgroundColor: "#EA4335" }}
            >
              📍 Localização
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleConfirm}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Dados do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <Label className="text-foreground">Nome completo *</Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-foreground">WhatsApp *</Label>
                <Input
                  placeholder="+55 11 9xxxx-xxxx"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-foreground">E-mail (opcional)</Label>
                <Input
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <Label className="text-foreground">Escolha o Serviço *</Label>
            <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum serviço disponível
                  </SelectItem>
                ) : (
                  services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - R$ {s.price} ({s.duration}min)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Label className="text-foreground mt-4">Profissional *</Label>
            <Select value={selectedProfessionalId} onValueChange={(v) => setSelectedProfessionalId(v || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {filteredProfessionals.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {selectedServiceId ? "Nenhum profissional disponível para este serviço" : "Selecione um serviço primeiro"}
                  </SelectItem>
                ) : (
                  filteredProfessionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.specialty && `- ${p.specialty}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={selectedDate ?? ""}
                  onChange={(e) => setSelectedDate(e.target.value || undefined)}
                  disabled={!selectedProfessionalId}
                />
              </div>
              <div>
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={(v) => setSelectedTime(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProfessionalId && selectedDate ? (
                      availableTimes().length ? (
                        availableTimes().map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Sem horários disponíveis nesta data
                        </SelectItem>
                      )
                    ) : (
                      <SelectItem value="none" disabled>
                        Selecione profissional e data primeiro
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label className="mt-4">Observações</Label>
            <Textarea
              placeholder="Preferências ou observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center gap-2 mt-4">
              <Checkbox checked={saveForFuture} onCheckedChange={(v) => setSaveForFuture(Boolean(v))} />
              <span className="text-sm text-foreground">Salvar informações para futuros agendamentos</span>
            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Confirmando..." : "Confirmar Agendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Glow suave */}
      <style>{`
        .neo { transition: transform .2s ease, box-shadow .3s ease, filter .3s ease; }
        .neo--wa:hover   { box-shadow: 0 0 18px rgba(37,211,102,.45); }
        .neo--ig:hover   { box-shadow: 0 0 18px rgba(221,42,123,.45); }
        .neo--mail:hover { box-shadow: 0 0 18px rgba(66,133,244,.45); }
        .neo--maps:hover { box-shadow: 0 0 18px rgba(234,67,53,.45); }
      `}</style>
    </div>
  );
}
