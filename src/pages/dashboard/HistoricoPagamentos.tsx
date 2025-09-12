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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CreditCard, CheckCircle, Clock, XCircle, Eye, Download, QrCode } from "lucide-react";
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
  console.log("📌 Renderizando HistoricoPagamentos");

  const [appointments, setAppointments] = useState<AppointmentPayment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  const [filterDate, setFilterDate] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectedProof, setSelectedProof] = useState<string | null>(null);

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
          `Pagamento confirmado! Seu agendamento está garantido para ${format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às ${appointment.appointment_time}.`,
          appointment.client_name
        );
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'awaiting_payment': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'awaiting_payment': return 'Aguardando Confirmação';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'awaiting_payment': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Estatísticas dos pagamentos
  const totalReceitas = filteredAppointments
    .filter(apt => apt.payment_status === 'paid')
    .reduce((sum, apt) => sum + apt.total_price, 0);

  const pendingPayments = filteredAppointments.filter(apt => apt.payment_status === 'pending').length;
  const awaitingConfirmation = filteredAppointments.filter(apt => apt.payment_status === 'awaiting_payment').length;
  const paidPayments = filteredAppointments.filter(apt => apt.payment_status === 'paid').length;

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Histórico de Pagamentos
          </h1>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {paidPayments} agendamentos pagos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Confirmação</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{awaitingConfirmation}</div>
              <p className="text-xs text-muted-foreground">
                Comprovantes enviados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingPayments}</div>
              <p className="text-xs text-muted-foreground">
                Pagamento no local
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                Todos os status
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="filter-date">Data</Label>
                <Input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filter-professional">Profissional</Label>
                <Input
                  id="filter-professional"
                  placeholder="Nome do profissional"
                  value={filterProfessional}
                  onChange={(e) => setFilterProfessional(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="awaiting_payment">Aguardando Confirmação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
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
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico Detalhado</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comprovante</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.client_name}
                        </TableCell>
                        <TableCell>{appointment.service_name}</TableCell>
                        <TableCell>{appointment.professional_name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.appointment_time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            R$ {appointment.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {appointment.payment_method === 'pix' ? (
                              <QrCode className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            {appointment.payment_method === 'pix' ? 'PIX' : 'No Local'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(appointment.payment_status)}
                            <Badge 
                              variant="secondary" 
                              className={getStatusColor(appointment.payment_status)}
                            >
                              {getStatusText(appointment.payment_status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {appointment.pix_payment_proof ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedProof(appointment.pix_payment_proof)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Comprovante de Pagamento</DialogTitle>
                                </DialogHeader>
                                <div className="flex justify-center">
                                  <img 
                                    src={appointment.pix_payment_proof} 
                                    alt="Comprovante de pagamento"
                                    className="max-w-full max-h-96 object-contain"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    variant="outline"
                                    onClick={() => window.open(appointment.pix_payment_proof, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.payment_status === 'awaiting_payment' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePaymentStatus(appointment.id, 'paid')}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePaymentStatus(appointment.id, 'pending')}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          )}
                          {appointment.payment_status === 'pending' && appointment.payment_method === 'no_local' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePaymentStatus(appointment.id, 'paid')}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Marcar como Pago
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}