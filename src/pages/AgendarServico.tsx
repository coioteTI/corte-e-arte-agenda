// AgendarServico.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, User, Mail, ArrowLeft, MessageSquare, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Explicit type definitions to prevent TypeScript infinite recursion
interface Company {
  id: string;
  name: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  [key: string]: any;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  [key: string]: any;
}

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  [key: string]: any;
}

// ------- utils -------
const BLOCKING_STATUSES = ["scheduled", "confirmed", "in_progress", "pending"] as const;
const toHHMM = (t: string) => (t?.length >= 5 ? t.slice(0, 5) : t || "");
const toSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Load/Save client data
const loadSavedClientData = () => {
  try {
    const saved = localStorage.getItem("clientData");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveClientData = async (data: any, userId?: string) => {
  try {
    localStorage.setItem("clientData", JSON.stringify(data));
    if (userId) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingClient) {
        await supabase
          .from("clients")
          .update({ name: data.nome, phone: data.telefone, email: data.email })
          .eq("user_id", userId);
      }
    }
  } catch (error) {
    console.error("Erro ao salvar dados do cliente:", error);
  }
};

// Próximos dias disponíveis
const gerarProximosDias = (isDateAvailable?: (date: Date) => boolean) => {
  const dias: { data: string; texto: string }[] = [];
  const hoje = new Date();
  for (let i = 1; i <= 14; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    if (isDateAvailable ? isDateAvailable(data) : data.getDay() !== 0) {
      dias.push({
        data: data.toISOString().split("T")[0],
        texto: data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }),
      });
    }
  }
  return dias;
};

