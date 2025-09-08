// AgendarServico.tsx
import { useEffect, useState } from "react";
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

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  professional_services?: { professional_id: string }[];
};

type Professional = {
  id: string;
  name: string;
  specialty?: string;
  services?: string[];
  business_hours?: any;
};

type Appointment = {
  id: string;
  professional_id: string;
  service_id: string;
  full_name: string;
  whatsapp: string;
  email?: string | null;
  company_id: string;
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
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saveForFuture, setSaveForFuture] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const { createAppointment, getUserByPhone } = useSupabaseOperations();

  // Use availability hook
  const {
    availability: displayTimeSlots,
    loading: availabilityLoading,
    getAvailabilityByProfessional
  } = useAvailability({
    companyId: company?.id,
    professionalId: selectedProfessionalId,
    serviceId: selectedServiceId,
    date: selectedDate,
    businessHours: company?.business_hours,
    existingAppointments: appointments
  });

  useEffect(() => {
    if (!slug) return;

    const fetchCompanyData = async () => {
      try {
        setLoading(true);

        // Buscar empresa por slug
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("slug", slug)
          .single();

        if (companyError) {
          console.error("Erro ao buscar empresa:", companyError);
          toast.error("Empresa não encontrada");
          return;
        }

        setCompany(companyData);

        // Buscar serviços da empresa
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select(`
            *,
            professional_services (
              professional_id
            )
          `)
          .eq("company_id", companyData.id);

        if (servicesError) {
          console.error("Erro ao buscar serviços:", servicesError);
        } else {
          setServices(servicesData || []);
        }

        // Buscar profissionais da empresa
        const { data: professionalsData, error: professionalsError } = await supabase
          .from("professionals")
          .select("*")
          .eq("company_id", companyData.id);

        if (professionalsError) {
          console.error("Erro ao buscar profissionais:", professionalsError);
        } else {
          setProfessionals(professionalsData || []);
        }

        // Buscar agendamentos existentes
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from("appointments")
          .select("*")
          .eq("company_id", companyData.id)
          .in("status", ["confirmed", "pending"]);

        if (appointmentsError) {
          console.error("Erro ao buscar agendamentos:", appointmentsError);
        } else {
          setAppointments(appointmentsData || []);
        }

      } catch (error) {
        console.error("Erro geral:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [slug]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company || !selectedServiceId || !selectedProfessionalId || !selectedDate || !selectedTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const validation = validateAppointment({
      fullName,
      whatsapp,
      email,
      selectedServiceId,
      selectedProfessionalId,
      selectedDate,
      selectedTime,
      services
    });

    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    try {
      setSubmitting(true);

      // Verificar se já existe um usuário com este WhatsApp
      let existingUser = null;
      if (whatsapp) {
        existingUser = await getUserByPhone(whatsapp);
      }

      const selectedService = services.find(s => s.id === selectedServiceId);
      if (!selectedService) {
        toast.error("Serviço não encontrado");
        return;
      }

      const appointmentData = {
        company_id: company.id,
        professional_id: selectedProfessionalId,
        service_id: selectedServiceId,
        full_name: fullName,
        whatsapp,
        email: email || null,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: selectedTime,
        notes: notes || null,
        total_price: parseFloat(selectedService.price),
        client_id: existingUser?.id || null,
        status: "confirmed"
      };

      const result = await createAppointment(appointmentData);

      if (result.success) {
        toast.success("Agendamento confirmado com sucesso!");

        // Reset form
        setFullName("");
        setWhatsapp("");
        setEmail("");
        setSelectedServiceId(undefined);
        setSelectedProfessionalId(undefined);
        setSelectedDate(undefined);
        setSelectedTime("");
        setNotes("");
        setSaveForFuture(false);

        // Refresh appointments
        const { data: updatedAppointments } = await supabase
          .from("appointments")
          .select("*")
          .eq("company_id", company.id)
          .in("status", ["confirmed", "pending"]);

        if (updatedAppointments) {
          setAppointments(updatedAppointments);
        }
      } else {
        toast.error(result.message || "Erro ao confirmar agendamento");
      }
    } catch (error) {
      console.error("Erro ao confirmar agendamento:", error);
      toast.error("Erro inesperado ao confirmar agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  // Get available professionals (those with business hours configured)
  const availableProfessionals = professionals.filter(prof =>
    prof.business_hours &&
    Object.keys(prof.business_hours).length > 0
  );

  console.log("Profissionais disponíveis:", availableProfessionals);

  // Filter professionals by selected service
  const filteredProfessionals = selectedServiceId
    ? availableProfessionals.filter(prof => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        if (!selectedService?.professional_services) return true;

        const serviceProfessionals = selectedService.professional_services.map(ps => ps.professional_id);
        return serviceProfessionals.length === 0 || serviceProfessionals.includes(prof.id);
      })
    : availableProfessionals;

  console.log("Profissionais filtrados para o serviço:", filteredProfessionals);

  // Construir endereço e link do Maps
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

      {/* Company Info Card */}
      <Card className="mb-4 bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={`Logo da ${company.name}`}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl">{company.name.charAt(0)}</span>
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground mb-1">{company.name}</h1>
              <p className="text-sm text-muted-foreground mb-2">
                {[company.address, company.number, company.neighborhood, company.city, company.state]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              
              <div className="flex items-center gap-3">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/55${company.phone?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo neo--wa inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                >
                  📱 WhatsApp
                </a>

                {/* Instagram */}
                {company.instagram && (
                  <a
                    href={company.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neo neo--ig inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    📸 Instagram
                  </a>
                )}

                {/* Email */}
                <a
                  href={`mailto:${company.email}`}
                  className="neo neo--mail inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ✉️ E-mail
                </a>

                {/* Google Maps */}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo neo--maps inline-flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  🗺️ Ver no Maps
                </a>
              </div>
            </div>
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
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário *
                {availabilityLoading && <span className="text-xs text-muted-foreground">(carregando...)</span>}
              </Label>
              
              {selectedProfessionalId && selectedDate ? (
                displayTimeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {displayTimeSlots.map((slot) => {
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
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Selecione profissional e data primeiro</p>
                </div>
              )}
            </div>

            {/* Informações do Serviço Selecionado */}
            {selectedServiceId && (
              <Card className="bg-accent/50 mt-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {services.find(s => s.id === selectedServiceId)?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duração: {services.find(s => s.id === selectedServiceId)?.duration} minutos
                      </p>
                    </div>
                    <div className="ml-auto">
                      <Badge variant="secondary">
                        R$ {services.find(s => s.id === selectedServiceId)?.price}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disponibilidade Geral (quando nenhum profissional específico selecionado) */}
            {selectedDate && selectedServiceId && !selectedProfessionalId && company && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Disponibilidade por Profissional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const professionalAvailability = getAvailabilityByProfessional(company.business_hours);
                    const availableProfessionals = Object.keys(professionalAvailability).filter(
                      profId => professionalAvailability[profId].some(slot => slot.isAvailable)
                    );

                    if (availableProfessionals.length === 0) {
                      return (
                        <div className="text-center py-6 text-muted-foreground">
                          <XCircle className="w-8 h-8 mx-auto mb-2" />
                          <p>Nenhum profissional disponível nesta data</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {availableProfessionals.map(profId => {
                          const professional = professionals.find(p => p.id === profId);
                          const slots = professionalAvailability[profId].filter(slot => slot.isAvailable);
                          
                          if (!professional || slots.length === 0) return null;

                          return (
                            <div key={profId} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{professional.name}</h4>
                                <Badge variant="outline">{slots.length} horários</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {slots.slice(0, 6).map(slot => (
                                  <Button
                                    key={slot.time}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProfessionalId(profId);
                                      setSelectedTime(slot.time);
                                    }}
                                    className="text-xs h-7"
                                  >
                                    {slot.time}
                                  </Button>
                                ))}
                                {slots.length > 6 && (
                                  <span className="text-xs text-muted-foreground self-center">
                                    +{slots.length - 6} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
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

            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Confirmando..." : "Confirmar Agendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Galeria da empresa */}
      {company && <GallerySection companyId={company.id} />}

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
