import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";
import { useSupabaseOperations } from "@/hooks/useSupabaseOperations";
import { useNotifications } from "@/hooks/useNotifications";

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
  console.log("🏠 HistoricoPagamentos component carregado");
  
  const [appointments, setAppointments] = useState<AppointmentPayment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  // Filtros
  const [filterDate, setFilterDate] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { updateData } = useSupabaseOperations();
  const { notifyClient } = useNotifications(companyId);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, filterDate, filterProfessional, filterStatus]);

  const loadPaymentHistory = async () => {
    console.log("🔄 Iniciando carregamento do histórico de pagamentos...");
    
    try {
      // Verificar status da autenticação
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("❌ Erro de autenticação:", userError);
        toast.error(`Erro de autenticação: ${userError.message}`);
        setLoading(false);
        return;
      }

      if (!user) {
        console.error("❌ Usuário não encontrado");
        toast.error("Usuário não autenticado. Redirecionando para login...");
        window.location.href = '/login';
        return;
      }

      console.log("✅ Usuário autenticado:", user.id);

      // Buscar empresa do usuário
      console.log("🔍 Buscando empresa do usuário...");
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyError) {
        console.error("❌ Erro ao buscar empresa:", companyError);
        toast.error(`Erro ao buscar empresa: ${companyError.message}`);
        setLoading(false);
        return;
      }

      if (!companies) {
        console.warn("⚠️ Nenhuma empresa encontrada para o usuário");
        toast.error("Nenhuma empresa encontrada. Cadastre uma empresa primeiro.");
        setLoading(false);
        return;
      }

      console.log("✅ Empresa encontrada:", companies.id, companies.name);
      setCompanyId(companies.id);

      // Buscar agendamentos com informações de pagamento usando a view
      console.log("🔍 Buscando agendamentos da empresa...");
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointment_payments_view')
        .select('*')
        .eq('company_id', companies.id)
        .order('created_at', { ascending: false });

      if (appointmentsError) {
        console.error('❌ Erro ao buscar agendamentos:', appointmentsError);
        toast.error(`Erro ao carregar agendamentos: ${appointmentsError.message}`);
        setLoading(false);
        return;
      }

      console.log("✅ Raw data:", appointmentsData);
      console.log("✅ Agendamentos encontrados:", appointmentsData?.length || 0);

      if (!appointmentsData || appointmentsData.length === 0) {
        console.log("ℹ️ Nenhum agendamento encontrado");
        setAppointments([]);
        setLoading(false);
        return;
      }

      // A view já retorna os dados formatados corretamente
      const formattedAppointments = appointmentsData?.map(apt => {
        console.log("🔄 Formatando agendamento:", apt.id);
        return {
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
        };
      }) || [];

      console.log("✅ Agendamentos formatados:", formattedAppointments);
      setAppointments(formattedAppointments);
      
    } catch (error) {
      console.error('❌ Erro crítico ao carregar histórico:', error);
      toast.error(`Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      console.log("🏁 Finalizando carregamento - setLoading(false)");
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    if (filterDate) {
      filtered = filtered.filter(apt => apt.appointment_date === filterDate);
    }

    if (filterProfessional) {
      filtered = filtered.filter(apt => 
        apt.professional_name.toLowerCase().includes(filterProfessional.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(apt => apt.payment_status === filterStatus);
    }

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
      
      // Notificar cliente sobre confirmação de pagamento
      if (newStatus === 'paid') {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
          notifyClient(
            `Pagamento confirmado! Seu agendamento está garantido para ${format(new Date(appointment.appointment_date), "dd/MM/yyyy")} às ${appointment.appointment_time}.`,
            appointment.client_name
          );
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'awaiting_payment':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />Aguardando Confirmação</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix':
        return '💳 PIX';
      case 'no_local':
        return '💰 No Local';
      default:
        return method;
    }
  };

  const totalPaid = filteredAppointments
    .filter(apt => apt.payment_status === 'paid')
    .reduce((sum, apt) => sum + apt.total_price, 0);

  const totalPending = filteredAppointments
    .filter(apt => ['pending', 'awaiting_payment'].includes(apt.payment_status))
    .reduce((sum, apt) => sum + apt.total_price, 0);

  console.log("🎯 Estado atual do componente:", {
    loading,
    appointmentsCount: appointments.length,
    filteredCount: filteredAppointments.length,
    companyId
  });

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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Histórico de Pagamentos</h1>
          <Button onClick={loadPaymentHistory} variant="outline">
            🔄 Atualizar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Recebido</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {totalPaid.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendente</p>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {totalPending.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredAppointments.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="filterDate">Data</Label>
                <Input
                  id="filterDate"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="filterProfessional">Profissional</Label>
                <Input
                  id="filterProfessional"
                  placeholder="Nome do profissional"
                  value={filterProfessional}
                  onChange={(e) => setFilterProfessional(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="filterStatus">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="awaiting_payment">Aguardando Confirmação</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterDate("");
                  setFilterProfessional("");
                  setFilterStatus("");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos e Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Nenhum agendamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {appointment.appointment_time}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{appointment.client_name}</TableCell>
                        <TableCell>{appointment.service_name}</TableCell>
                        <TableCell>{appointment.professional_name}</TableCell>
                        <TableCell className="font-medium">
                          R$ {appointment.total_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodLabel(appointment.payment_method)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(appointment.payment_status)}
                        </TableCell>
                        <TableCell>
                          {appointment.pix_payment_proof ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(appointment.pix_payment_proof!, '_blank')}
                            >
                              📄 Ver Comprovante
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(appointment.payment_status === 'pending' || appointment.payment_status === 'awaiting_payment') && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePaymentStatus(appointment.id, 'paid')}
                              >
                                ✅ Confirmar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}