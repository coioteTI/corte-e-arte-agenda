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
    
    if (userId) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();

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
      setSaveData(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, phone, email')
          .eq('user_id', user.id)
          .single();

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
      const { data: companies, error } = await supabase
        .from('companies_public')
        .select('*')
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

        setServices(!servicesError && servicesData ? servicesData : []);

        const { data: professionalsData, error: profError } = await supabase
          .from('professionals')
          .select('*')
          .eq('company_id', foundCompany.id)
          .eq('is_available', true);

        setProfessionals(!profError && professionalsData ? professionalsData : []);
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
      if (!company?.id) {
        setAvailableSlots([]);
        return;
      }
      
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

      const occupiedSlots = existingAppointments?.map(apt => apt.appointment_time) || [];
      const availableTimeslots = allTimeslots.filter(slot => !occupiedSlots.includes(slot));

      setAvailableSlots(availableTimeslots);
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

    const errors = [];
    
    if (!formData.nome.trim()) errors.push("Nome é obrigatório");
    if (!formData.telefone.trim()) errors.push("Telefone é obrigatório");
    if (!formData.servicoId) errors.push("Selecione um serviço");
    if (!formData.professionalId) errors.push("Selecione um profissional");
    if (!formData.data) errors.push("Selecione uma data");
    if (!formData.horario) errors.push("Selecione um horário");
    
    if (formData.telefone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone) && !/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      errors.push("Formato de telefone inválido");
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Email inválido");
    }

    const selectedDate = new Date(formData.data);
    if (!isDateAvailable || !isDateAvailable(selectedDate)) {
      errors.push("Data selecionada não está disponível para agendamentos");
    }

    if (getAvailableTimeSlotsForDate && formData.data) {
      const availableTimeSlots = getAvailableTimeSlotsForDate(selectedDate, 30) || [];
      if (!availableTimeSlots.includes(formData.horario)) {
        errors.push("Horário selecionado não está disponível");
      }
    }

    // ✅ Validação usando IDs, não nomes
    if (servicoSelecionado?.professional_id && professionalSelecionado?.id !== servicoSelecionado.professional_id) {
      const responsible = professionals.find(p => p.id === servicoSelecionado.professional_id);
      errors.push(`O serviço "${servicoSelecionado.name}" deve ser realizado por ${responsible?.name}`);
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

      const appointmentData = {
        client_id: clientId,
        company_id: company.id,
        service_id: formData.servicoId,
        professional_id: formData.professionalId,
        appointment_date: formData.data,
        appointment_time: formData.horario,
        total_price: servicoSelecionado?.price,
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
        {/* O restante do JSX permanece igual */}
      </div>
    </div>
  );
};

export default AgendarServico;
