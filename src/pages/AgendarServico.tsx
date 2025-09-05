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
  instagram: string;
  logo_url: string;
  email: string;
  phone?: string;
};

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  professional_responsible: string;
  is_promotion?: boolean;
  promotional_price?: number;
  promotion_valid_until?: string;
};

type Professional = {
  id: string;
  company_id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  is_available: boolean;
  created_at?: string;
};

type Appointment = {
  id?: string;
  company_id: string;
  service_id: string;
  professional_id: string;
  client_id?: string;
  client_name?: string;
  client_whatsapp?: string;
  client_email?: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
  status: string;
  total_price?: number;
  payment_method?: string;
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

      // Buscar empresa por slug
      const slugToFind = slug?.replace(/-/g, " ");
      console.log("Looking for slug:", slug);
      
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("*");

      if (companyError) throw companyError;

      console.log("Companies found:", companies);

      if (!companies || companies.length === 0) {
        toast.error("Empresa não encontrada");
        return;
      }

      // Encontrar empresa que corresponda ao slug
      const companyData = companies.find(c => 
        c.name?.toLowerCase().replace(/\s+/g, "-") === slug ||
        c.name?.toLowerCase().includes(slugToFind?.toLowerCase() || "")
      );

      if (!companyData) {
        toast.error("Empresa não encontrada");
        return;
      }

      console.log("Comparing", slug, "with", companyData.name?.toLowerCase().replace(/\s+/g, "-"));
      
      setCompany(companyData);

      // Buscar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("company_id", companyData.id);
      
      console.log("Services data:", servicesData);
      console.log("Services error:", servicesError);
      
      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Buscar profissionais
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("professionals")
        .select("*")
        .eq("company_id", companyData.id);
      
      console.log("Professionals data:", professionalsData);
      console.log("Professionals error:", professionalsError);
      
      if (professionalsError) throw professionalsError;
      
      // Se não há profissionais cadastrados, criar um profissional padrão baseado nos serviços
      let professionalsToSet = professionalsData || [];
      if (professionalsToSet.length === 0 && servicesData && servicesData.length > 0) {
        // Criar profissionais padrão baseados nos responsáveis pelos serviços
        const uniqueProfessionals = [...new Set(servicesData.map(s => s.professional_responsible).filter(Boolean))];
        professionalsToSet = uniqueProfessionals.map((name, index) => ({
          id: `default-${index}`,
          company_id: companyData.id,
          name: name,
          specialty: "",
          phone: "",
          email: "",
          is_available: true,
          created_at: new Date().toISOString()
        }));
      }
      
      setProfessionals(professionalsToSet);

      // Buscar agendamentos confirmados
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("company_id", companyData.id)
        .in("status", ["confirmed", "scheduled", "pending"]);
      
      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  }

  const filteredProfessionals = professionals.filter((p) => {
    if (!selectedServiceId) return professionals.length > 0 ? professionals : [];
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service?.professional_responsible) return professionals;
    return service.professional_responsible === p.name;
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
      const totalMinutes = hours * 60 + minutes + 30;
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
    if (err) {
      toast.error(err);
      return;
    }

    if (!company) {
      toast.error("Dados da empresa não encontrados");
      return;
    }

    setSubmitting(true);
    try {
      const selectedService = services.find((s) => s.id === selectedServiceId);

      // Criar cliente se não existir
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .upsert({
          name: fullName,
          phone: whatsapp,
          email: email || null
        }, {
          onConflict: 'phone'
        })
        .select()
        .single();

      if (clientError) {
        console.error("Erro ao criar/atualizar cliente:", clientError);
        // Continue sem client_id se houver erro
      }

      const appointmentData: any = {
        company_id: company.id,
        service_id: selectedServiceId!,
        professional_id: selectedProfessionalId!,
        client_id: clientData?.id || null,
        client_name: fullName,
        client_whatsapp: whatsapp,
        client_email: email || null,
        appointment_date: selectedDate!,
        appointment_time: selectedTime!,
        notes: notes || null,
        status: "pending",
        total_price: selectedService?.price || 0,
        payment_method: "pending",
      };

      const { error } = await supabase.from("appointments").insert([appointmentData]);
      if (error) throw error;

      if (saveForFuture) {
        localStorage.setItem("agendamento_form_v1", JSON.stringify({ fullName, whatsapp, email }));
      } else {
        localStorage.removeItem("agendamento_form_v1");
      }

      toast.success(`🎉 Obrigado, ${fullName}! Seu agendamento foi realizado com sucesso.`);

      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes("");

      await fetchCompanyData();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao confirmar agendamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function todayIso() {
    const t = new Date();
    return t.toISOString().split("T")[0];
  }

  // ===== Links dinâmicos dos botões (WhatsApp, Instagram, Email, Maps) =====
  const phoneDigits = (company?.phone || "").replace(/\D/g, "");
  const whatsappUrl =
    phoneDigits ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}` : undefined;

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
        <div className="text-center">
          <div className="animate-pulse">Carregando...</div>
        </div>
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
          {/* Logo da empresa */}
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt={`Logo da ${company.name}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
            />
          )}
          <CardTitle className="text-center text-foreground">Agendar em {company.name}</CardTitle>
        </CardHeader>

      </Card>

      {/* Horários de Funcionamento */}
      {company.business_hours && (
        <Card className="mb-4 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              🕒 Horários de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(company.business_hours).map(([day, hours]: [string, any]) => {
                const dayNames: { [key: string]: string } = {
                  monday: "Segunda-feira",
                  tuesday: "Terça-feira", 
                  wednesday: "Quarta-feira",
                  thursday: "Quinta-feira",
                  friday: "Sexta-feira",
                  saturday: "Sábado",
                  sunday: "Domingo"
                };
                
                return (
                  <div key={day} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                    <span className="font-medium text-foreground">{dayNames[day]}</span>
                    <span className="text-sm text-muted-foreground">
                      {hours.isOpen ? `${hours.start} - ${hours.end}` : "Fechado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Serviços e Preços */}
      <Card className="mb-4 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            💇‍♂️ Serviços e Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {services.map((service) => (
              <div key={service.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <h4 className="font-semibold text-foreground">{service.name}</h4>
                  {service.description && (
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{service.duration} min</p>
                </div>
                <div className="text-right">
                  {service.is_promotion ? (
                    <div>
                      <span className="text-sm line-through text-muted-foreground">R$ {service.price}</span>
                      <span className="ml-2 text-lg font-bold text-primary">R$ {service.promotional_price}</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-primary">R$ {service.price}</span>
                  )}
                </div>
              </div>
            ))}
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
            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-foreground">Seus Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">Nome completo *</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground">WhatsApp *</Label>
                  <Input
                    placeholder="+55 11 9xxxx-xxxx"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground">E-mail (opcional)</Label>
                  <Input
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </div>

            <hr className="my-4 border-border" />

            {/* Serviço */}
            <div className="mb-4">
              <Label className="text-foreground">Escolha o Serviço *</Label>
              <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v || undefined)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {services.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhum serviço disponível
                    </SelectItem>
                  )}
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-foreground">
                      {s.name} - R$ {s.price} ({s.duration}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profissional */}
            <div className="mb-4">
              <Label className="text-foreground">Profissional *</Label>
              <Select value={selectedProfessionalId} onValueChange={(v) => setSelectedProfessionalId(v || undefined)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {filteredProfessionals.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhum profissional disponível
                    </SelectItem>
                  )}
                  {filteredProfessionals.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-foreground">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <Label className="text-foreground">Data *</Label>
                <Input
                  type="date"
                  min={todayIso()}
                  value={selectedDate ?? ""}
                  onChange={(e) => setSelectedDate(e.target.value || undefined)}
                  className="bg-background border-border text-foreground"
                  disabled={!selectedProfessionalId}
                />
                {!selectedProfessionalId && (
                  <p className="text-xs text-muted-foreground mt-1">Selecione um profissional primeiro</p>
                )}
              </div>
              <div>
                <Label className="text-foreground">Horário *</Label>
                <Select value={selectedTime} onValueChange={(v) => setSelectedTime(v || undefined)}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione horário" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {selectedProfessionalId && selectedDate ? (
                      availableTimes().length ? (
                        availableTimes().map((t) => (
                          <SelectItem key={t} value={t} className="text-foreground">
                            {t}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Sem horários disponíveis
                        </SelectItem>
                      )
                    ) : (
                      <SelectItem value="none" disabled>
                        Selecione profissional e data
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="mb-4">
              <Label className="text-foreground">Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Preferência de estilo, alguma observação especial..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Salvar info */}
            <div className="flex items-center gap-2 mb-4">
              <Checkbox checked={saveForFuture} onCheckedChange={(v) => setSaveForFuture(Boolean(v))} />
              <span className="text-sm text-foreground">Salvar minhas informações para agendamentos futuros</span>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {submitting ? "Confirmando..." : "Agendar Agora"}
              </Button>
            </div>

            <div className="text-xs mt-4 p-3 bg-muted rounded text-muted-foreground">
              Importante: Este é um pré-agendamento. A barbearia entrará em contato via WhatsApp para confirmar a disponibilidade do horário solicitado.
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
