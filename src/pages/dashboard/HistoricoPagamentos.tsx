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

interface AppointmentPayment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  payment_method: string;
  payment_status: string;
  payment_confirmation_date: string | null;
  client_name: string;
  service_name: string;
  professional_name: string;
  created_at: string;
}

export default function HistoricoPagamentos() {
  const [appointments, setAppointments] = useState<AppointmentPayment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  // Filtros
  const [filterDate, setFilterDate] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { updateData } = useSupabaseOperations();

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, filterDate, filterProfessional, filterStatus]);

  const loadPaymentHistory = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error("Erro de autenticação");
        return;
      }

      // Buscar empresa do usuário
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (companyError || !companies) {
        toast.error("Empresa não encontrada");
        return;
      }

      setCompanyId(companies.id);

      // Buscar agendamentos com informações de pagamento
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          total_price,
          payment_method,
          payment_status,
          payment_confirmation_date,
          created_at,
          clients(name),
          services(name),
          professionals(name)
        `)
        .eq('company_id', companies.id)
        .order('created_at', { ascending: false });

      if (appointmentsError) {
        console.error('Erro ao buscar agendamentos:', appointmentsError);
        toast.error("Erro ao carregar histórico de pagamentos");
        return;
      }

      const formattedAppointments = appointmentsData?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        total_price: apt.total_price || 0,
        payment_method: apt.payment_method || 'no_local',
        payment_status: apt.payment_status || 'pending',
        payment_confirmation_date: apt.payment_confirmation_date,
        client_name: apt.clients?.name || 'Cliente não identificado',
        service_name: apt.services?.name || 'Serviço não identificado',
        professional_name: apt.professionals?.name || 'Profissional não identificado',
        created_at: apt.created_at
      })) || [];

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error("Erro ao carregar dados");
    } finally {
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
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
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
    .filter(apt => apt.payment_status === 'pending')
    .reduce((sum, apt) => sum + apt.total_price, 0);

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
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
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
                          {appointment.payment_status === 'pending' && (
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