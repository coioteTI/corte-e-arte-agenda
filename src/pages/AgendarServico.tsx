import { useState, useEffect } from "react";
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
import logo from "@/assets/logo.png";

// Load saved client data from localStorage
const loadSavedClientData = () => {
  try {
    const saved = localStorage.getItem('clientData');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save client data to localStorage
const saveClientData = (data: any) => {
  try {
    localStorage.setItem('clientData', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving client data:', error);
  }
};

// Gerar próximos 14 dias úteis
const gerarProximosDias = () => {
  const dias = [];
  const hoje = new Date();
  
  for (let i = 1; i <= 14; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    
    // Pular domingos (0)
    if (data.getDay() !== 0) {
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
  const diasDisponiveis = gerarProximosDias();
  
  const [company, setCompany] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    fetchCompanyData();
    loadSavedData();
  }, [slug]);

  const loadSavedData = () => {
    const saved = loadSavedClientData();
    if (saved) {
      setFormData(prev => ({
        ...prev,
        nome: saved.nome || "",
        telefone: saved.telefone || "",
        email: saved.email || ""
      }));
    }
  };

  const fetchCompanyData = async () => {
    try {
      // Get company by matching slug-like pattern
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .limit(10);

      if (error) throw error;

      // Find company by slug match or use first one
      const foundCompany = companies?.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === slug
      ) || companies?.[0];

      if (foundCompany) {
        setCompany(foundCompany);
        
        // Fetch services for this company
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', foundCompany.id);

        if (!servicesError) {
          setServices(servicesData || []);
        }

        // Fetch professionals for this company
        const { data: professionalsData, error: profError } = await supabase
          .from('professionals')
          .select('*')
          .eq('company_id', foundCompany.id)
          .eq('is_available', true);

        if (!profError) {
          setProfessionals(professionalsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
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
      console.log('Fetching slots for:', { professionalId, date });
      
      // Generate all possible time slots (08:00 to 18:00, 30min intervals)
      const allSlots = [];
      for (let hour = 8; hour < 18; hour++) {
        allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }

      // For now, return all slots as available (we'll improve this later)
      console.log('Available slots:', allSlots);
      setAvailableSlots(allSlots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
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
  }, [formData.professionalId, formData.data]);

  const servicoSelecionado = services.find(s => s.id === formData.servicoId);
  const professionalSelecionado = professionals.find(p => p.id === formData.professionalId);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validações melhoradas
    const errors = [];
    
    if (!formData.nome.trim()) errors.push("Nome é obrigatório");
    if (!formData.telefone.trim()) errors.push("Telefone é obrigatório");
    if (!formData.servicoId) errors.push("Selecione um serviço");
    if (!formData.professionalId) errors.push("Selecione um profissional");
    if (!formData.data) errors.push("Selecione uma data");
    if (!formData.horario) errors.push("Selecione um horário");
    
    // Validar formato do telefone (básico)
    if (formData.telefone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone) && !/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      errors.push("Formato de telefone inválido");
    }
    
    // Validar email se preenchido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Email inválido");
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

    // Save client data if checkbox is checked
    if (saveData) {
      saveClientData({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email
      });
    }

    try {
      // Create or get client
      let clientId = null;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if client exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Create new client
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              name: formData.nome,
              phone: formData.telefone,
              email: formData.email
            })
            .select('id')
            .single();

          if (clientError) throw clientError;
          clientId = newClient.id;
        }
      } else {
        // Create client without user_id for guests
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: formData.nome,
            phone: formData.telefone,
            email: formData.email
          })
          .select('id')
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: clientId,
          company_id: company.id,
          service_id: formData.servicoId,
          professional_id: formData.professionalId,
          appointment_date: formData.data,
          appointment_time: formData.horario,
          total_price: servicoSelecionado?.price,
          notes: formData.observacoes || null,
          status: 'scheduled'
        });

      if (appointmentError) throw appointmentError;

      toast({
        title: "Agendamento Realizado!",
        description: "Seu agendamento foi confirmado com sucesso.",
      });
      
      navigate(`/agendamento-confirmado/${slug}`);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erro no agendamento",
        description: "Não foi possível realizar o agendamento. Tente novamente.",
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
                <span className="text-2xl font-bold text-primary">
                  {company?.name?.charAt(0) || 'B'}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">
                  Agendar em {company?.name || 'Barbearia'}
                </h1>
                <p className="text-muted-foreground">
                  Preencha os dados para confirmar seu agendamento
                </p>
                {company && (company.address || company.city || company.state) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {[company.address, company.city, company.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select value={formData.servicoId} onValueChange={(value) => handleInputChange("servicoId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.name} - R$ {servico.price.toFixed(2)} ({servico.duration} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {servicoSelecionado && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>{servicoSelecionado.name}</strong><br />
                      Duração: {servicoSelecionado.duration} minutos<br />
                      Valor: R$ {servicoSelecionado.price.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Profissional */}
              <div className="space-y-4">
                <h3 className="font-medium">Quem você quer que realize o serviço?</h3>
                
                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select value={formData.professionalId} onValueChange={(value) => handleInputChange("professionalId", value)}>
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
                        <SelectValue placeholder={
                          !formData.professionalId || !formData.data 
                            ? "Selecione profissional e data primeiro" 
                            : availableSlots.length === 0 
                            ? "Nenhum horário disponível"
                            : "Selecione um horário"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((horario) => (
                          <SelectItem key={horario} value={horario}>
                            {horario}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <strong>Importante:</strong> Este é um pré-agendamento. A barbearia entrará em contato 
              via WhatsApp para confirmar a disponibilidade do horário solicitado.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AgendarServico;