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
import { GallerySection } from "@/components/GallerySection";
import { PaymentSection } from "@/components/PaymentSection";

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
  payment_status?: string | null;
  pix_payment_proof?: string | null;
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  const [pixProof, setPixProof] = useState<File | null>(null);
  const [pixProofUrl, setPixProofUrl] = useState<string>("");

  const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Estados para configurações de pagamento
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Função auxiliar para converter tempo em minutos (sem useCallback para evitar loops)
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Função auxiliar para converter minutos em tempo (sem useCallback para evitar loops)
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Função para verificar se um horário tem conflito com agendamentos existentes (sem useCallback)
  const hasTimeConflict = (startTime: string, duration: number, professionalId: string, dateStr: string): boolean => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + duration;

    // Buscar agendamentos do profissional na data
    const professionalAppointments = appointments.filter(apt => 
      apt.professional_id === professionalId &&
      apt.appointment_date === dateStr &&
      ["confirmed", "scheduled", "pending"].includes(apt.status)
    );

    // Verificar conflito com cada agendamento existente
    for (const apt of professionalAppointments) {
      const aptStartMinutes = timeToMinutes(apt.appointment_time);
      
      // Buscar duração do serviço do agendamento existente
      const existingService = services.find(s => s.id === apt.service_id);
      const existingDuration = existingService?.duration || 30; // Default 30 min se não encontrar
      const aptEndMinutes = aptStartMinutes + existingDuration;

      // Verificar sobreposição: novo serviço começa antes do existente terminar E termina depois do existente começar
      if (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes) {
        console.log(`❌ Conflict detected: ${startTime}-${minutesToTime(endMinutes)} conflicts with existing ${apt.appointment_time}-${minutesToTime(aptEndMinutes)}`);
        return true;
      }
    }

    return false;
  };

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
      console.log("🔍 Buscando empresa com slug:", slug);

      // Try to find company by slug - convert slug back to name for search
      const searchName = slug?.replace(/-/g, " ") || "";
      console.log("🔍 Nome de busca convertido:", searchName);
      
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", `%${searchName}%`);

      if (companyError) {
        console.error("❌ Erro ao buscar empresa:", companyError);
        toast.error(`Erro ao buscar empresa: ${companyError.message}`);
        return;
      }
      
      console.log("✅ Empresas encontradas:", companies?.length || 0);
      
      if (!companies || companies.length === 0) {
        console.warn("⚠️ Nenhuma empresa encontrada");
        toast.error("Empresa não encontrada");
        return;
      }

      // Find best match (exact name match preferred)
      let companyData = companies.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === slug?.toLowerCase()
      ) || companies[0];
      
      console.log("✅ Empresa selecionada:", companyData.name);
      setCompany(companyData);

      // Buscar serviços
      console.log("🔍 Buscando serviços para empresa ID:", companyData.id);
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("company_id", companyData.id);
      
      if (servicesError) {
        console.error("❌ Erro ao buscar serviços:", servicesError);
        toast.error(`Erro ao carregar serviços: ${servicesError.message}`);
        setServices([]);
      } else {
        console.log("✅ Serviços encontrados:", servicesData?.length || 0);
        setServices(servicesData || []);
      }

      // Buscar profissionais usando função pública
      console.log("🔍 Buscando profissionais para empresa ID:", companyData.id);
      
      try {
        // Usar função que ignora RLS para busca pública
        const { data: professionalsData, error: professionalsError } = await supabase
          .rpc("get_professionals_for_booking", { 
            company_uuid: companyData.id 
          });
        
        if (professionalsError) {
          console.error("❌ Erro ao buscar profissionais via RPC:", professionalsError);
          throw professionalsError;
        }
        
        console.log("✅ Profissionais encontrados via RPC:", professionalsData?.length || 0);
        setProfessionals(professionalsData || []);
        
      } catch (rpcError) {
        console.warn("⚠️ RPC falhou, tentando fallback direto:", rpcError);
        
        // Fallback para query direta se a função falhar
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("professionals")
          .select("*")
          .eq("company_id", companyData.id);
        
        if (fallbackError) {
          console.error("❌ Erro no fallback também:", fallbackError);
          toast.error(`Erro ao carregar profissionais: ${fallbackError.message}`);
          setProfessionals([]);
        } else {
          console.log("✅ Profissionais encontrados via fallback:", fallbackData?.length || 0);
          setProfessionals(fallbackData || []);
        }
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

      // Buscar configurações de pagamento da empresa
      const { data: settings, error: settingsError } = await supabase
        .rpc('get_or_create_company_settings', { company_uuid: companyData.id });
      
      if (settingsError) {
        console.error("Erro ao buscar configurações:", settingsError);
      } else if (settings && settings[0]) {
        console.log("Configurações encontradas:", settings[0]);
        setCompanySettings(settings[0]);
        
        // Auto-selecionar método de pagamento se só tiver uma opção
        const paymentMethods = settings[0].payment_methods || ["no_local"];
        if (paymentMethods.length === 1) {
          setSelectedPaymentMethod(paymentMethods[0]);
        }
      }
    } catch (error) {
      console.error("❌ ERRO CRÍTICO ao carregar dados da empresa:", error);
      
      let errorMessage = 'Erro desconhecido ao carregar dados';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Mostrar mensagens mais amigáveis para erros comuns
      if (errorMessage.includes('JWT') || errorMessage.includes('refresh_token')) {
        errorMessage = 'Sessão expirada. Recarregue a página.';
        window.location.reload();
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Problema de conexão. Verifique sua internet.';
      }
      
      toast.error(`❌ ${errorMessage}`);
      
      // Garantir que os estados sejam limpos mesmo com erro
      setServices([]);
      setProfessionals([]);
      setCompany(null);
      
    } finally {
      setLoading(false);
      console.log("🏁 Carregamento finalizado");
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

  // Recarregar agendamentos a cada 30 segundos quando há empresa selecionada
  useEffect(() => {
    if (!company?.id) return;
    
    const interval = setInterval(reloadAppointments, 30000);
    return () => clearInterval(interval);
  }, [company?.id, reloadAppointments]);

  // Filtrar profissionais disponíveis - simplificado sem memoização
  const availableProfessionals = professionals.filter(p => {
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

  // Filtrar profissionais com base no serviço selecionado - simplificado
  const filteredProfessionals = (() => {
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
      return responsibleProfessionals.length > 0 ? responsibleProfessionals : availableProfessionals;
    }
    
    // Se não tem profissional responsável, mostrar todos disponíveis
    return availableProfessionals;
  })();

  // Calcular horários disponíveis - simplificado sem useMemo
  const getAvailableTimes = () => {
    if (!selectedProfessionalId || !selectedDate || !company || !selectedServiceId) {
      return [];
    }

    // Buscar o serviço selecionado para obter a duração
    const selectedService = services.find(s => s.id === selectedServiceId);
    if (!selectedService) {
      return [];
    }

    const serviceDuration = selectedService.duration; // em minutos
    
    const businessHours = company.business_hours;
    if (!businessHours) {
      return [];
    }

    const date = selectedDate;
    const weekday = date.getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[weekday];

    const daySchedule = businessHours[dayName];
    if (!daySchedule || !daySchedule.isOpen) {
      return [];
    }

    const availableSlots: string[] = [];
    const start = daySchedule.start;
    const end = daySchedule.end;
    const appointmentDateStr = format(selectedDate, "yyyy-MM-dd");

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    // Gerar slots em intervalos de 30 minutos
    let currentMinutes = startMinutes;
    let iterations = 0;
    const maxIterations = 50; // Reduzido para melhor performance

    while (currentMinutes <= endMinutes - serviceDuration && iterations < maxIterations) {
      const currentTimeStr = minutesToTime(currentMinutes);

      // Verificar se o horário termina dentro do expediente
      if (currentMinutes + serviceDuration <= endMinutes) {
        // Verificar se há conflito com agendamentos existentes
        const hasConflict = hasTimeConflict(currentTimeStr, serviceDuration, selectedProfessionalId, appointmentDateStr);

        if (!hasConflict) {
          availableSlots.push(currentTimeStr);
        }
      }

      // Incrementar 30 minutos para melhor performance
      currentMinutes += 30;
      iterations++;
    }
    
    return availableSlots;
  };

  const availableTimes = getAvailableTimes();

  // Resetar horário quando serviço ou profissional muda - simplificado
  useEffect(() => {
    setSelectedTime(undefined);
  }, [selectedServiceId, selectedProfessionalId]);

  // Verificar disponibilidade do horário selecionado - removido debounce desnecessário
  useEffect(() => {
    if (selectedTime && selectedProfessionalId && selectedDate && selectedServiceId && appointments.length > 0) {
      const appointmentDateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Buscar o serviço selecionado para obter a duração
      const selectedService = services.find(s => s.id === selectedServiceId);
      if (!selectedService) {
        return;
      }

      const serviceDuration = selectedService.duration;
      const hasConflict = hasTimeConflict(selectedTime, serviceDuration, selectedProfessionalId, appointmentDateStr);
      
      if (hasConflict) {
        setSelectedTime(undefined);
        toast.error("⏰ Horário não disponível! Este horário conflita com outro agendamento. Por favor, escolha outro horário disponível.");
      }
    }
  }, [selectedTime, selectedProfessionalId, selectedDate, selectedServiceId, appointments, services]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (submitting) {
      console.log("⚠️ Já está submetendo, ignorando...");
      return;
    }

    if (!validate()) {
      return;
    }

    // Validar método de pagamento
    if (!selectedPaymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    // Se PIX foi selecionado, verificar se há chave PIX configurada
    if (selectedPaymentMethod === 'pix' && !companySettings?.pix_key) {
      toast.error("PIX não disponível. A empresa ainda não configurou a chave PIX.");
      return;
    }

    if (!company?.id) {
      toast.error("Dados da empresa não encontrados");
      return;
    }

    // Timeout de segurança para resetar submitting
    const timeoutId = setTimeout(() => {
      console.log("🕒 Timeout atingido, resetando submitting");
      setSubmitting(false);
    }, 15000); // 15 segundos

    try {
      setSubmitting(true);
      console.log("🚀 Iniciando processo de agendamento...");

      // Verificar novamente a disponibilidade antes de agendar
      if (selectedTime && selectedProfessionalId && selectedDate && selectedServiceId) {
        const appointmentDateStr = format(selectedDate, "yyyy-MM-dd");
        const selectedService = services.find(s => s.id === selectedServiceId);
        
        if (selectedService) {
          const serviceDuration = selectedService.duration;
          const hasConflict = hasTimeConflict(selectedTime, serviceDuration, selectedProfessionalId, appointmentDateStr);
          
          if (hasConflict) {
            toast.error("⏰ Este horário acabou de ser ocupado. Por favor, escolha outro horário.");
            setSelectedTime(undefined);
            return;
          }
        }
      }

      // Criar ou buscar cliente
      let clientId: string;
      let pixProofPath: string | null = null;

      // Upload do comprovante PIX se necessário
      if (pixProof && selectedPaymentMethod === 'pix') {
        console.log("📤 Fazendo upload do comprovante...");
        
        // Validar tamanho do arquivo (máximo 10MB)
        if (pixProof.size > 10 * 1024 * 1024) {
          toast.error("Arquivo muito grande. Máximo permitido: 10MB");
          return;
        }
        
        // Validar tipo do arquivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(pixProof.type)) {
          toast.error("Tipo de arquivo não permitido. Use imagens (JPEG, PNG, WEBP) ou PDF.");
          return;
        }
        
        const fileExt = pixProof.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `pix-proofs/${fileName}`;

        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('gallery')
            .upload(filePath, pixProof, {
              upsert: true
            });

          if (uploadError) {
            console.error('Erro ao fazer upload do comprovante:', uploadError);
            toast.error(`Erro ao fazer upload: ${uploadError.message}`);
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('gallery')
            .getPublicUrl(filePath);

          pixProofPath = publicUrl;
          console.log("✅ Comprovante carregado:", pixProofPath);
          
        } catch (error) {
          console.error('Erro inesperado no upload:', error);
          toast.error("Erro inesperado ao fazer upload. Tente novamente.");
          return;
        }
      }

      // Se PIX foi selecionado mas não há URL do comprovante da seção de pagamento, usar do pixProofUrl
      if (selectedPaymentMethod === 'pix' && !pixProofPath && pixProofUrl) {
        pixProofPath = pixProofUrl;
      }

      const { data: existingClient, error: clientSearchError } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", whatsapp)
        .single();

      if (clientSearchError && clientSearchError.code !== "PGRST116") {
        throw new Error(`Erro ao buscar cliente: ${clientSearchError.message}`);
      }

      if (existingClient) {
        clientId = existingClient.id;
        console.log("✅ Cliente existente encontrado:", clientId);

        // Atualizar informações do cliente se necessário
        await supabase
          .from("clients")
          .update({ 
            name: fullName,
            email: email || null
          })
          .eq("id", clientId);
      } else {
        console.log("👤 Criando novo cliente...");
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: fullName,
            phone: whatsapp,
            email: email || null
          })
          .select("id")
          .single();

        if (clientError) {
          throw new Error(`Erro ao criar cliente: ${clientError.message}`);
        }

        if (!newClient?.id) {
          throw new Error("Cliente criado mas ID não retornado");
        }

        clientId = newClient.id;
        console.log("✅ Cliente criado:", clientId);
      }

      // Criar agendamento
      const appointmentData: Appointment = {
        company_id: company.id,
        client_id: clientId,
        service_id: selectedServiceId!,
        professional_id: selectedProfessionalId!,
        appointment_date: format(selectedDate!, "yyyy-MM-dd"),
        appointment_time: selectedTime!,
        status: 'scheduled', // Será atualizado pelo trigger conforme regras de negócio
        notes: notes.trim() || null,
        total_price: services.find(s => s.id === selectedServiceId)?.price || null,
        payment_method: selectedPaymentMethod,
        pix_payment_proof: pixProofPath
        // payment_status será definido pelo trigger automaticamente
      };

      console.log("📝 Dados do agendamento:", appointmentData);

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert([appointmentData]);

      if (appointmentError) {
        console.error("❌ Erro ao criar agendamento:", appointmentError);
        
        // Verificar se é erro de unique constraint (horário ocupado)
        if (appointmentError.code === '23505') {
          toast.error("⏰ Horário não disponível! Este horário acabou de ser ocupado por outro cliente. Por favor, escolha outro horário disponível.");
          return;
        } else if (appointmentError.code === '23503') {
          throw new Error("Dados inválidos. Recarregue a página e tente novamente.");
        } else {
          throw appointmentError;
        }
      }

      console.log("✅ Agendamento criado com sucesso");
      
      // Enviar email de confirmação se o cliente tiver email
      if (email && email.trim()) {
        try {
          console.log("🚀 Iniciando envio de email de confirmação...");
          
          const selectedService = services.find(s => s.id === selectedServiceId);
          const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);
          
          const emailData = {
            clientName: fullName,
            clientEmail: email.trim(),
            companyName: company.name,
            serviceName: selectedService?.name || 'Serviço',
            professionalName: selectedProfessional?.name || 'Profissional',
            appointmentDate: format(selectedDate!, "yyyy-MM-dd"),
            appointmentTime: selectedTime!,
            totalPrice: selectedService?.price,
            paymentMethod: selectedPaymentMethod,
            companyPhone: company.phone,
            notes: notes.trim() || undefined,
          };
          
          console.log("📧 Dados do email:", emailData);
          
          const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-appointment-confirmation', {
            body: emailData
          });
          
          if (emailError) {
            console.error("❌ Erro na resposta da edge function:", emailError);
            throw emailError;
          }
          
          console.log("✅ Email de confirmação enviado com sucesso:", emailResponse);
        } catch (emailError) {
          console.error("❌ Erro ao enviar email de confirmação:", emailError);
          console.error("❌ Detalhes do erro:", {
            message: emailError?.message,
            details: emailError?.details,
            hint: emailError?.hint,
            code: emailError?.code
          });
          // Não interrompe o fluxo se o email falhar
          toast.warning("Agendamento criado com sucesso, mas houve um problema ao enviar o email de confirmação.");
        }
      } else {
        console.log("⏭️ Pulando envio de email - email não fornecido");
      }
      
      // Recarregar agendamentos
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

      // Mensagem de sucesso baseada no tipo de pagamento
      let successMessage = '';
      if (selectedPaymentMethod === 'pix' && pixProofPath) {
        successMessage = `🎉 Obrigado, ${fullName}! Seu comprovante PIX foi enviado com sucesso. Seu agendamento será confirmado após validação do pagamento.`;
      } else if (selectedPaymentMethod === 'pix' && !pixProofPath) {
        successMessage = `🎉 Obrigado, ${fullName}! Seu agendamento foi registrado. A empresa entrará em contato para confirmar o pagamento PIX.`;
      } else if (selectedPaymentMethod === 'no_local') {
        successMessage = `🎉 Obrigado, ${fullName}! Seu agendamento foi confirmado com sucesso. Pagamento será realizado no local.`;
      } else {
        successMessage = `🎉 Obrigado, ${fullName}! Seu agendamento foi confirmado com sucesso.`;
      }
      
      toast.success(successMessage);

      // Limpar formulário após sucesso
      setFullName("");
      setWhatsapp("");
      setEmail("");
      setNotes("");
      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setSelectedPaymentMethod(undefined);
      setPixProof(null);
      setPixProofUrl("");

    } catch (error: any) {
      console.error("❌ Erro no agendamento:", error);
      
      let errorMessage = 'Erro ao processar agendamento';
      
      if (error instanceof Error) {
        errorMessage = error.message;
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
                backgroundImage: "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)"
              }}
            >
              📸 Instagram
            </a>
            <a
              href={emailUrl || "#"}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold transition-transform neo neo--mail hover:scale-105"
            >
              📧 E-mail
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold transition-transform neo neo--maps hover:scale-105"
            >
              📍 Localização
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Galeria */}
      <GallerySection companyId={company.id} />

      {/* Formulário de agendamento */}
      <form onSubmit={submit}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Agendar Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground">Nome completo *</Label>
                <Input
                  placeholder="Seu nome completo"
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

            {/* Informação sobre o serviço selecionado */}
            {selectedServiceId && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Serviço selecionado:</strong> {services.find(s => s.id === selectedServiceId)?.name}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  ⏱️ <strong>Duração:</strong> {services.find(s => s.id === selectedServiceId)?.duration} minutos
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  💰 <strong>Preço:</strong> R$ {services.find(s => s.id === selectedServiceId)?.price}
                </div>
              </div>
            )}

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
                setSelectedProfessionalId(value || undefined);
              }}
              disabled={!selectedServiceId || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedServiceId 
                    ? "Primeiro selecione um serviço" 
                    : loading 
                      ? "Carregando..." 
                      : "Selecione um profissional"
                } />
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
                    Nenhum profissional disponível
                  </SelectItem>
                ) : filteredProfessionals.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum profissional para este serviço
                  </SelectItem>
                ) : (
                  filteredProfessionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.specialty && `- ${p.specialty}`}
                    </SelectItem>
                  ))
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
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Horário *</Label>
                <Select 
                  value={selectedTime || ""} 
                  onValueChange={(v) => setSelectedTime(v || undefined)}
                  disabled={!selectedProfessionalId || !selectedDate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione horário" />
                  </SelectTrigger>
                   <SelectContent>
                     {selectedProfessionalId && selectedDate ? (
                       availableTimes.length ? (
                         availableTimes.map((t) => (
                           <SelectItem key={t} value={t}>
                             {t}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="none" disabled>
                           🚫 Todos os horários estão ocupados nesta data
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

            {/* Seção de Pagamento */}
            {companySettings?.payment_methods && companySettings.payment_methods.length > 0 && (
              <PaymentSection
                companySettings={companySettings}
                selectedPaymentMethod={selectedPaymentMethod}
                onPaymentMethodChange={setSelectedPaymentMethod}
                onProofUploaded={setPixProofUrl}
              />
            )}

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

            {/* Informação sobre duração dos serviços */}
            {selectedServiceId && selectedProfessionalId && selectedDate && selectedTime && selectedPaymentMethod && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
                <div className="text-sm text-green-800 dark:text-green-200">
                  <strong>📅 Resumo do agendamento:</strong>
                </div>
                <div className="text-sm text-green-600 dark:text-green-300 mt-1">
                  • <strong>Serviço:</strong> {services.find(s => s.id === selectedServiceId)?.name} ({services.find(s => s.id === selectedServiceId)?.duration}min)
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  • <strong>Profissional:</strong> {professionals.find(p => p.id === selectedProfessionalId)?.name}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  • <strong>Data/Hora:</strong> {format(selectedDate, "PPP", { locale: ptBR })} às {selectedTime}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  • <strong>Valor:</strong> R$ {(services.find(s => s.id === selectedServiceId)?.price || 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  • <strong>Pagamento:</strong> {selectedPaymentMethod === 'pix' ? '💳 PIX' : '💰 No Local'}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  • <strong>Término previsto:</strong> {(() => {
                    const [hours, minutes] = selectedTime.split(":").map(Number);
                    const totalMinutes = hours * 60 + minutes + (services.find(s => s.id === selectedServiceId)?.duration || 0);
                    const endHours = Math.floor(totalMinutes / 60);
                    const endMins = totalMinutes % 60;
                    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
                  })()}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button 
                type="submit" 
                disabled={
                  submitting || 
                  !selectedServiceId || 
                  !selectedProfessionalId || 
                  !selectedDate || 
                  !selectedTime || 
                  !selectedPaymentMethod
                }
              >
                {submitting ? "Processando..." : "Confirmar Agendamento"}
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