// AgendarServico.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { validateAppointment } from "@/utils/validation";
import { useSupabaseOperations } from "@/hooks/useSupabaseOperations";
import { GallerySection } from "@/components/GallerySection";

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
  instagram: string | null;
  logo_url: string | null;
  email: string;
  phone: string;
};

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  professional_responsible: string | null;
};

type Professional = {
  id: string;
  company_id: string;
  name: string;
  specialty: string | null;
  phone?: string | null;
  email?: string | null;
  is_available: boolean;
  created_at?: string;
};

type Appointment = {
  id?: string;
  company_id: string;
  service_id: string;
  professional_id: string;
  client_id?: string | null;
  appointment_date: string;
  appointment_time: string;
  notes?: string | null;
  status: string;
  total_price?: number | null;
  payment_method?: string | null;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
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
      console.log("Buscando empresa com slug:", slug);

      // Try to find company by slug - convert slug back to name for search
      const searchName = slug?.replace(/-/g, " ") || "";
      console.log("Nome de busca convertido:", searchName);
      
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", `%${searchName}%`);

      if (companyError) {
        console.error("Erro ao buscar empresa:", companyError);
        throw companyError;
      }
      
      console.log("Empresas encontradas:", companies);
      
      if (!companies || companies.length === 0) {
        toast.error("Empresa não encontrada");
        return;
      }

      // Find best match (exact name match preferred)
      let companyData = companies.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === slug?.toLowerCase()
      ) || companies[0];
      
      console.log("Empresa selecionada:", companyData);
      setCompany(companyData);

      // Buscar serviços
      console.log("Buscando serviços para empresa ID:", companyData.id);
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("company_id", companyData.id);
      
      if (servicesError) {
        console.error("Erro ao buscar serviços:", servicesError);
      }
      console.log("Serviços encontrados:", servicesData);
      setServices(servicesData || []);

  // Buscar profissionais usando função pública
  console.log("Buscando profissionais para empresa ID:", companyData.id);
  
  // Usar função que ignora RLS para busca pública
  const { data: professionalsData, error: professionalsError } = await supabase
    .rpc("get_professionals_for_booking", { 
      company_uuid: companyData.id 
    });
  
  if (professionalsError) {
    console.error("Erro ao buscar profissionais:", professionalsError);
    // Fallback para query direta se a função falhar
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("professionals")
      .select("*")
      .eq("company_id", companyData.id);
    
    if (!fallbackError) {
      console.log("Profissionais encontrados via fallback:", fallbackData);
      setProfessionals(fallbackData || []);
    } else {
      console.error("Erro no fallback também:", fallbackError);
      setProfessionals([]);
    }
  } else {
    console.log("Profissionais encontrados via RPC:", professionalsData);
    console.log("Profissionais disponíveis:", professionalsData?.filter(p => p.is_available));
    setProfessionals(professionalsData || []);
  }

      // Buscar agendamentos
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("company_id", companyData.id)
        .in("status", ["confirmed", "scheduled", "pending"]);
      
      if (appointmentsError) {
        console.error("Erro ao buscar agendamentos:", appointmentsError);
      }
      console.log("Agendamentos encontrados:", appointmentsData);
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  }

  // Função separada para recarregar apenas os agendamentos
  const reloadAppointments = useCallback(async () => {
    if (!company?.id) return;

    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("company_id", company.id)
        .in("status", ["confirmed", "scheduled", "pending"]);
      
      if (appointmentsError) {
        console.error("Erro ao recarregar agendamentos:", appointmentsError);
        return;
      }
      
      console.log("Agendamentos recarregados:", appointmentsData?.length || 0);
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error("Erro ao recarregar agendamentos:", error);
    }
  }, [company?.id]);

  // Recarregar agendamentos a cada 15 segundos quando há empresa selecionada
  useEffect(() => {
    if (!company?.id) return;
    
    const interval = setInterval(reloadAppointments, 15000);
    return () => clearInterval(interval);
  }, [company?.id, reloadAppointments]);

  // Filtrar profissionais disponíveis - memoizado para evitar re-renders infinitos
  const availableProfessionals = useMemo(() => {
    const filtered = professionals.filter(p => {
      const isAvailable = p.is_available;
      
      // Suportar diferentes tipos de valores para is_available
      if (typeof isAvailable === 'boolean') {
        return isAvailable === true;
      }
      if (typeof isAvailable === 'number') {
        return isAvailable === 1;
      }
      if (typeof isAvailable === 'string') {
        return isAvailable === "true" || isAvailable === "t";
      }
      return false;
    });

    console.log("Profissionais disponíveis:", filtered.length);
    return filtered;
  }, [professionals]);

  // Filtrar profissionais com base no serviço selecionado - memoizado
  const filteredProfessionals = useMemo(() => {
    if (!selectedServiceId) return availableProfessionals;

    const selectedService = services.find(s => s.id === selectedServiceId);
    
    // Se o serviço tem um profissional responsável específico
    if (selectedService?.professional_responsible?.trim()) {
      // Filtrar por nome do profissional responsável
      const responsibleProfessionals = availableProfessionals.filter(p => 
        p.name.toLowerCase().trim() === selectedService.professional_responsible.toLowerCase().trim() ||
        p.specialty?.toLowerCase().includes(selectedService.name.toLowerCase()) ||
        selectedService.professional_responsible.toLowerCase().includes(p.name.toLowerCase())
      );
      
      // Se não encontrar profissional responsável específico, mostrar todos disponíveis
      const finalList = responsibleProfessionals.length > 0 ? responsibleProfessionals : availableProfessionals;
      console.log("Profissionais filtrados para o serviço:", finalList.length);
      return finalList;
    }
    
    // Se não tem profissional responsável, mostrar todos disponíveis
    console.log("Profissionais filtrados para o serviço:", availableProfessionals.length);
    return availableProfessionals;
  }, [selectedServiceId, availableProfessionals, services]);

  const availableTimes = () => {
    if (!selectedProfessionalId || !selectedDate || !company) {
      console.log("❌ availableTimes: Missing required data", { 
        selectedProfessionalId: !!selectedProfessionalId, 
        selectedDate: !!selectedDate, 
        company: !!company 
      });
      return [];
    }
    
    const businessHours = company.business_hours;
    if (!businessHours) {
      console.log("❌ availableTimes: No business hours defined");
      return [];
    }

    const date = selectedDate;
    const weekday = date.getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[weekday];

    const daySchedule = businessHours[dayName];
    if (!daySchedule || !daySchedule.isOpen) {
      console.log(`❌ availableTimes: ${dayName} is closed or undefined`, daySchedule);
      return [];
    }

    console.log(`📅 availableTimes: Processing ${dayName}`, { start: daySchedule.start, end: daySchedule.end });

    const availableSlots: string[] = [];
    const start = daySchedule.start;
    const end = daySchedule.end;
    const appointmentDateStr = format(selectedDate, "yyyy-MM-dd");

    // Buscar TODOS os agendamentos da data (não apenas do profissional selecionado)
    const allDayAppointments = appointments.filter(apt => 
      apt.appointment_date === appointmentDateStr &&
      ["confirmed", "scheduled", "pending"].includes(apt.status)
    );

    console.log(`📋 All appointments for ${appointmentDateStr}:`, allDayAppointments.length);

    let currentTime = start;
    let iterations = 0;
    const maxIterations = 30; // Máximo 30 slots para segurança

    while (currentTime < end && iterations < maxIterations) {
      // Verificar se o profissional selecionado está ocupado neste horário
      const isSelectedProfessionalOccupied = allDayAppointments.some(apt => 
        apt.professional_id === selectedProfessionalId &&
        apt.appointment_time === currentTime
      );

      // Só mostrar horários onde o profissional selecionado está realmente disponível
      if (!isSelectedProfessionalOccupied) {
        availableSlots.push(currentTime);
        console.log(`✅ Time ${currentTime}: Available for selected professional`);
      } else {
        console.log(`❌ Time ${currentTime}: Selected professional is occupied`);
      }

      // Incrementar 30 minutos
      const [hours, minutes] = currentTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + 30;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
      
      iterations++;
    }

    console.log(`✅ Final available slots for ${dayName} ${appointmentDateStr}:`, availableSlots);
    console.log(`📊 Summary: ${availableSlots.length} available out of ${iterations} total slots`);
    
    return availableSlots;
  };

  useEffect(() => {
    // Resetar horário quando serviço muda (mas manter a data)
    if (selectedServiceId && selectedTime) {
      setSelectedTime(undefined);
    }
  }, [selectedServiceId]);

  useEffect(() => {
    // Resetar horário quando profissional muda (mas manter a data)
    if (selectedProfessionalId && selectedTime) {
      setSelectedTime(undefined);
    }
  }, [selectedProfessionalId]);

  // Forçar atualização dos horários quando os agendamentos mudarem
  useEffect(() => {
    if (selectedTime && selectedProfessionalId && selectedDate) {
      const appointmentDateStr = format(selectedDate, "yyyy-MM-dd");
      const isTimeStillAvailable = !appointments.some(apt => 
        apt.appointment_date === appointmentDateStr &&
        apt.appointment_time === selectedTime &&
        apt.professional_id === selectedProfessionalId &&
        ["confirmed", "scheduled", "pending"].includes(apt.status)
      );
      
      // Se o horário selecionado não está mais disponível, resetar
      if (!isTimeStillAvailable) {
        console.log(`🔄 Horário ${selectedTime} não está mais disponível, resetando...`);
        setSelectedTime(undefined);
        toast.info("O horário selecionado foi ocupado por outro cliente. Por favor, escolha outro horário.");
      }
    }
  }, [appointments, selectedTime, selectedProfessionalId, selectedDate]);

  // Garantir que submitting seja resetado se o componente for desmontado
  useEffect(() => {
    return () => {
      setSubmitting(false);
    };
  }, []);

  // Resetar submitting se houver mudanças críticas nos dados
  useEffect(() => {
    if (submitting && (!company || !selectedServiceId || !selectedProfessionalId)) {
      console.log("🔄 Resetando submitting devido a dados faltando");
      setSubmitting(false);
    }
  }, [company, selectedServiceId, selectedProfessionalId, submitting]);

  function validate() {
    const validation = validateAppointment({
      clientName: fullName,
      clientPhone: whatsapp,
      serviceId: selectedServiceId,
      professionalId: selectedProfessionalId,
      date: selectedDate,
      time: selectedTime
    });

    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return false;
    }
    
    return true;
  }

  async function handleConfirm(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!validate()) return;
    if (!company) return toast.error("Dados da empresa não encontrados");

    setSubmitting(true);
    
    // Timeout de segurança para evitar travamentos
    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Timeout de segurança ativado - resetando submitting");
      setSubmitting(false);
      toast.error("A operação está demorando muito. Tente novamente.");
    }, 30000); // 30 segundos
    
    try {
      console.log("🚀 INICIANDO AGENDAMENTO");
      console.log("📋 Dados do formulário:", {
        fullName,
        whatsapp,
        email,
        selectedServiceId,
        selectedProfessionalId,
        selectedDate,
        selectedTime,
        notes
      });

      const selectedService = services.find((s) => s.id === selectedServiceId);
      const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);
      
      if (!selectedService) {
        throw new Error("Serviço não encontrado");
      }

      if (!selectedProfessional) {
        throw new Error("Profissional não encontrado");
      }

      // VERIFICAÇÃO CRÍTICA: Conferir se o horário ainda está disponível
      console.log("⏰ Verificando disponibilidade do horário...");
      const appointmentDateStr = format(selectedDate!, "yyyy-MM-dd");
      
      const { data: conflictingAppointments, error: conflictError } = await supabase
        .from("appointments")
        .select("id")
        .eq("company_id", company.id)
        .eq("professional_id", selectedProfessionalId!)
        .eq("appointment_date", appointmentDateStr)
        .eq("appointment_time", selectedTime!)
        .in("status", ["confirmed", "scheduled", "pending"]);

      if (conflictError) {
        console.error("❌ Erro ao verificar conflitos:", conflictError);
        throw new Error("Erro ao verificar disponibilidade do horário");
      }

      if (conflictingAppointments && conflictingAppointments.length > 0) {
        console.warn("⚠️ Horário já ocupado:", conflictingAppointments);
        throw new Error("Este horário não está mais disponível. Por favor, escolha outro horário.");
      }

      console.log("✅ Horário disponível confirmado");

      // ETAPA 1: Gerenciar cliente com retry
      console.log("\n📝 ETAPA 1: CRIANDO/BUSCANDO CLIENTE");
      let clientId: string | undefined;
      
      const phoneClean = whatsapp.trim();
      console.log("🔍 Buscando cliente existente com phone:", phoneClean);
      
      const { data: existingClients, error: searchError } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .eq("phone", phoneClean)
        .order("created_at", { ascending: false });

      if (searchError) {
        console.error("❌ Erro ao buscar cliente:", searchError);
        throw new Error(`Erro ao buscar cliente: ${searchError.message}`);
      }

      console.log("📊 Clientes encontrados:", existingClients?.length || 0);

      if (existingClients && existingClients.length > 0) {
        const existingClient = existingClients[0];
        console.log("✅ Cliente existente encontrado:", { id: existingClient.id, name: existingClient.name });
        clientId = existingClient.id;
        
        if (existingClients.length > 1) {
          console.warn(`⚠️ ${existingClients.length} clientes encontrados com telefone ${phoneClean}. Usando o mais recente.`);
        }
      } else {
        console.log("➕ Criando novo cliente...");
        const clientData = {
          name: fullName.trim(),
          phone: phoneClean,
          email: email?.trim() || null,
        };
        
        // Validação adicional dos dados do cliente
        if (!clientData.name || clientData.name.length < 2) {
          throw new Error("Nome do cliente deve ter pelo menos 2 caracteres");
        }
        
        if (!clientData.phone || clientData.phone.length < 10) {
          throw new Error("Telefone deve ter pelo menos 10 dígitos");
        }
        
        console.log("📝 Criando cliente com dados:", { name: clientData.name, phone: clientData.phone, hasEmail: !!clientData.email });
        
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert(clientData)
          .select("id, name")
          .single();

        if (clientError) {
          console.error("❌ Erro ao criar cliente:", {
            message: clientError.message,
            details: clientError.details,
            hint: clientError.hint,
            code: clientError.code,
            clientData
          });
          
          // Retry uma vez se der erro de concorrência
          if (clientError.code === '23505') { // Unique constraint violation
            console.log("🔄 Tentando buscar cliente novamente após erro de concorrência...");
            const { data: retryClients, error: retryError } = await supabase
              .from("clients")
              .select("id, name")
              .eq("phone", phoneClean)
              .order("created_at", { ascending: false })
              .limit(1);
              
            if (retryError || !retryClients || retryClients.length === 0) {
              throw new Error("Erro ao criar/localizar cliente após conflito");
            }
            
            console.log("✅ Cliente encontrado após retry:", retryClients[0]);
            clientId = retryClients[0].id;
          } else {
            throw new Error(`Erro ao criar cliente: ${clientError.message}`);
          }
        } else {
          console.log("✅ Novo cliente criado:", newClient);
          clientId = newClient.id;
        }
      }

      if (!clientId) {
        throw new Error("Não foi possível obter ID do cliente");
      }

      console.log("✅ Cliente confirmado - ID:", clientId);

      // ETAPA 2: Criar agendamento com validação final
      console.log("\n📅 ETAPA 2: CRIANDO AGENDAMENTO");
      
      const appointmentData = {
        company_id: company.id,
        service_id: selectedServiceId!,
        professional_id: selectedProfessionalId!,
        client_id: clientId,
        appointment_date: appointmentDateStr,
        appointment_time: selectedTime!,
        notes: notes?.trim() || null,
        status: "pending",
        total_price: selectedService.price || 0,
        payment_method: "pending",
      };

      // Validação final dos dados
      const requiredFields = ['company_id', 'service_id', 'professional_id', 'client_id', 'appointment_date', 'appointment_time'];
      for (const field of requiredFields) {
        if (!appointmentData[field as keyof typeof appointmentData]) {
          throw new Error(`Campo obrigatório ausente: ${field}`);
        }
      }

      console.log("📋 Inserindo agendamento:", {
        company_id: appointmentData.company_id,
        service: selectedService.name,
        professional: selectedProfessional.name,
        date: appointmentData.appointment_date,
        time: appointmentData.appointment_time,
        client_id: appointmentData.client_id
      });

      // Verificação final de conflito antes da inserção
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from("appointments")
        .select("id")
        .eq("professional_id", selectedProfessionalId!)
        .eq("appointment_date", appointmentDateStr)
        .eq("appointment_time", selectedTime!)
        .in("status", ["confirmed", "scheduled", "pending"]);

      if (finalCheckError) {
        console.error("❌ Erro na verificação final:", finalCheckError);
        throw new Error("Erro na verificação final de disponibilidade");
      }

      if (finalCheck && finalCheck.length > 0) {
        throw new Error("Horário foi ocupado por outro cliente. Tente novamente com outro horário.");
      }

      const { data: appointmentResult, error: appointmentError } = await supabase
        .from("appointments")
        .insert([appointmentData])
        .select("id")
        .single();

      if (appointmentError) {
        console.error("❌ ERRO ao criar agendamento:", {
          message: appointmentError.message,
          details: appointmentError.details,
          hint: appointmentError.hint,
          code: appointmentError.code
        });
        
        // Se for erro de constraint única (horário já ocupado)
        if (appointmentError.code === '23505' && appointmentError.message.includes('appointments_professional_datetime_unique')) {
          throw new Error("Este horário acabou de ser ocupado por outro cliente. Por favor, escolha outro horário disponível.");
        }
        
        // Tratamento específico para erros comuns
        if (appointmentError.code === '23505') {
          throw new Error("Este horário foi ocupado por outro cliente. Escolha outro horário.");
        } else if (appointmentError.code === '23503') {
          throw new Error("Dados inválidos. Recarregue a página e tente novamente.");
        } else {
          throw new Error(`Erro ao criar agendamento: ${appointmentError.message}`);
        }
      }

      console.log("🎉 AGENDAMENTO CRIADO COM SUCESSO!", appointmentResult?.id);
      
      // Recarregar agendamentos para atualizar a interface imediatamente
      await reloadAppointments();

      // Salvar dados para futuro se solicitado
      if (saveForFuture) {
        try {
          localStorage.setItem("agendamento_form_v1", JSON.stringify({ fullName, whatsapp, email }));
        } catch (storageError) {
          console.warn("Erro ao salvar no localStorage:", storageError);
        }
      } else {
        try {
          localStorage.removeItem("agendamento_form_v1");
        } catch (storageError) {
          console.warn("Erro ao remover do localStorage:", storageError);
        }
      }

      toast.success(`🎉 Obrigado, ${fullName}! Seu agendamento foi realizado com sucesso.`);

      // Limpar formulário
      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes("");

      // Atualizar lista de agendamentos sem recarregar tudo
      try {
        console.log("🔄 Atualizando lista de agendamentos...");
        const { data: updatedAppointments, error: reloadError } = await supabase
          .from("appointments")
          .select("*")
          .eq("company_id", company.id)
          .in("status", ["confirmed", "scheduled", "pending"]);
        
        if (!reloadError && updatedAppointments) {
          setAppointments(updatedAppointments);
          console.log("✅ Lista de agendamentos atualizada");
        }
      } catch (reloadError) {
        console.warn("⚠️ Erro ao atualizar lista de agendamentos:", reloadError);
        // Não é crítico, continua normalmente
      }

    } catch (error) {
      console.error("❌ ERRO COMPLETO:", error);
      
      let errorMessage = 'Erro desconhecido. Tente novamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Stack:", error.stack);
      }
      
      // Mostrar mensagens mais amigáveis para erros comuns
      if (errorMessage.includes('JWT')) {
        errorMessage = 'Sessão expirada. Recarregue a página e tente novamente.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'A operação demorou muito. Tente novamente.';
      }
      
      toast.error(`Erro: ${errorMessage}`);
      
    } finally {
      // Limpar timeout de segurança
      clearTimeout(timeoutId);
      // Garantir que o estado seja sempre resetado
      setSubmitting(false);
      console.log("✅ Estado de submitting resetado");
    }
  }

  const phoneDigits = (company?.phone || "").replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}`
    : undefined;

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
        <div className="animate-pulse text-foreground">Carregando...</div>
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
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt={`Logo da ${company.name}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
            />
          )}
          <CardTitle className="text-center text-foreground">Agendar em {company.name}</CardTitle>
        </CardHeader>

        <CardContent>
          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href={whatsappUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--wa hover:scale-105"
              style={{ backgroundColor: "#25D366" }}
            >
              📱 WhatsApp
            </a>
            <a
              href={instagramUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--ig hover:scale-105"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #F58529, #FEDA77, #DD2A7B, #8134AF, #515BD4)",
              }}
            >
              📸 Instagram
            </a>
            <a
              href={emailUrl || "#"}
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--mail hover:scale-105"
              style={{ backgroundColor: "#4285F4" }}
            >
              ✉️ E-mail
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white transition-transform neo neo--maps hover:scale-105"
              style={{ backgroundColor: "#EA4335" }}
            >
              📍 Localização
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Section */}
      <GallerySection companyId={company.id} />

      {/* Form */}
      <form onSubmit={handleConfirm}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Dados do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <Label className="text-foreground">Nome completo *</Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-foreground">WhatsApp *</Label>
                <Input
                  placeholder="+55 11 9xxxx-xxxx"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-foreground">E-mail (opcional)</Label>
                <Input
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <Label className="text-foreground">Escolha o Serviço *</Label>
            <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum serviço disponível
                  </SelectItem>
                ) : (
                  services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - R$ {s.price} ({s.duration}min)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Label className="text-foreground mt-4">Profissional *</Label>
            <Select 
              value={selectedProfessionalId || ""} 
              onValueChange={(value) => {
                console.log("Profissional selecionado:", value);
                console.log("Profissionais disponíveis para seleção:", filteredProfessionals);
                setSelectedProfessionalId(value || undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    Carregando profissionais...
                  </SelectItem>
                ) : professionals.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum profissional cadastrado
                  </SelectItem>
                ) : availableProfessionals.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum profissional disponível (Total: {professionals.length})
                  </SelectItem>
                ) : filteredProfessionals.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum profissional para este serviço (Disponíveis: {availableProfessionals.length})
                  </SelectItem>
                ) : (
                  filteredProfessionals.map((p) => {
                    console.log("Renderizando profissional:", p.name, p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.specialty && `- ${p.specialty}`}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      disabled={!selectedProfessionalId}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const today = new Date();
                        const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        return normalizedDate < normalizedToday;
                      }}
                      initialFocus
                      className="pointer-events-auto rounded-md border bg-card"
                      classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground font-semibold",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                        head_cell: "text-muted-foreground font-medium text-sm w-9",
                        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={(v) => setSelectedTime(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProfessionalId && selectedDate ? (
                      availableTimes().length ? (
                        availableTimes().map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Sem horários disponíveis nesta data
                        </SelectItem>
                      )
                    ) : (
                      <SelectItem value="none" disabled>
                        Selecione profissional e data primeiro
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label className="mt-4">Observações</Label>
            <Textarea
              placeholder="Preferências ou observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center gap-2 mt-4">
              <Checkbox checked={saveForFuture} onCheckedChange={(v) => setSaveForFuture(Boolean(v))} />
              <span className="text-sm text-foreground">Salvar informações para futuros agendamentos</span>
            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Confirmando..." : "Confirmar Agendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Glow suave */}
      <style>{`
        .neo { transition: transform .2s ease, box-shadow .3s ease, filter .3s ease; }
        .neo--wa:hover   { box-shadow: 0 0 18px rgba(37,211,102,.45); }
        .neo--ig:hover   { box-shadow: 0 0 18px rgba(221,42,123,.45); }
        .neo--mail:hover { box-shadow: 0 0 18px rgba(66,133,244,.45); }
        .neo--maps:hover { box-shadow: 0 0 18px rgba(234,67,53,.45); }
      `}</style>
    </div>
  );
}
