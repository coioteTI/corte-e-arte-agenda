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

// ===== helpers =====
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
        await supabase.from("clients").update({
          name: data.nome,
          phone: data.telefone,
          email: data.email,
        }).eq("user_id", userId);
      }
    }
  } catch (err) {
    console.error("Erro ao salvar cliente:", err);
  }
};

const gerarProximosDias = (isDateAvailable?: (d: Date) => boolean) => {
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

// ===== componente =====
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
  const [isLiking, setIsLiking] = useState<boolean>(false); // desabilita botão ao curtir

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

  // load inicial
  useEffect(() => {
    fetchCompanyData();
    loadSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // realtime subscription para curtidas (companies.likes_count)
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel(`companies-likes-${company.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${company.id}` },
        (payload) => {
          // payload.new pode ter likes_count ou likes
          const newLikes = payload?.new?.likes_count ?? payload?.new?.likes ?? 0;
          setLikes(Number(newLikes));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

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
        setFormData(prev => ({
          ...prev,
          nome: clientData.name || clientData.nome || "",
          telefone: clientData.phone || clientData.telefone || "",
          email: clientData.email || clientData.email || "",
        }));
        setSaveData(true);
      }
    } catch (err) {
      console.error("Erro ao carregar client data:", err);
    }
  };

  // fetch empresa + serviços + profissionais (com proteções)
  const fetchCompanyData = async () => {
    try {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, phone, email, address, number, neighborhood, city, state, primary_color, business_hours, likes_count")
        .limit(10);

      if (error) throw error;

      const foundCompany = companies?.find((c: any) => String(c?.name || "").toLowerCase().replace(/\s+/g, "-") === String(slug)) || companies?.[0] || null;

      if (!foundCompany) {
        setCompany(null);
        setServices([]);
        setProfessionals([]);
        setLikes(0);
        setLoading(false);
        return;
      }

      setCompany(foundCompany);
      setLikes(Number(foundCompany.likes_count ?? foundCompany.likes ?? 0));

      const [{ data: servicesData }, { data: professionalsData }] = await Promise.all([
        supabase.from("services").select("*").eq("company_id", foundCompany.id),
        supabase.from("professionals").select("*").eq("company_id", foundCompany.id).eq("is_available", true),
      ]);

      setServices(servicesData || []);
      setProfessionals(professionalsData || []);
    } catch (err) {
      console.error("Erro fetchCompanyData:", err);
      toast({ title: "Erro", description: "Não foi possível carregar os dados da barbearia.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // slots disponíveis (proteções)
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
        for (let h = 8; h < 18; h++) {
          allTimeslots.push(`${String(h).padStart(2,'0')}:00`);
          allTimeslots.push(`${String(h).padStart(2,'0')}:30`);
        }
      }

      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("professional_id", professionalId)
        .eq("appointment_date", date)
        .in("status", ["scheduled", "confirmed", "in_progress"]);

      const occupied = (existingAppointments || []).map((a: any) => String(a.appointment_time).substring(0,5));
      setAvailableSlots(allTimeslots.filter(slot => !occupied.includes(slot)));
    } catch (err) {
      console.error("Erro fetchAvailableSlots:", err);
      setAvailableSlots([]);
    }
  };

  useEffect(() => {
    if (formData.professionalId && formData.data) fetchAvailableSlots(formData.professionalId, formData.data);
    else setAvailableSlots([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.professionalId, formData.data]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value ?? "" }));
  };

  // CURTIR: tenta chamar RPC increment_company_likes, senão faz update direto
  const handleLike = async () => {
    if (!company?.id || isLiking) return;
    setIsLiking(true);
    // optimistic
    setLikes(prev => prev + 1);

    try {
      // 1) Tentar RPC (recomendado)
      const { data: rpcData, error: rpcError } = await supabase.rpc("increment_company_likes", { p_company_id: company.id });
      if (rpcError) {
        // fallback: update direto
        const { data, error } = await supabase
          .from("companies")
          .update({ likes_count: (company.likes_count ?? likes) + 1 })
          .eq("id", company.id)
          .select("likes_count")
          .single();
        if (!error && data) {
          setLikes(Number(data.likes_count ?? data.likes ?? likes));
        } else {
          // se erro, reverter optimistic
          setLikes(prev => Math.max(prev - 1, 0));
        }
      } else {
        // rpcData pode retornar a linha atualizada (varia) — guardamos com fallback
        // se rpcData for array/record com likes_count:
        const newVal = (rpcData && (rpcData[0]?.likes_count ?? rpcData?.likes_count)) ?? null;
        if (newVal !== null) setLikes(Number(newVal));
      }
    } catch (err) {
      console.error("Erro ao curtir:", err);
      setLikes(prev => Math.max(prev - 1, 0));
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validações básicas para evitar envio inválido (e tela preta)
    if (!formData.servicoId || !formData.professionalId || !formData.data || !formData.horario) {
      toast({
        title: "Atenção",
        description: "Preencha serviço, profissional, data e horário antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (saveData) {
        await saveClientData({ nome: formData.nome, telefone: formData.telefone, email: formData.email }, user?.id);
      }

      // criar cliente (se necessário) - simplificado: guest = null client_id
      let clientId: any = null;
      if (user) {
        const { data: existingClient } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();
        if (existingClient) clientId = existingClient.id;
        else {
          const { data: newClient } = await supabase.from("clients").insert({
            user_id: user.id, name: formData.nome, phone: formData.telefone, email: formData.email,
          }).select("id").single();
          clientId = newClient?.id ?? null;
        }
      }

      const hhmmss = formData.horario.includes(":") ? `${formData.horario}:00` : `${formData.horario}:00`;

      // check race condition quickly
      const { data: clash } = await supabase
        .from("appointments")
        .select("id")
        .eq("professional_id", formData.professionalId)
        .eq("appointment_date", formData.data)
        .eq("appointment_time", hhmmss)
        .in("status", ["scheduled","confirmed","in_progress"])
        .maybeSingle();

      if (clash) {
        toast({ title: "Horário indisponível", description: "Este horário já foi reservado.", variant: "destructive" });
        await fetchAvailableSlots(formData.professionalId, formData.data);
        setIsLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("appointments").insert({
        client_id: clientId, company_id: company.id,
        service_id: formData.servicoId, professional_id: formData.professionalId,
        appointment_date: formData.data, appointment_time: hhmmss,
        notes: formData.observacoes || null, status: "scheduled",
      });

      if (insertError) throw insertError;

      toast({ title: "Sucesso", description: "Agendamento confirmado!" });
      navigate(`/agendamento-confirmado/${slug}`);
    } catch (err: any) {
      console.error("Erro no agendamento:", err);
      toast({ title: "Erro", description: err?.message ?? "Não foi possível realizar o agendamento.", variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header card */}
        {company && (
          <Card>
            <CardHeader className="text-center">
              <img src={logo} alt="Logo" className="w-16 h-16 rounded-full mx-auto mb-2" />
              <CardTitle>{company.name}</CardTitle>
              {company.address && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin size={14} /> {company.address}{company.number ? `, ${company.number}` : ""}{company.neighborhood ? `, ${company.neighborhood}` : ""} {company.city ? `, ${company.city}` : ""}{company.state ? ` - ${company.state}` : ""}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <Button size="sm" onClick={handleLike} disabled={isLiking}>
                  <Heart className="mr-1" size={16} /> Curtir ({likes})
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* business hours */}
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

        {/* scheduling form */}
        <Card>
          <CardHeader><CardTitle>Dados do Agendamento</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nome completo</Label><Input value={formData.nome} onChange={(e)=>handleInputChange("nome", e.target.value)} required /></div>
                <div><Label>WhatsApp</Label><Input value={formData.telefone} onChange={(e)=>handleInputChange("telefone", e.target.value)} placeholder="(11) 90000-0000" required /></div>
              </div>

              <div><Label>Email (opcional)</Label><Input type="email" value={formData.email} onChange={(e)=>handleInputChange("email", e.target.value)} /></div>

              <div>
                <Label>Escolha o Serviço</Label>
                <Select value={formData.servicoId || ""} onValueChange={(v)=>handleInputChange("servicoId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.length === 0 ? <SelectItem value="no-service" disabled>Nenhum serviço disponível</SelectItem> : services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - R${Number(s.price).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quem você quer que realize o serviço?</Label>
                {professionals.length === 0 ? (
                  <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded-md">Esta barbearia não possui profissionais disponíveis no momento.</div>
                ) : (
                  <Select value={formData.professionalId || ""} onValueChange={(v)=>handleInputChange("professionalId", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger>
                    <SelectContent>
                      {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.specialty ? ` - ${p.specialty}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Select value={formData.data || ""} onValueChange={(v)=>handleInputChange("data", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma data" /></SelectTrigger>
                    <SelectContent>
                      {diasDisponiveis.length === 0 ? <SelectItem value="no-date" disabled>Nenhuma data disponível</SelectItem> : diasDisponiveis.map(d => <SelectItem key={d.data} value={d.data}>{d.texto}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Horário</Label>
                  <Select value={formData.horario || ""} onValueChange={(v)=>handleInputChange("horario", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um horário" /></SelectTrigger>
                    <SelectContent>
                      {availableSlots.length === 0 ? <SelectItem value="no-slot" disabled>Nenhum horário disponível</SelectItem> : availableSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div><Label>Observações (opcional)</Label><Textarea value={formData.observacoes} onChange={(e)=>handleInputChange("observacoes", e.target.value)} placeholder="Alguma observação especial..." /></div>

              <div className="flex items-center gap-2">
                <Checkbox checked={saveData} onCheckedChange={(v:boolean)=>setSaveData(v)} />
                <span className="text-sm">Salvar minhas informações para próximos agendamentos</span>
              </div>

              <Button type="submit" className="w-full bg-yellow-300 text-black hover:bg-yellow-400" disabled={isLoading}>
                {isLoading ? "Agendando..." : "Continuar Agendamento"}
              </Button>
            </form>

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
