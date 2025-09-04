// AgendarServico.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import logo from "@/assets/logo.png";

// Helpers
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
          .update({
            name: data.nome,
            phone: data.telefone,
            email: data.email,
          })
          .eq("user_id", userId);
      }
    }
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
  }
};

const gerarProximosDias = (isDateAvailable?: (date: Date) => boolean) => {
  const dias = [];
  const hoje = new Date();

  for (let i = 1; i <= 14; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);

    if (isDateAvailable ? isDateAvailable(data) : data.getDay() !== 0) {
      dias.push({
        data: data.toISOString().split("T")[0],
        texto: data.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        }),
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
  const [likes, setLikes] = useState<number>(0);

  const { isDateAvailable, getAvailableTimeSlotsForDate } = useBusinessHours(company?.id || "");
  const diasDisponiveis = company ? gerarProximosDias(isDateAvailable) : [];

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
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    fetchCompanyData();
    loadSavedData();
  }, [slug]);

  const loadSavedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientData = null;

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
      console.error("Erro ao carregar dados cliente", error);
    }
  };

  const fetchCompanyData = async () => {
    try {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, phone, email, address, number, neighborhood, city, state, primary_color, business_hours, likes_count")
        .limit(10);

      if (error) throw error;

      const foundCompany =
        companies?.find((c) => c.name.toLowerCase().replace(/\s+/g, "-") === slug) ||
        companies?.[0];

      if (foundCompany) {
        setCompany(foundCompany);
        setLikes(foundCompany.likes_count || 0);

        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("company_id", foundCompany.id);
        setServices(servicesData || []);

        const { data: professionalsData } = await supabase
          .from("professionals")
          .select("*")
          .eq("company_id", foundCompany.id)
          .eq("is_available", true);
        setProfessionals(professionalsData || []);
      }
    } catch (error) {
      console.error("Erro carregar empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da barbearia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (professionalId: string, date: string) => {
    try {
      if (!company?.id || !professionalId || !date) return setAvailableSlots([]);
      const selectedDate = new Date(date);
      let allTimeslots: string[] = [];

      if (getAvailableTimeSlotsForDate) {
        allTimeslots = getAvailableTimeSlotsForDate(selectedDate, 30);
      }

      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("professional_id", professionalId)
        .eq("appointment_date", date)
        .in("status", ["scheduled", "confirmed", "in_progress"]);

      const occupied = existingAppointments?.map((apt) =>
        String(apt.appointment_time).substring(0, 5)
      ) || [];

      setAvailableSlots(allTimeslots.filter((slot) => !occupied.includes(slot)));
    } catch (error) {
      console.error("Erro slots:", error);
      setAvailableSlots([]);
    }
  };

  useEffect(() => {
    if (formData.professionalId && formData.data) {
      fetchAvailableSlots(formData.professionalId, formData.data);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.professionalId, formData.data]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || "" }));
  };

  const handleLike = async () => {
    if (!company?.id) return;
    try {
      const { data, error } = await supabase
        .from("companies")
        .update({ likes_count: likes + 1 })
        .eq("id", company.id)
        .select("likes_count")
        .single();

      if (!error && data) setLikes(data.likes_count || 0);
    } catch (error) {
      console.error("Erro curtida:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.servicoId || !formData.professionalId || !formData.data || !formData.horario) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error: insertError } = await supabase.from("appointments").insert({
        company_id: company.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data,
        appointment_time: formData.horario + ":00",
        notes: formData.observacoes || null,
        status: "scheduled",
      });

      if (insertError) throw insertError;

      toast({ title: "Sucesso", description: "Agendamento confirmado!" });
      navigate(`/agendamento-confirmado/${slug}`);
    } catch (error: any) {
      console.error("Erro no agendamento:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível realizar o agendamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-96">
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-48 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  // ---- Layout (igual sua imagem, só com proteções extras) ----
  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Card Empresa */}
        {company && (
          <Card>
            <CardHeader className="text-center">
              <img src={logo} alt="Logo" className="w-16 h-16 rounded-full mx-auto mb-2" />
              <CardTitle>{company.name}</CardTitle>
              {company.address && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin size={14} /> {company.address}
                  {company.number && `, ${company.number}`}
                  {company.neighborhood && `, ${company.neighborhood}`}
                  , {company.city} - {company.state}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <Button size="sm" onClick={handleLike}>
                  <Heart className="mr-1" size={16} /> Curtir ({likes})
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Card Horários */}
        {company?.business_hours && (
          <Card>
            <CardHeader>
              <CardTitle>Horários de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(company.business_hours || {}).map(([day, hours]: any) => (
                  <div key={day} className="flex justify-between border-b py-1">
                    <span className="capitalize">{day}</span>
                    <span>{hours?.open && hours?.close ? `${hours.open} - ${hours.close}` : "Fechado"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome e Telefone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={formData.nome} onChange={(e) => handleInputChange("nome", e.target.value)} required />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={formData.telefone} onChange={(e) => handleInputChange("telefone", e.target.value)} placeholder="(11) 90000-0000" required />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label>Email (opcional)</Label>
                <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
              </div>

              {/* Serviço */}
              <div>
                <Label>Escolha o Serviço</Label>
                <Select value={formData.servicoId} onValueChange={(v) => handleInputChange("servicoId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length === 0 ? (
                      <SelectItem value="no-service" disabled>Nenhum serviço disponível</SelectItem>
                    ) : (
                      services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} - R${s.price}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional */}
              <div>
                <Label>Quem você quer que realize o serviço?</Label>
                {professionals.length === 0 ? (
                  <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded-md">
                    Esta barbearia não possui profissionais disponíveis no momento.
                  </div>
                ) : (
                  <Select value={formData.professionalId} onValueChange={(v) => handleInputChange("professionalId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Select value={formData.data} onValueChange={(v) => handleInputChange("data", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma data" />
                    </SelectTrigger>
                    <SelectContent>
                      {diasDisponiveis.length === 0 ? (
                        <SelectItem value="no-date" disabled>Nenhuma data disponível</SelectItem>
                      ) : (
                        diasDisponiveis.map((d) => (
                          <SelectItem key={d.data} value={d.data}>{d.texto}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário</Label>
                  <Select value={formData.horario} onValueChange={(v) => handleInputChange("horario", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.length === 0 ? (
                        <SelectItem value="no-slot" disabled>Nenhum horário disponível</SelectItem>
                      ) : (
                        availableSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea value={formData.observacoes} onChange={(e) => handleInputChange("observacoes", e.target.value)} placeholder="Alguma observação especial..." />
              </div>

              {/* Salvar dados */}
              <div className="flex items-center gap-2">
                <Checkbox checked={saveData} onCheckedChange={(v: boolean) => setSaveData(v)} />
                <span className="text-sm">Salvar minhas informações para próximos agendamentos</span>
              </div>

              {/* Botão */}
              <Button type="submit" className="w-full bg-yellow-300 text-black hover:bg-yellow-400" disabled={isLoading}>
                {isLoading ? "Agendando..." : "Continuar Agendamento"}
              </Button>
            </form>

            {/* Rodapé */}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Importante: Este é um agendamento solicitado. Entraremos em contato via WhatsApp para confirmar a disponibilidade do horário selecionado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendarServico;
