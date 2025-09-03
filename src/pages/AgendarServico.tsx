// AgendarServico.tsx (corrigido endereço)
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, User, Phone, Mail, ArrowLeft, MessageSquare, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessHours } from "@/hooks/useBusinessHours";

// Load saved client data from localStorage
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
    console.error('Error saving client data:', error);
  }
};

const gerarProximosDias = (isDateAvailable?: (date: Date) => boolean) => {
  const dias: { data: string; texto: string }[] = [];
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

  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isDateAvailable, getAvailableTimeSlotsForDate } = useBusinessHours(company?.id || "");

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

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoadingCompany(true);
      try {
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id, name, phone, instagram, email, address, number, neighborhood, city, state, zip_code, primary_color, business_hours')
          .limit(10);

        if (error) throw error;

        const foundCompany = companies?.find((c: any) => {
          if (!c?.name) return false;
          return c.name.toLowerCase().replace(/\s+/g, '-') === slug;
        }) || companies?.[0];

        if (foundCompany && mounted) {
          setCompany(foundCompany);

          const { data: servicesData } = await supabase
            .from('services')
            .select('*')
            .eq('company_id', foundCompany.id);
          setServices(servicesData || []);

          const { data: professionalsData } = await supabase
            .from('professionals')
            .select('*')
            .eq('company_id', foundCompany.id)
            .eq('is_available', true);
          setProfessionals(professionalsData || []);
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados da barbearia.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoadingCompany(false);
      }
    };

    const loadSaved = async () => {
      const saved = loadSavedClientData();
      if (saved) {
        setFormData(prev => ({
          ...prev,
          nome: saved.nome || "",
          telefone: saved.telefone || "",
          email: saved.email || ""
        }));
        setSaveData(true);
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('name, phone, email')
            .eq('user_id', user.id)
            .maybeSingle();

          if (clientData) {
            setFormData(prev => ({
              ...prev,
              nome: clientData.name || prev.nome,
              telefone: clientData.phone || prev.telefone,
              email: clientData.email || prev.email
            }));
            setSaveData(true);
          }
        }
      } catch (err) {
        console.log('Sem dados salvos no banco (ou erro ao buscar).');
      }
    };

    loadData();
    loadSaved();

    return () => { mounted = false; };
  }, [slug, toast]);

  const diasDisponiveis = useMemo(() => gerarProximosDias(isDateAvailable), [isDateAvailable, company?.id]);

  const servicoSelecionado = services.find(s => s.id === formData.servicoId);
  const professionalSelecionado = professionals.find(p => p.id === formData.professionalId);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchAvailableSlots = async (professionalId: string, date: string) => {
    setAvailableSlots([]);
    if (!company?.id || !professionalId || !date) return;

    setLoadingSlots(true);
    try {
      const selectedDate = new Date(date);
      let allTimeslots: string[] = [];

      if (getAvailableTimeSlotsForDate) {
        allTimeslots = getAvailableTimeSlotsForDate(selectedDate, 30) || [];
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

      if (error) throw error;

      const occupiedSlots = existingAppointments?.map((apt: any) => apt?.appointment_time) || [];
      const availableTimeslots = allTimeslots.filter(slot => !occupiedSlots.includes(slot));
      setAvailableSlots(availableTimeslots);
    } catch (error) {
      console.error("Erro ao buscar horários disponíveis:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar horários disponíveis.",
        variant: "destructive"
      });
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (formData.professionalId && formData.data) {
      fetchAvailableSlots(formData.professionalId, formData.data);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.professionalId, formData.data, company?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const errors: string[] = [];
      if (!formData.nome.trim()) errors.push("Nome é obrigatório");
      if (!formData.telefone.trim()) errors.push("Telefone é obrigatório");
      if (!formData.servicoId) errors.push("Selecione um serviço");
      if (!formData.professionalId) errors.push("Selecione um profissional");
      if (!formData.data) errors.push("Selecione uma data");
      if (!formData.horario) errors.push("Selecione um horário");

      if (errors.length > 0) {
        toast({
          title: "Erro na validação",
          description: errors.join(", "),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (saveData) {
        await saveClientData({
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email
        }, user?.id);
      }

      let clientId: any = null;

      if (user) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        clientId = existingClient?.id;

        if (!clientId) {
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
          clientId = newClient?.id;
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
        clientId = newClient?.id;
      }

      const appointmentData = {
        client_id: clientId,
        company_id: company?.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data,
        appointment_time: formData.horario + ':00',
        total_price: servicoSelecionado?.price ? Number(servicoSelecionado.price) : null,
        notes: formData.observacoes || null,
        status: 'scheduled'
      };

      await supabase.from('appointments').insert(appointmentData);

      toast({
        title: "Agendamento Realizado!",
        description: "Seu agendamento foi confirmado com sucesso.",
      });

      navigate(`/agendamento-confirmado/${slug}`);
    } catch (error: any) {
      console.error("Erro no agendamento:", error);
      toast({
        title: "Erro no agendamento",
        description: error?.message || "Não foi possível realizar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // RENDER
  return (
    <div className="min-h-screen bg-background p-4">
      {loadingCompany ? (
        <div className="w-full max-w-2xl mx-auto bg-card p-6 rounded-lg shadow">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-4"></div>
            <div>Carregando informações da barbearia...</div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                Agendar Serviço - {company?.name} 
                {company?.address && company?.number && company?.neighborhood && company?.city && company?.state && company?.zip_code &&
                  `, ${company.address}, ${company.number} - ${company.neighborhood}, ${company.city} - ${company.state}, ${company.zip_code}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)} />
                </div>

                <div>
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={(e) => handleInputChange('telefone', e.target.value)} />
                </div>

                <div>
                  <Label>Serviço</Label>
                  {services.length === 0 ? (
                    <div>Carregando serviços...</div>
                  ) : (
                    <Select onValueChange={(v) => handleInputChange('servicoId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Profissional</Label>
                  {professionals.length === 0 ? (
                    <div>Carregando profissionais...</div>
                  ) : (
                    <Select onValueChange={(v) => handleInputChange('professionalId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Data</Label>
                  <Select onValueChange={(v) => handleInputChange('data', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma data" />
                    </SelectTrigger>
                    <SelectContent>
                      {diasDisponiveis.map(d => (
                        <SelectItem key={d.data} value={d.data}>{d.texto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Horário</Label>
                  {loadingSlots ? (
                    <div>Buscando horários...</div>
                  ) : availableSlots.length === 0 ? (
                    <div>Nenhum horário disponível</div>
                  ) : (
                    <Select onValueChange={(v) => handleInputChange('horario', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={formData.observacoes} onChange={(e) => handleInputChange('observacoes', e.target.value)} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Checkbox checked={saveData} onCheckedChange={(v: any) => setSaveData(Boolean(v))} />
                    <span className="ml-2">Salvar meus dados</span>
                  </div>
                  <div>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Enviando...' : 'Confirmar Agendamento'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AgendarServico;
