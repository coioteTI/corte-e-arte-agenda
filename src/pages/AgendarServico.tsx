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
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import logo from "@/assets/logo.png";

// Funções auxiliares
const loadSavedClientData = () => {
  try {
    const saved = localStorage.getItem('clientData');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveClientData = async (data: any, userId?: string) => {
  try {
    localStorage.setItem('clientData', JSON.stringify(data));

    if (userId) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingClient) {
        await supabase
          .from('clients')
          .update({
            name: data.nome,
            phone: data.telefone,
            email: data.email
          })
          .eq('user_id', userId);
      }
    }
  } catch (error) {
    console.error('Erro ao salvar dados do cliente:', error);
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
        data: data.toISOString().split('T')[0],
        texto: data.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit'
        })
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
    observacoes: ""
  });
  const [saveData, setSaveData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados da empresa e do cliente
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
          .from('clients')
          .select('name, phone, email')
          .eq('user_id', user.id)
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

    } catch (error) {
      console.log('Erro ao carregar dados do cliente', error);
    }
  };

  const fetchCompanyData = async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, phone, instagram, email, address, number, neighborhood, city, state, zip_code, primary_color, business_hours')
        .limit(10);

      if (error) throw error;

      const foundCompany = companies?.find(c =>
        c.name.toLowerCase().replace(/\s+/g, '-') === slug
      ) || companies?.[0];

      if (foundCompany) {
        setCompany(foundCompany);

        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', foundCompany.id);
        if (!servicesError) setServices(servicesData || []);

        const { data: professionalsData, error: profError } = await supabase
          .from('professionals')
          .select('*')
          .eq('company_id', foundCompany.id)
          .eq('is_available', true);
        if (!profError) setProfessionals(professionalsData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da barbearia:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da barbearia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (professionalId: string, date: string) => {
    try {
      if (!company?.id) return setAvailableSlots([]);
      const selectedDate = new Date(date);
      let allTimeslots: string[] = [];

      if (getAvailableTimeSlotsForDate) {
        allTimeslots = getAvailableTimeSlotsForDate(selectedDate, 30);
      } else {
        for (let hour = 8; hour < 18; hour++) {
          allTimeslots.push(`${hour.toString().padStart(2, '0')}:00`);
          allTimeslots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }

      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('professional_id', professionalId)
        .eq('appointment_date', date)
        .in('status', ['scheduled', 'confirmed', 'in_progress']);

      if (error) console.error('Erro ao buscar agendamentos:', error);

      const occupiedSlots = existingAppointments?.map(apt => apt.appointment_time) || [];
      setAvailableSlots(allTimeslots.filter(slot => !occupiedSlots.includes(slot)));

    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
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
  }, [formData.professionalId, formData.data]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    if (formData.telefone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone) &&
        !/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
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
      const slots = getAvailableTimeSlotsForDate(selectedDate, 30);
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
      const { data: { user } } = await supabase.auth.getUser();

      if (saveData) {
        await saveClientData({
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email
        }, user?.id);
      }

      let clientId = null;

      if (user) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              name: formData.nome,
              phone: formData.telefone,
              email: formData.email
            })
            .select('id')
            .single();
          clientId = newClient.id;
        }
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            name: formData.nome,
            phone: formData.telefone,
            email: formData.email
          })
          .select('id')
          .single();
        clientId = newClient.id;
      }

      const servicoSelecionado = services.find(s => s.id === formData.servicoId);

      const appointmentData = {
        client_id: clientId,
        company_id: company.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data,
        appointment_time: formData.horario + ':00',
        total_price: servicoSelecionado?.price ? Number(servicoSelecionado.price) : null,
        notes: formData.observacoes || null,
        status: 'scheduled'
      };

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData);

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
        {/* ===== Layout ORIGINAL da sua página ===== */}
        <img src={logo} alt="Logo" className="mx-auto w-32 mb-6" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Agendar Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aqui mantém exatamente o layout que você enviou */}
              {/* Nome */}
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                  required
                />
              </div>

              {/* Telefone */}
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => handleInputChange("telefone", e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>

              {/* Serviço */}
              <div>
                <Label>Serviço</Label>
                <Select
                  onValueChange={(value) => handleInputChange("servicoId", value)}
                  value={formData.servicoId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - R$ {s.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional */}
              <div>
                <Label>Profissional</Label>
                <Select
                  onValueChange={(value) =>
                    handleInputChange("professionalId", value)
                  }
                  value={formData.professionalId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div>
                <Label>Data</Label>
                <Select
                  onValueChange={(value) => handleInputChange("data", value)}
                  value={formData.data}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {diasDisponiveis.map((d) => (
                      <SelectItem key={d.data} value={d.data}>
                        {d.texto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Horário */}
              <div>
                <Label>Horário</Label>
                <Select
                  onValueChange={(value) => handleInputChange("horario", value)}
                  value={formData.horario}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange("observacoes", e.target.value)}
                  placeholder="Observações adicionais"
                />
              </div>

              {/* Salvar dados */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={saveData}
                  onCheckedChange={(checked) => setSaveData(!!checked)}
                />
                <span>Salvar meus dados para próximos agendamentos</span>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Agendando..." : "Agendar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendarServico;
