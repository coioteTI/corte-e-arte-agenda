// AgendarServico.tsx
import { useEffect, useState, useMemo } from "react";
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
import { CalendarIcon, Clock, Users, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { validateAppointment } from "@/utils/validation";
import { useSupabaseOperations } from "@/hooks/useSupabaseOperations";
import { GallerySection } from "@/components/GallerySection";
import { useAvailability } from "@/hooks/useAvailability";
import { Badge } from "@/components/ui/badge";

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

type Professional = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  is_available: boolean;
  company_id?: string;
  created_at?: string;
};

type Service = {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  company_id?: string;
  is_promotion?: boolean;
  promotional_price?: number;
  promotion_valid_until?: string;
  professional_responsible?: string;
  created_at?: string;
};

type Appointment = {
  id: string;
  company_id: string;
  professional_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  client_id?: string;
  full_name?: string;
  whatsapp?: string;
  email?: string;
  total_price?: number;
  notes?: string;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
};

export default function AgendarServico() {
  const { slug } = useParams();
  const companyId = slug; // Use slug as companyId
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saveForFuture, setSaveForFuture] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const { insertData } = useSupabaseOperations();

  // Use availability hook
  const {
    loading: availabilityLoading,
    getAvailableTimeSlots,
    isTimeSlotAvailable
  } = useAvailability(
    company?.id,
    selectedDate,
    selectedServiceId,
    professionals,
    services
  );

  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    if (!company?.business_hours || !selectedDate || !selectedServiceId) return [];
    
    return getAvailableTimeSlots(company.business_hours);
  }, [getAvailableTimeSlots, company?.business_hours, selectedDate, selectedServiceId]);

  // Load company data
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast.error("Empresa não encontrada");
          return;
        }
        
        setCompany(data);
      } catch (error) {
        console.error("Erro ao carregar empresa:", error);
        toast.error("Erro ao carregar dados da empresa");
      }
    };

    loadCompany();
  }, [companyId]);

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from("services")
          .select('*')
          .eq("company_id", companyId);

        if (error) throw error;
        setServices((data || []).map(service => ({
          ...service,
          price: typeof service.price === 'string' ? parseFloat(service.price) : service.price
        })));
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        toast.error("Erro ao carregar serviços");
      }
    };

    loadServices();
  }, [companyId]);

  // Load professionals
  useEffect(() => {
    const loadProfessionals = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from("professionals")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_available", true);

        if (error) throw error;
        setProfessionals(data || []);
      } catch (error) {
        console.error("Erro ao carregar profissionais:", error);
        toast.error("Erro ao carregar profissionais");
      }
    };

    loadProfessionals();
  }, [companyId]);

  // Load appointments when date changes
  useEffect(() => {
    const loadAppointments = async () => {
      if (!companyId || !selectedDate) {
        setAppointments([]);
        return;
      }

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("company_id", companyId)
          .eq("appointment_date", dateStr)
          .in("status", ["confirmed", "scheduled", "pending"]);

        if (error) throw error;
        setAppointments(data || []);
      } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [companyId, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServiceId || !selectedProfessionalId || !selectedDate || !selectedTime || !fullName || !whatsapp) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const validation = validateAppointment({
      clientName: fullName,
      clientPhone: whatsapp,
      serviceId: selectedServiceId,
      professionalId: selectedProfessionalId,
      date: selectedDate,
      time: selectedTime,
    });

    if (!validation.isValid) {
      toast.error(validation.errors[0] || 'Dados inválidos');
      return;
    }

    try {
      setSubmitting(true);

      // Check availability one more time
      const selectedService = services.find(s => s.id === selectedServiceId);
      if (!selectedService) {
        toast.error("Serviço não encontrado");
        return;
      }

      const availabilityCheck = isTimeSlotAvailable(
        selectedTime,
        selectedProfessionalId,
        selectedService.duration
      );

      if (!availabilityCheck.isAvailable) {
        toast.error(availabilityCheck.conflictReason || "Horário não disponível");
        return;
      }

      // Check for existing client
      let existingClient = null;
      if (whatsapp) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('phone', whatsapp)
          .single();
        
        existingClient = clientData;
      }

      // Create appointment data
      const appointmentData = {
        company_id: companyId,
        professional_id: selectedProfessionalId,
        service_id: selectedServiceId,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: selectedTime,
        total_price: selectedService.price,
        client_id: existingClient?.id || null,
        status: "confirmed",
        notes: notes || null,
        payment_method: null
      };

      const result = await insertData('appointments', appointmentData, 'Agendamento criado com sucesso!');

      if (result.success) {
        // Reset form
        setSelectedServiceId("");
        setSelectedProfessionalId("");
        setSelectedDate(undefined);
        setSelectedTime("");
        setFullName("");
        setWhatsapp("");
        setEmail("");
        setNotes("");

        // Reload appointments
        if (selectedDate) {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const { data } = await supabase
            .from("appointments")
            .select("*")
            .eq("company_id", companyId)
            .eq("appointment_date", dateStr)
            .in("status", ["confirmed", "scheduled", "pending"]);

          setAppointments(data || []);
        }
      }
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const selectedService = services.find(s => s.id === selectedServiceId);
  const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-primary/5">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
              <p className="text-sm text-muted-foreground">
                {company.neighborhood}, {company.city} - {company.state}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarIcon className="w-5 h-5" />
                Agendar Serviço
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    Serviço *
                  </Label>
                  <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex justify-between items-center w-full">
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {service.duration} min
                              </p>
                            </div>
                            <span className="font-bold text-primary">
                              R$ {service.price.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Professional Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Profissional *
                  </Label>
                  <Select
                    value={selectedProfessionalId}
                    onValueChange={setSelectedProfessionalId}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem key={professional.id} value={professional.id}>
                          <div>
                            <p className="font-medium">{professional.name}</p>
                            {professional.specialty && (
                              <p className="text-xs text-muted-foreground">
                                {professional.specialty}
                              </p>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Data *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horário *
                    {availabilityLoading && <span className="text-xs text-muted-foreground">(carregando...)</span>}
                  </Label>
                  
                  {selectedProfessionalId && selectedDate ? (
                    availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                        {availableTimeSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <Button
                              key={slot.time}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTime(slot.time)}
                              disabled={!slot.isAvailable}
                              className={cn(
                                "text-xs flex flex-col gap-1 h-auto py-2",
                                slot.isAvailable 
                                  ? "hover:bg-primary/10 border-primary/20" 
                                  : "opacity-50 cursor-not-allowed bg-muted"
                              )}
                            >
                              <span className="font-medium">{slot.time}</span>
                              {slot.isAvailable ? (
                                <Badge variant="secondary" className="text-xs px-1">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Disponível
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs px-1">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Ocupado
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum horário disponível</p>
                        <p className="text-xs">Tente outra data ou profissional</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Selecione um profissional e uma data primeiro
                    </div>
                  )}
                </div>

                {/* Client Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Digite seu nome completo"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma observação especial..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Summary */}
                {selectedService && selectedProfessional && selectedDate && selectedTime && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-2">Resumo do Agendamento</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Serviço:</strong> {selectedService.name}</p>
                        <p><strong>Profissional:</strong> {selectedProfessional.name}</p>
                        <p><strong>Data:</strong> {format(selectedDate, "PPP", { locale: ptBR })}</p>
                        <p><strong>Horário:</strong> {selectedTime}</p>
                        <p><strong>Duração:</strong> {selectedService.duration} minutos</p>
                        <p><strong>Valor:</strong> R$ {selectedService.price.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !selectedServiceId || !selectedProfessionalId || !selectedDate || !selectedTime || !fullName || !whatsapp}
                >
                  {submitting ? "Agendando..." : "Confirmar Agendamento"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Gallery Section */}
          <div>
            <GallerySection companyId={company.id} />
          </div>
        </div>
      </div>
    </div>
  );
}