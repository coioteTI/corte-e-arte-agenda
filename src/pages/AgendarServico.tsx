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
import { useBusinessHours } from "@/hooks/useBusinessHours";
import logo from "@/assets/logo.png";

// ------- utils -------
const BLOCKING_STATUSES = ["scheduled", "confirmed", "in_progress", "pending"] as const;
const toHHMM = (t: string) => (t?.length >= 5 ? t.slice(0, 5) : t || "");

// normaliza "Barbearía São João" -> "barbearia-sao-joao"
const toSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Load saved client data from localStorage
const loadSavedClientData = () => {
  try {
    const saved = localStorage.getItem("clientData");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save client data to localStorage (e opcionalmente no banco)
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
          .update({
            name: data.nome,
            phone: data.telefone,
            email: data.email,
          })
          .eq("user_id", userId);
      }
    }
  } catch (error) {
    console.error("Erro ao salvar dados do cliente:", error);
  }
};

// Gera próximos dias disponíveis
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

  const [company, setCompany] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { isDateAvailable, getAvailableTimeSlotsForDate } = useBusinessHours(company?.id || "");
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

  // --------- EMPRESA (endereço correto e matching robusto por slug) ----------
  const fetchCompanyData = async () => {
    try {
      if (!slug) throw new Error("Slug não informado");

      // 1) tenta por coluna slug (ideal)
      const { data: bySlug, error: slugErr } = await supabase
        .from("companies")
        .select(
          "id, slug, name, phone, instagram, email, address, number, neighborhood, city, state, zip_code, primary_color, business_hours"
        )
        .eq("slug", slug)
        .maybeSingle();

      if (slugErr) throw slugErr;

      let foundCompany = bySlug;

      // 2) fallback: busca todos e casa por nome normalizado (sem acentos), NUNCA pega o primeiro aleatório
      if (!foundCompany) {
        const { data: allCompanies, error: allErr } = await supabase
          .from("companies")
          .select(
            "id, slug, name, phone, instagram, email, address, number, neighborhood, city, state, zip_code, primary_color, business_hours"
          );
        if (allErr) throw allErr;

        foundCompany = allCompanies?.find((c: any) => toSlug(c?.name || "") === String(slug)) || null;
      }

      if (!foundCompany) {
        toast({
          title: "Barbearia não encontrada",
          description: "Não foi possível localizar a barbearia para este endereço.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setCompany(foundCompany);

      // carrega serviços e profissionais
      const [{ data: servicesData }, { data: professionalsData }] = await Promise.all([
        supabase.from("services").select("*").eq("company_id", foundCompany.id),
        supabase.from("professionals").select("*").eq("company_id", foundCompany.id).eq("is_available", true),
      ]);

      setServices(servicesData || []);
      setProfessionals(professionalsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados da barbearia:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da barbearia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --------- HORÁRIOS (normalização HH:MM e anti-duplicidade) ----------
  const fetchAvailableSlots = async (professionalId: string, date: string) => {
    try {
      if (!company?.id || !professionalId || !date) {
        setAvailableSlots([]);
        return;
      }

      const selectedDate = new Date(date);
      let allTimeslots: string[] = [];

      if (getAvailableTimeSlotsForDate) {
        allTimeslots = getAvailableTimeSlotsForDate(selectedDate, 30) || [];
      } else {
        // fallback padrão
        for (let hour = 8; hour < 18; hour++) {
          allTimeslots.push(`${hour.toString().padStart(2, "0")}:00`);
          allTimeslots.push(`${hour.toString().padStart(2, "0")}:30`);
        }
      }

      // consulta horários já ocupados
      const { data: existingAppointments, error } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("professional_id", professionalId)
        .eq("appointment_date", date)
        .in("status", BLOCKING_STATUSES as unknown as string[]);

      if (error) {
        console.error("Erro ao buscar agendamentos existentes:", error);
      }

      // appointment_time (Postgres time) geralmente vem como HH:MM:SS -> normalizar pra HH:MM
      const occupiedHHMM = (existingAppointments || []).map((apt: any) => toHHMM(apt?.appointment_time));

      // remove os slots ocupados
      const free = allTimeslots.filter((slot) => !occupiedHHMM.includes(toHHMM(slot)));

      setAvailableSlots(free);
    } catch (error) {
      console.error("Erro ao carregar horários disponíveis:", error);
      setAvailableSlots([]);
      toast({
        title: "Erro ao carregar horários",
        description: "Não foi possível carregar os horários disponíveis.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (formData.professionalId && formData.data) {
      fetchAvailableSlots(formData.professionalId, formData.data);
    } else {
      setAvailableSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.professionalId, formData.data, company?.id]);

  const servicoSelecionado = services.find((s) => s.id === formData.servicoId);
  const professionalSelecionado = professionals.find((p) => p.id === formData.professionalId);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --------- SUBMIT (check anti-race e normalização de horário) ----------
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

    if (
      formData.telefone &&
      !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone) &&
      !/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ""))
    ) {
      errors.push("Formato de telefone inválido");
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Email inválido");
    }

    const selectedDate = new Date(formData.data);
    if (!isDateAvailable || !isDateAvailable(selectedDate)) {
      errors.push("Data selecionada não está disponível");
    }
    if (getAvailableTimeSlotsForDate && formData.data) {
      const slots = getAvailableTimeSlotsForDate(selectedDate, 30) || [];
      if (!slots.includes(formData.horario)) errors.push("Horário selecionado não está disponível");
    }

    if (errors.length > 0) {
      toast({
        title: "Erro na validação",
        description: errors.join(", "),
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (saveData) {
        await saveClientData(
          {
            nome: formData.nome,
            telefone: formData.telefone,
            email: formData.email,
          },
          user?.id
        );
      }

      // cria/pega cliente
      let clientId: string | null = null;
      if (user) {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient } = await supabase
            .from("clients")
            .insert({
              user_id: user.id,
              name: formData.nome,
              phone: formData.telefone,
              email: formData.email,
            })
            .select("id")
            .single();
          clientId = newClient?.id || null;
        }
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            name: formData.nome,
            phone: formData.telefone,
            email: formData.email,
          })
          .select("id")
          .single();
        clientId = newClient?.id || null;
      }

      if (!clientId || !company?.id) throw new Error("Não foi possível identificar cliente ou empresa.");

      // --- CHECAGEM FINAL ANTES DE INSERIR (evita corrida) ---
      const hhmmss = `${toHHMM(formData.horario)}:00`; // normaliza para HH:MM:SS
      const { data: clash } = await supabase
        .from("appointments")
        .select("id")
        .eq("professional_id", formData.professionalId)
        .eq("appointment_date", formData.data)
        .eq("appointment_time", hhmmss)
        .in("status", BLOCKING_STATUSES as unknown as string[])
        .maybeSingle();

      if (clash) {
        toast({
          title: "Horário indisponível",
          description: "Este horário acabou de ser reservado. Por favor, escolha outro.",
          variant: "destructive",
        });
        // atualiza lista para refletir o bloqueio
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
        appointment_time: hhmmss, // sempre HH:MM:SS
        total_price: services.find((s) => s.id === formData.servicoId)?.price
          ? Number(services.find((s) => s.id === formData.servicoId)!.price)
          : null,
        notes: formData.observacoes || null,
        status: "scheduled",
      };

      const { error: appointmentError } = await supabase.from("appointments").insert(appointmentData);
      if (appointmentError) throw appointmentError;

      toast({
        title: "Agendamento Realizado!",
        description: "Seu agendamento foi confirmado com sucesso.",
      });

      navigate(`/agendamento-confirmado/${slug}`);
    } catch (error: any) {
      toast({
        title: "Erro no agendamento",
        description: error?.message || "Não foi possível realizar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------- UI (layout que você enviou, intacto) -----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-6"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Link
            to={`/barbearia/${slug}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao perfil da barbearia
          </Link>
        </div>

        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{company?.name?.charAt(0) || "B"}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">
                  Agendar em {company?.name || "Barbearia"}
                </h1>
                <p className="text-muted-foreground">Preencha os dados para confirmar seu agendamento</p>

                {/* Informações da Barbearia */}
                <div className="mt-3 space-y-2">
                  {company && (company.address || company.city || company.state) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {
                        [
                          [company.address, company.number].filter(Boolean).join(", "),
                          company.neighborhood,
                          [company.city, company.state].filter(Boolean).join(" - "),
                          company.zip_code?.toString().trim() ? `CEP ${company.zip_code}` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                      }
                    </div>
                  )}

                  {/* Botões de Contato */}
                  <div className="flex gap-2 mt-3">
                    {company?.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const numero = company.phone.replace(/\D/g, "");
                          const whatsappUrl = `https://wa.me/55${numero}`;
                          window.open(whatsappUrl, "_blank");
                        }}
                        className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    )}

                    {company?.instagram && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`https://instagram.com/${String(company.instagram).replace("@", "")}`, "_blank");
                        }}
                        className="flex items-center gap-1 text-pink-600 border-pink-600 hover:bg-pink-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Instagram
                      </Button>
                    )}
                  </div>

                  {company?.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Mail className="h-4 w-4" />
                      {company.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horários de Funcionamento */}
        {company?.business_hours && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(company.business_hours).map(([day, hours]: [string, any]) => {
                  const dayNames: Record<string, string> = {
                    monday: "Segunda-feira",
                    tuesday: "Terça-feira",
                    wednesday: "Quarta-feira",
                    thursday: "Quinta-feira",
                    friday: "Sexta-feira",
                    saturday: "Sábado",
                    sunday: "Domingo",
                  };
                  return (
                    <div key={day} className="flex justify-between items-center py-1">
                      <span className="text-sm font-medium">{dayNames[day]}</span>
                      <span className="text-sm text-muted-foreground">
                        {hours?.isOpen ? `${hours.start} - ${hours.end}` : "Fechado"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dados do Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Seus Dados
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome completo"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">WhatsApp *</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange("telefone", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Serviço */}
              <div className="space-y-4">
                <h3 className="font-medium">Escolha o Serviço</h3>

                {services.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Esta barbearia ainda não cadastrou serviços disponíveis.</strong>
                      <br />
                      Entre em contato diretamente para agendar seu atendimento.
                    </p>
                    {company?.phone && (
                      <p className="text-sm text-yellow-800 mt-2">📞 Telefone: {company.phone}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Serviço *</Label>
                      <Select
                        value={formData.servicoId}
                        onValueChange={(value) => {
                          handleInputChange("servicoId", value);
                          const selectedService = services.find((s) => s.id === value);
                          if (selectedService?.professional_responsible) {
                            const matchingProfessional = professionals.find(
                              (p) => p.name === selectedService.professional_responsible
                            );
                            if (matchingProfessional) {
                              handleInputChange("professionalId", matchingProfessional.id);
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((servico) => (
                            <SelectItem key={servico.id} value={servico.id}>
                              {servico.name} - R$ {Number(servico.price).toFixed(2)} ({servico.duration} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {servicoSelecionado && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                          <strong>{servicoSelecionado.name}</strong>
                          <br />
                          Duração: {servicoSelecionado.duration} minutos
                          <br />
                          Valor: R$ {Number(servicoSelecionado.price).toFixed(2)}
                          {servicoSelecionado.professional_responsible && (
                            <>
                              <br />
                              Profissional responsável: {servicoSelecionado.professional_responsible}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Profissional */}
              <div className="space-y-4">
                <h3 className="font-medium">Quem você quer que realize o serviço?</h3>

                {professionals.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Esta barbearia ainda não cadastrou profissionais disponíveis.</strong>
                      <br />
                      Entre em contato diretamente para agendar seu atendimento.
                    </p>
                    {company?.phone && (
                      <p className="text-sm text-yellow-800 mt-2">📞 Telefone: {company.phone}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Profissional *</Label>
                      <Select
                        value={formData.professionalId}
                        onValueChange={(value) => handleInputChange("professionalId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          {professionals.map((professional) => (
                            <SelectItem key={professional.id} value={professional.id}>
                              {professional.name}
                              {professional.specialty && ` - ${professional.specialty}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {professionalSelecionado && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                          <strong>{professionalSelecionado.name}</strong>
                          {professionalSelecionado.specialty && (
                            <>
                              <br />
                              Especialidade: {professionalSelecionado.specialty}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Data e Horário */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data e Horário
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Select value={formData.data} onValueChange={(value) => handleInputChange("data", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma data" />
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

                  <div className="space-y-2">
                    <Label>Horário *</Label>
                    <Select
                      value={formData.horario}
                      onValueChange={(value) => handleInputChange("horario", value)}
                      disabled={!formData.professionalId || !formData.data}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !formData.professionalId || !formData.data
                              ? "Selecione profissional e data primeiro"
                              : availableSlots.length === 0
                              ? "Nenhum horário disponível"
                              : "Selecione um horário"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((horario) => (
                          <SelectItem key={horario} value={horario} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {horario}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Legenda de cores */}
                    {formData.professionalId && formData.data && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Disponível
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Ocupado
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {formData.professionalId && formData.data && availableSlots.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Não há horários disponíveis para esta data. Tente outra data ou profissional.
                    </p>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observações (opcional)
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Alguma observação especial?</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Ex: Preferência de estilo, alguma observação especial..."
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange("observacoes", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Salvar Dados */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="saveData"
                    checked={saveData}
                    onCheckedChange={(checked) => setSaveData(checked === true)}
                  />
                  <Label htmlFor="saveData" className="text-sm cursor-pointer">
                    Salvar minhas informações para agendamentos futuros
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seus dados serão salvos localmente para facilitar próximos agendamentos.
                </p>
              </div>

              {/* Botão de Confirmação */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Enviando agendamento..." : "Confirmar Agendamento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Importante:</strong> Este é um pré-agendamento. A barbearia entrará em contato via WhatsApp
              para confirmar a disponibilidade do horário solicitado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendarServico;
