import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button"; // teste caminhos relativos
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import DashboardLayout from "../../components/DashboardLayout";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";
import { useSupabaseOperations } from "../../hooks/useSupabaseOperations";
import { useNotifications } from "../../hooks/useNotifications";

interface AppointmentPayment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  payment_method: string;
  payment_status: string;
  payment_confirmation_date: string | null;
  pix_payment_proof: string | null;
  client_name: string;
  service_name: string;
  professional_name: string;
  created_at: string;
}

export default function HistoricoPagamentos() {
  console.log("📌 Renderizando HistoricoPagamentos");

  const [appointments, setAppointments] = useState<AppointmentPayment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  const [filterDate, setFilterDate] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { updateData } = useSupabaseOperations();
  const [notifyClient, setNotifyClient] = useState<((msg: string, client: string) => void) | null>(null);

  // Inicializa notifyClient apenas quando companyId existir
  useEffect(() => {
    if (companyId) {
      const { notifyClient } = useNotifications(companyId);
      setNotifyClient(() => notifyClient);
    }
  }, [companyId]);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, filterDate, filterProfessional, filterStatus]);

  const loadPaymentHistory = async () => {
    console.log("🔄 Iniciando carregamento do histórico de pagamentos...");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast.error("Usuário não autenticado. Redirecionando para login...");
        window.location.href = '/login';
        return;
      }

      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companies) {
        toast.error("Nenhuma empresa encontrada. Cadastre uma empresa primeiro.");
        setLoading(false);
        return;
      }

      setCompanyId(companies.id);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointment_payments_view')
        .select('*')
        .eq('company_id', companies.id)
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      const formattedAppointments = appointmentsData?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        total_price: apt.total_price || 0,
        payment_method: apt.payment_method || 'no_local',
        payment_status: apt.payment_status || 'pending',
        payment_confirmation_date: apt.payment_confirmation_date,
        pix_payment_proof: apt.pix_payment_proof,
        client_name: apt.client_name,
        service_name: apt.service_name,
        professional_name: apt.professional_name,
        created_at: apt.created_at
      })) || [];

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      toast.error(`Erro ao carregar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];
    if (filterDate) filtered = filtered.filter(apt => apt.appointment_date === filterDate);
    if (filterProfessional) filtered = filtered.filter(apt => apt.professional_name.toLowerCase().includes(filterProfessional.toLowerCase()));
    if (filterStatus) filtered = filtered.filter(apt => apt.payment_status === filterStatus);
    setFilteredAppointments(filtered);
  };

  const updatePaymentStatus = async (appointmentId: string, newStatus: string) => {
    const updatePayload = {
      payment_status: newStatus,
      ...(newStatus === 'paid' ? { payment_confirmation_date: new Date().toISOString() } : {})
    };

    const result = await updateData('appointments', updatePayload, appointmentId, 'Status de pagamento atualizado com sucesso!');
    if (result.success) {
      loadPaymentHistory();
      if (newStatus === 'paid' && notifyClient) {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (appointment) notifyClient(
          `Pagamento confirmado! Seu agendamento está garantido para ${format(new Date(appointment.appointment_date), "dd/MM/yyyy")} às ${appointment.appointment_time}.`,
          appointment.client_name
        );
      }
    }
  };

  // ... restante do JSX permanece igual
  // Cards de resumo, filtros e tabela

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Histórico de Pagamentos</h1>
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Coloque aqui os cards, filtros e tabela como estava */}
      </div>
    </DashboardLayout>
  );
}
