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
import { useBusinessHours } from "@/hooks/useBusinessHours";
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
const saveClientData = async (data: any, userId?: string) => {
  try {
    localStorage.setItem('clientData', JSON.stringify(data));
    
    // Also save to database if user is logged in
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

// Gerar próximos 14 dias úteis com base nos horários de funcionamento
const gerarProximosDias = (isDateAvailable?: (date: Date) => boolean) => {
  const dias = [];
  const hoje = new Date();
  
  for (let i = 1; i <= 14; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    
    // Verificar se a data está disponível baseado nos horários de funcionamento
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
  
  // Hook para horários de funcionamento
  const { isDateAvailable, getAvailableTimeSlotsForDate } = useBusinessHours(company?.id || "");
  
  // Gerar dias disponíveis após ter o hook de horários
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

  useEffect(() => {
    fetchCompanyData();
    loadSavedData();
  }, [slug]);

  const loadSavedData = async () => {
    const saved = loadSavedClientData();
    if (saved) {
      setFormData(prev => ({
        ...prev,
        nome: saved.nome || "",
        telefone: saved.telefone || "",
        email: saved.email || ""
      }));
      setSaveData(true); // Pre-check the checkbox if data exists
    }

    // Also try to load from database if user is logged in
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
    } catch (error) {
      console.log('No saved client data in database');
    }
  };

  const fetchCompanyData = async () => {
    try {
      // Get company by matching slug-like pattern from companies table
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, phone, instagram, email, address, number, neighborhood, city, state, zip_code, primary_color, business_hours')
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

        // Fetch professionals for this company (using secure function)
        const { data: professionalsData, error: profError } = await supabase
          .rpc('get_professionals_for_booking', { company_uuid: foundCompany.id })
          .then(result => ({
            ...result,
            data: result.data?.filter((prof: any) => prof.is_available) || []
          }));

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
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        // Toast will auto-dismiss
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (professionalId: string, date: string) => {
    try {
      console.log('Fetching slots for:', { professionalId, date, companyId: company?.id });
      
      // Verificar se os dados necessários estão disponíveis
      if (!company?.id) {
        console.error('Company ID not available for fetching slots');
        setAvailableSlots([]);
        return;
      }
      
      // Usar horários de funcionamento para gerar slots disponíveis
      const selectedDate = new Date(date);
      let allTimeslots: string[] = [];
      
      console.log('Business hours available:', !!getAvailableTimeSlotsForDate);
      
      if (getAvailableTimeSlotsForDate) {
        allTimeslots = getAvailableTimeSlotsForDate(selectedDate, 30);
        console.log('Generated timeslots from business hours:', allTimeslots);
      } else {
        console.log('Using fallback timeslots');
        // Fallback: gerar horários padrão se não houver horários de funcionamento definidos
        for (let hour = 8; hour < 18; hour++) {
          allTimeslots.push(`${hour.toString().padStart(2, '0')}:00`);
          allTimeslots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }

      if (allTimeslots.length === 0) {
        console.log('No timeslots available for this date');
        setAvailableSlots([]);
        return;
      }

      // Buscar agendamentos existentes para filtrar horários ocupados
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('professional_id', professionalId)
        .eq('appointment_date', date)
        .in('status', ['scheduled', 'confirmed', 'in_progress']);

      if (error) {
        console.error('Error fetching existing appointments:', error);
      }

      console.log('Existing appointments:', existingAppointments);

      // Filtrar horários ocupados
      const occupiedSlots = existingAppointments?.map(apt => apt.appointment_time) || [];
      const availableTimeslots = allTimeslots.filter(slot => !occupiedSlots.includes(slot));

      console.log('Final available slots:', availableTimeslots);
      setAvailableSlots(availableTimeslots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
      toast({
        title: "Erro ao carregar horários",
        description: "Não foi possível carregar os horários disponíveis.",
        variant: "destructive",
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        // Toast will auto-dismiss
      }, 3000);
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
    
    console.log('=== STARTING APPOINTMENT BOOKING ===');
    console.log('Form data:', formData);
    console.log('Company data:', company);
    console.log('Services available:', services);
    console.log('Professionals available:', professionals);
    
    // Validações melhoradas
    const errors = [];
    
    if (!formData.nome.trim()) errors.push("Nome é obrigatório");
    if (!formData.telefone.trim()) errors.push("Telefone é obrigatório");
    if (!formData.servicoId) errors.push("Selecione um serviço");
    if (!formData.professionalId) errors.push("Selecione um profissional");
    if (!formData.data) errors.push("Selecione uma data");
    if (!formData.horario) errors.push("Selecione um horário");
    
    console.log('Validation errors found:', errors);
    
    // Validar formato do telefone (básico)
    if (formData.telefone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone) && !/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      errors.push("Formato de telefone inválido");
    }
    
    // Validar email se preenchido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Email inválido");
    }

    // Validar se a data não é um domingo ou dia não disponível
    const selectedDate = new Date(formData.data);
    console.log('Selected date:', selectedDate, 'isDateAvailable:', isDateAvailable);
    if (!isDateAvailable || !isDateAvailable(selectedDate)) {
      errors.push("Data selecionada não está disponível para agendamentos");
    }

    // Validar se o horário está dentro do expediente
    if (getAvailableTimeSlotsForDate && formData.data) {
      const availableSlots = getAvailableTimeSlotsForDate(selectedDate, 30);
      console.log('Available slots for selected date:', availableSlots);
      console.log('Selected time slot:', formData.horario);
      if (!availableSlots.includes(formData.horario)) {
        errors.push("Horário selecionado não está disponível");
      }
    }

    // Log para debug - não validamos mais se o profissional corresponde ao professional_responsible
    // O cliente pode escolher qualquer profissional disponível
    const selectedService = services.find(s => s.id === formData.servicoId);
    const selectedProfessional = professionals.find(p => p.id === formData.professionalId);
    
    console.log('Selected service:', selectedService);
    console.log('Selected professional:', selectedProfessional);
    
    console.log('Final validation errors:', errors);
    
    if (errors.length > 0) {
      console.log('Validation failed, stopping submission');
      toast({
        title: "Erro na validação",
        description: errors.join(", "),
        variant: "destructive",
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        // Toast will auto-dismiss
      }, 3000);
      setIsLoading(false);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user ? 'logged in' : 'guest');
    
    // Save client data if checkbox is checked
    if (saveData) {
      console.log('Saving client data...');
      await saveClientData({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email
      }, user?.id);
    }

    try {
      console.log('=== STARTING CLIENT CREATION/RETRIEVAL ===');
      
      // Validar se company.id existe
      if (!company?.id) {
        console.error('Company ID not found!');
        throw new Error('ID da empresa não encontrado');
      }
      
      // Create or get client
      let clientId = null;
      
      if (user) {
        console.log('User logged in, checking for existing client');
        // Check if client exists
        const { data: existingClient, error: existingClientError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingClientError) {
          console.error('Error checking existing client:', existingClientError);
          throw existingClientError;
        }

        if (existingClient) {
          console.log('Existing client found:', existingClient.id);
          clientId = existingClient.id;
        } else {
          console.log('Creating new client for logged user');
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

          if (clientError) {
            console.error('Error creating client for logged user:', clientError);
            throw clientError;
          }
          console.log('New client created for logged user:', newClient.id);
          clientId = newClient.id;
        }
      } else {
        console.log('Guest user, creating client without user_id');
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

        if (clientError) {
          console.error('Error creating guest client:', clientError);
          console.error('Client error details:', clientError);
          throw clientError;
        }
        console.log('Guest client created:', newClient.id);
        clientId = newClient.id;
      }

      if (!clientId) {
        console.error('Client ID is null after creation/retrieval');
        throw new Error('Não foi possível criar o cliente');
      }

      console.log('=== STARTING APPOINTMENT CREATION ===');
      console.log('Client ID:', clientId);

      // Validate all required data is present
      const requiredFields = {
        client_id: clientId,
        company_id: company.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data,
        appointment_time: formData.horario
      };

      console.log('Required fields check:');
      Object.entries(requiredFields).forEach(([key, value]) => {
        console.log(`${key}: ${value} (${typeof value})`);
        if (!value) {
          throw new Error(`Campo obrigatório ausente: ${key}`);
        }
      });

      // Create appointment data with proper types and formatting
      const appointmentData = {
        client_id: clientId,
        company_id: company.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data, // Format: YYYY-MM-DD
        appointment_time: formData.horario + ':00', // Ensure time has seconds
        total_price: selectedService?.price ? Number(selectedService.price) : null,
        notes: formData.observacoes || null,
        status: 'scheduled'
      };
      
      console.log('Final appointment data to insert:', appointmentData);
      
      const { data: insertedAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select('*')
        .single();

      if (appointmentError) {
        console.error('=== APPOINTMENT INSERT ERROR ===');
        console.error('Error code:', appointmentError.code);
        console.error('Error message:', appointmentError.message);
        console.error('Error details:', appointmentError.details);
        console.error('Error hint:', appointmentError.hint);
        console.error('Full error object:', appointmentError);
        
        // More specific error messages
        let userMessage = "Não foi possível realizar o agendamento. ";
        if (appointmentError.message.includes('violates row-level security policy')) {
          userMessage += "Erro de permissão de acesso.";
        } else if (appointmentError.message.includes('foreign key')) {
          userMessage += "Dados inválidos selecionados.";
        } else if (appointmentError.message.includes('duplicate key')) {
          userMessage += "Já existe um agendamento para este horário.";
        } else {
          userMessage += `Erro: ${appointmentError.message}`;
        }
        
        toast({
          title: "Erro no agendamento",
          description: userMessage,
          variant: "destructive",
        });
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          // Toast will auto-dismiss
        }, 3000);
        
        throw appointmentError;
      }
      
      console.log('=== APPOINTMENT CREATED SUCCESSFULLY ===');
      console.log('Inserted appointment:', insertedAppointment);

      toast({
        title: "Agendamento Realizado!",
        description: "Seu agendamento foi confirmado com sucesso.",
      });
      
      navigate(`/agendamento-confirmado/${slug}`);
    } catch (error: any) {
      console.error('=== GENERAL ERROR IN APPOINTMENT CREATION ===');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error object:', error);
      
      // Only show toast if not already shown
      if (!error?.message?.includes('row-level security') && 
          !error?.message?.includes('foreign key') && 
          !error?.message?.includes('duplicate key')) {
        toast({
          title: "Erro no agendamento",
          description: error?.message || "Não foi possível realizar o agendamento. Tente novamente.",
          variant: "destructive",
        });
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          // Toast will auto-dismiss
        }, 3000);
      }
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
                
                 {/* Informações da Barbearia */}
                <div className="mt-3 space-y-2">
                  {company && (company.address || company.city || company.state) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {[company.address, company.number, company.neighborhood, company.city, company.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  
                  {/* Botões de Contato */}
                  <div className="flex gap-2 mt-3">
                    {company?.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const phone = company.phone.replace(/\D/g, '');
                          const numero = phone.replace(/\D/g, '');
                          const whatsappUrl = `https://wa.me/55${numero}`;
                          window.open(whatsappUrl, '_blank');
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
                          window.open(`https://instagram.com/${company.instagram.replace("@", "")}`, '_blank');
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
                  const dayNames: { [key: string]: string } = {
                    'monday': 'Segunda-feira',
                    'tuesday': 'Terça-feira', 
                    'wednesday': 'Quarta-feira',
                    'thursday': 'Quinta-feira',
                    'friday': 'Sexta-feira',
                    'saturday': 'Sábado',
                    'sunday': 'Domingo'
                  };
                  
                  return (
                    <div key={day} className="flex justify-between items-center py-1">
                      <span className="text-sm font-medium">{dayNames[day]}</span>
                      <span className="text-sm text-muted-foreground">
                        {hours.isOpen ? `${hours.start} - ${hours.end}` : 'Fechado'}
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
                      <strong>Esta barbearia ainda não cadastrou serviços disponíveis.</strong><br />
                      Entre em contato diretamente para agendar seu atendimento.
                    </p>
                    {company?.phone && (
                      <p className="text-sm text-yellow-800 mt-2">
                        📞 Telefone: {company.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Serviço *</Label>
                      <Select value={formData.servicoId} onValueChange={(value) => {
                        handleInputChange("servicoId", value);
                        
                        // Auto-selecionar profissional se o serviço tiver professional_responsible
                        const selectedService = services.find(s => s.id === value);
                        if (selectedService?.professional_responsible) {
                          const matchingProfessional = professionals.find(p => 
                            p.name === selectedService.professional_responsible
                          );
                          if (matchingProfessional) {
                            handleInputChange("professionalId", matchingProfessional.id);
                          }
                        }
                      }}>
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
                      <strong>Esta barbearia ainda não cadastrou profissionais disponíveis.</strong><br />
                      Entre em contato diretamente para agendar seu atendimento.
                    </p>
                    {company?.phone && (
                      <p className="text-sm text-yellow-800 mt-2">
                        📞 Telefone: {company.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
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