const AgendarServico = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Simple date availability check
  const isDateAvailable = (date: Date) => {
    // Skip Sundays by default
    return date.getDay() !== 0;
  };

  const getAvailableTimeSlots = (selectedDate: Date, intervalMinutes: number = 30) => {
    const slots: string[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const diasDisponiveis = gerarProximosDias(isDateAvailable);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    servicoId: "",
    professionalId: "",
    data: "",
    horario: "",
    observacoes: "",
  });
  const [saveData, setSaveData] = useState(false);

  // Carrega dados
  useEffect(() => {
    fetchCompanyData();
    loadSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadSavedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientData: any = null;

      if (user) {
        const { data: dbClient } = await supabase
          .from("clients")
          .select("name, phone, email")
          .eq("user_id", user.id)
          .maybeSingle();
        if (dbClient) clientData = dbClient;
      }

      if (!clientData) {
        const saved = loadSavedClientData();
        if (saved) clientData = saved;
      }

      if (clientData) {
        setFormData((prev) => ({
          ...prev,
          nome: clientData.name || clientData.nome || "",
          telefone: clientData.phone || clientData.telefone || "",
          email: clientData.email || clientData.email || "",
        }));
        setSaveData(true);
      }
    } catch (error) {
      console.log("Erro ao carregar dados do cliente", error);
    }
  };

  // Carrega empresa
  const fetchCompanyData = async () => {
    try {
      if (!slug) throw new Error("Slug não informado");

      let foundCompany: Company | null = null;

      // Use hardcoded Supabase values to avoid accessing protected properties
      const SUPABASE_URL = "https://gwyickztdeiplccievyt.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eWlja3p0ZGVpcGxjY2lldnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDExOTYsImV4cCI6MjA2NzIxNzE5Nn0._cyV4DVT3LRVy6yI6ehO9zwgNlr3vsWYQt7-e5K4PyE";

      // Primeira tentativa: buscar por slug
      const response1 = await fetch(`${SUPABASE_URL}/rest/v1/companies?slug=eq.${slug}&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response1.ok) {
        const companies = await response1.json();
        foundCompany = companies[0] || null;
      }

      // Segunda tentativa: buscar por nome convertido para slug
      if (!foundCompany) {
        const response2 = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        
        if (response2.ok) {
          const allCompanies = await response2.json();
          foundCompany = allCompanies.find((c: any) => toSlug(c?.name || "") === String(slug)) || null;
        }
      }

      if (!foundCompany) {
        toast({ title: "Barbearia não encontrada", variant: "destructive" });
        setLoading(false);
        return;
      }

      setCompany(foundCompany);

      // Buscar serviços e profissionais
      const [servicesResponse, professionalsResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/services?company_id=eq.${foundCompany.id}&select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }),
        fetch(`${SUPABASE_URL}/rest/v1/professionals?company_id=eq.${foundCompany.id}&is_available=eq.true&select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        })
      ]);

      const servicesData = servicesResponse.ok ? await servicesResponse.json() : [];
      const professionalsData = professionalsResponse.ok ? await professionalsResponse.json() : [];

      setServices(servicesData);
      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Erro ao carregar dados da barbearia:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Horários disponíveis
  const fetchAvailableSlots = async (professionalId: string, date: string) => {
    try {
      if (!company?.id || !professionalId || !date) {
        setAvailableSlots([]);
        return;
      }

      const selectedDate = new Date(date);
      const allTimeslots = getAvailableTimeSlots(selectedDate, 30);

      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("professional_id", professionalId)
        .eq("appointment_date", date)
        .in("status", BLOCKING_STATUSES as unknown as string[]);

      const occupiedHHMM = (existingAppointments || []).map((apt: any) => toHHMM(apt?.appointment_time));
      setAvailableSlots(allTimeslots.filter((slot) => !occupiedHHMM.includes(toHHMM(slot))));
    } catch (error) {
      console.error("Erro ao carregar horários disponíveis:", error);
      setAvailableSlots([]);
      toast({ title: "Erro ao carregar horários", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (formData.professionalId && formData.data) fetchAvailableSlots(formData.professionalId, formData.data);
    else setAvailableSlots([]);
  }, [formData.professionalId, formData.data, company?.id]);

  const servicoSelecionado = services.find((s) => s.id === formData.servicoId);
  const professionalSelecionado = professionals.find((p) => p.id === formData.professionalId);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const errors: string[] = [];
    if (!formData.nome.trim()) errors.push("Nome é obrigatório");
    if (!formData.telefone.trim()) errors.push("Telefone é obrigatório");
    if (!formData.servicoId) errors.push("Selecione um serviço");
    if (!formData.professionalId) errors.push("Selecione um profissional");
    if (!formData.data) errors.push("Selecione uma data");
    if (!formData.horario) errors.push("Selecione um horário");

    if (errors.length > 0) {
      toast({ title: "Erro na validação", description: errors.join(", "), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (saveData) await saveClientData({ nome: formData.nome, telefone: formData.telefone, email: formData.email }, user?.id);

      let clientId: string | null = null;
      if (user) {
        const { data: existingClient } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();
        if (existingClient) clientId = existingClient.id;
        else {
          const { data: newClient } = await supabase
            .from("clients")
            .insert({ user_id: user.id, name: formData.nome, phone: formData.telefone, email: formData.email })
            .select("id")
            .single();
          clientId = newClient?.id || null;
        }
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({ name: formData.nome, phone: formData.telefone, email: formData.email })
          .select("id")
          .single();
        clientId = newClient?.id || null;
      }

      if (!clientId || !company?.id) throw new Error("Não foi possível identificar cliente ou empresa.");

      const hhmmss = `${toHHMM(formData.horario)}:00`;
      const { data: clash } = await supabase
        .from("appointments")
        .select("id")
        .eq("professional_id", formData.professionalId)
        .eq("appointment_date", formData.data)
        .eq("appointment_time", hhmmss)
        .in("status", BLOCKING_STATUSES as unknown as string[])
        .maybeSingle();

      if (clash) {
        toast({ title: "Horário indisponível", description: "Este horário acabou de ser reservado.", variant: "destructive" });
        await fetchAvailableSlots(formData.professionalId, formData.data);
        setIsLoading(false);
        return;
      }

      const appointmentData = {
        client_id: clientId,
        company_id: company.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data,
        appointment_time: hhmmss,
        total_price: services.find((s) => s.id === formData.servicoId)?.price || null,
        notes: formData.observacoes || null,
        status: "scheduled",
      };

      await supabase.from("appointments").insert(appointmentData);
      toast({ title: "Agendamento Realizado!", description: "Seu agendamento foi confirmado com sucesso." });
      navigate(`/agendamento-confirmado/${slug}`);
    } catch (error: any) {
      toast({ title: "Erro no agendamento", description: error?.message || "Não foi possível realizar o agendamento.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex justify-center items-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl">
          <div className="h-32 bg-muted rounded-2xl"></div>
          <div className="h-96 bg-muted rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Link to={`/barbearia/${slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao perfil da barbearia
        </Link>

        {/* Company Header */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              {company?.name}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {company?.address}, {company?.number} - {company?.neighborhood}
            </p>
            <p className="text-muted-foreground text-sm">
              {company?.city}, {company?.state}
            </p>
          </CardHeader>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Agendar Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Nome *
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange("telefone", e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              {/* Service Selection */}
              <div>
                <Label>Serviço *</Label>
                <Select value={formData.servicoId} onValueChange={(value) => handleInputChange("servicoId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)} ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Professional Selection */}
              <div>
                <Label>Profissional *</Label>
                <Select
                  value={formData.professionalId}
                  onValueChange={(value) => handleInputChange("professionalId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name} {professional.specialty && `- ${professional.specialty}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div>
                <Label>Data *</Label>
                <Select value={formData.data} onValueChange={(value) => handleInputChange("data", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {diasDisponiveis.map((dia) => (
                      <SelectItem key={dia.data} value={dia.data}>
                        {dia.texto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Selection */}
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Horário *
                </Label>
                <Select
                  value={formData.horario}
                  onValueChange={(value) => handleInputChange("horario", value)}
                  disabled={!formData.professionalId || !formData.data}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.professionalId || !formData.data 
                        ? "Selecione profissional e data primeiro" 
                        : availableSlots.length === 0 
                          ? "Nenhum horário disponível" 
                          : "Escolha um horário"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="observacoes" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange("observacoes", e.target.value)}
                  placeholder="Alguma observação especial? (opcional)"
                />
              </div>

              {/* Save Data Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-data"
                  checked={saveData}
                  onCheckedChange={(checked) => setSaveData(checked as boolean)}
                />
                <Label htmlFor="save-data" className="text-sm">
                  Salvar meus dados para futuros agendamentos
                </Label>
              </div>

              {/* Summary */}
              {servicoSelecionado && professionalSelecionado && formData.data && formData.horario && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Resumo do Agendamento:</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Serviço:</strong> {servicoSelecionado.name}</p>
                      <p><strong>Profissional:</strong> {professionalSelecionado.name}</p>
                      <p><strong>Data:</strong> {new Date(formData.data).toLocaleDateString("pt-BR")}</p>
                      <p><strong>Horário:</strong> {formData.horario}</p>
                      <p><strong>Duração:</strong> {servicoSelecionado.duration} minutos</p>
                      <p><strong>Valor:</strong> R$ {servicoSelecionado.price.toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Agendando..." : "Confirmar Agendamento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendarServico;