// AgendarServico.tsx
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
    const saved = localStorage.getItem("clientData");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save client data to localStorage and DB
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
        await supabase
          .from("clients")
          .update({
            name: data.nome,
            phone: data.telefone,
            email: data.email,
          })
          .eq("user_id", userId);
      }
    }
  } catch (error) {
    console.error("Erro ao salvar dados do cliente:", error);
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
        data: data.toISOString().split("T")[0],
        texto: data.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        }),
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
    observacoes: "",
  });
  const [saveData, setSaveData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Corrigido: função async dentro do useEffect
  useEffect(() => {
    const init = async () => {
      await fetchCompanyData();
      await loadSavedData();
    };
    init();
  }, [slug]);

  const loadSavedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientData = null;

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
    } catch (error) {
      console.log("Erro ao carregar dados do cliente", error);
    }
  };

  const fetchCompanyData = async () => {
    try {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, phone, instagram, email, address, number, neighborhood, city, state, zip_code, primary_color, business_hours")
        .limit(10);

      if (error) throw error;

      const foundCompany =
        companies?.find(c => c.name.toLowerCase().replace(/\s+/g, "-") === slug) ||
        companies?.[0];

      if (foundCompany) {
        setCompany(foundCompany);

        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("company_id", foundCompany.id);
        setServices(servicesData || []);

        const { data: professionalsData } = await supabase
          .from("professionals")
          .select("*")
          .eq("company_id", foundCompany.id)
          .eq("is_available", true);
        setProfessionals(professionalsData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados da barbearia:", error);
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
          allTimeslots.push(`${hour.toString().padStart(2, "0")}:00`);
          allTimeslots.push(`${hour.toString().padStart(2, "0")}:30`);
        }
      }

      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("professional_id", professionalId)
        .eq("appointment_date", date)
        .in("status", ["scheduled", "confirmed", "in_progress"]);

      const occupiedSlots = existingAppointments?.map(apt => apt.appointment_time) || [];
      setAvailableSlots(allTimeslots.filter(slot => !occupiedSlots.includes(slot)));
    } catch (error) {
      console.error("Erro ao buscar horários disponíveis:", error);
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

  // ... resto do código continua igual (formulário, validações e envio) ...

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
        {/* aqui permanece o layout do formulário exatamente como você enviou */}
      </div>
    </div>
  );
};

export default AgendarServico;
