import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { LoadingSkeleton, ErrorState } from "@/components/LoadingState";
import { useAdminPassword } from "@/hooks/useAdminPassword";
import { useTimezone, formatDateInTimezone, getTodayInTimezone } from "@/hooks/useTimezone";
import { useBranch } from "@/contexts/BranchContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, isWithinInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  CalendarIcon, 
  User, 
  DollarSign, 
  Lock, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle, 
  Eye, 
  Upload,
  Wallet,
  TrendingUp,
  History,
  FileText,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
}

interface ProfessionalEarning {
  professional: Professional;
  totalEarnings: number;
  totalPaid: number;
  balance: number;
  appointments: AppointmentEarning[];
}

interface AppointmentEarning {
  id: string;
  date: string;
  time: string;
  service_name: string;
  client_name: string;
  amount: number;
}

interface Payment {
  id: string;
  professional_id: string;
  professional_name: string;
  amount: number;
  payment_date: string;
  payment_reason: string;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
}

export default function Salarios() {
  const navigate = useNavigate();
  const { currentBranchId, userRole, loading: branchLoading } = useBranch();
  const shouldFilterByBranch = userRole !== 'ceo' && !!currentBranchId;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [lastBranchId, setLastBranchId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [earnings, setEarnings] = useState<ProfessionalEarning[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("earnings");

  // Payment form states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReason, setPaymentReason] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Proof viewer
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState("");

  // Admin password protection states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [validatingPassword, setValidatingPassword] = useState(false);
  const { hasAdminPassword, validateAdminPassword } = useAdminPassword();
  
  // Timezone hook - use company's configured timezone
  const { timezone, loading: timezoneLoading } = useTimezone(companyId || null);

  // Check if admin password is configured and require authentication
  useEffect(() => {
    const checkAdminPassword = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: companies } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (companies) {
          setCompanyId(companies.id);
          const passwordExists = await hasAdminPassword(companies.id);
          setHasPassword(passwordExists);
          
          if (passwordExists) {
            setLoading(false);
          } else {
            setIsAuthenticated(true);
            loadData();
          }
        }
      } catch (error) {
        console.error("Error checking admin password:", error);
        setIsAuthenticated(true);
        loadData();
      }
    };

    checkAdminPassword();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError("Digite a senha de administrador");
      return;
    }

    setValidatingPassword(true);
    setPasswordError("");

    const isValid = await validateAdminPassword(companyId, passwordInput);
    
    if (isValid) {
      setIsAuthenticated(true);
      setLoading(true);
      loadData();
    } else {
      setPasswordError("Senha incorreta. Acesso negado.");
      setPasswordInput("");
    }
    
    setValidatingPassword(false);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!companies) {
        setError('Empresa não encontrada');
        return;
      }

      setCompanyId(companies.id);

      // Build queries with branch filtering
      let professionalsQuery = supabase
        .from("professionals")
        .select("id, name, specialty")
        .eq("company_id", companies.id)
        .eq("is_available", true);

      let appointmentsQuery = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          total_price,
          status,
          payment_status,
          professional_id,
          professionals(id, name, specialty),
          services(name),
          clients(name)
        `)
        .eq("company_id", companies.id)
        .eq("payment_status", "paid")
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: false });

      let paymentsQuery = supabase
        .from("professional_payments")
        .select(`
          id,
          professional_id,
          amount,
          payment_date,
          payment_reason,
          proof_url,
          notes,
          created_at,
          professionals(name)
        `)
        .eq("company_id", companies.id)
        .order("payment_date", { ascending: false });

      // Apply branch filter if not CEO
      if (shouldFilterByBranch && currentBranchId) {
        professionalsQuery = professionalsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        appointmentsQuery = appointmentsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        paymentsQuery = paymentsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Execute queries with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tempo limite excedido. Tente novamente.')), 15000)
      );

      const [professionalsData, appointmentsData, paymentsData] = await Promise.race([
        Promise.all([professionalsQuery, appointmentsQuery, paymentsQuery]),
        timeoutPromise
      ]) as any[];

      setProfessionals(professionalsData.data || []);

      const formattedPayments: Payment[] = (paymentsData.data || []).map((p: any) => ({
        id: p.id,
        professional_id: p.professional_id,
        professional_name: (p.professionals as any)?.name || "Profissional removido",
        amount: p.amount,
        payment_date: p.payment_date,
        payment_reason: p.payment_reason,
        proof_url: p.proof_url,
        notes: p.notes,
        created_at: p.created_at,
      }));

      setPayments(formattedPayments);

      // Calculate earnings by professional
      const earningsByProfessional: Record<string, ProfessionalEarning> = {};

      (professionalsData.data || []).forEach((prof: Professional) => {
        earningsByProfessional[prof.id] = {
          professional: prof,
          totalEarnings: 0,
          totalPaid: 0,
          balance: 0,
          appointments: [],
        };
      });

      (appointmentsData.data || []).forEach((apt: any) => {
        const profId = apt.professional_id;
        const amount = apt.total_price || 0;
        
        if (profId && 
            earningsByProfessional[profId] && 
            apt.payment_status === 'paid' && 
            apt.status !== 'cancelled' &&
            amount > 0) {
          earningsByProfessional[profId].appointments.push({
            id: apt.id,
            date: apt.appointment_date,
            time: apt.appointment_time,
            service_name: (apt.services as any)?.name || "Serviço",
            client_name: (apt.clients as any)?.name || "Cliente",
            amount: amount,
          });
          earningsByProfessional[profId].totalEarnings += amount;
        }
      });

      formattedPayments.forEach(payment => {
        if (earningsByProfessional[payment.professional_id]) {
          earningsByProfessional[payment.professional_id].totalPaid += payment.amount;
        }
      });

      Object.values(earningsByProfessional).forEach(earning => {
        earning.balance = earning.totalEarnings - earning.totalPaid;
      });

      setEarnings(Object.values(earningsByProfessional));
      setLastBranchId(currentBranchId);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, shouldFilterByBranch]);

  // Reload when branch changes
  useEffect(() => {
    if (branchLoading || !isAuthenticated) return;
    
    if (lastBranchId !== currentBranchId) {
      setProfessionals([]);
      setEarnings([]);
      setPayments([]);
      loadData();
    }
  }, [currentBranchId, branchLoading, isAuthenticated, lastBranchId, loadData]);

  // Setup realtime subscription for automatic updates
  useEffect(() => {
    if (!companyId || !isAuthenticated) return;

    // Subscribe to appointments changes
    const appointmentsChannel = supabase
      .channel('salarios-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Reload data when any appointment changes
          loadData();
        }
      )
      .subscribe();

    // Subscribe to professional payments changes
    const paymentsChannel = supabase
      .channel('salarios-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'professional_payments',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Reload data when any payment changes
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [companyId, isAuthenticated, loadData]);

  const getFilteredEarnings = (earning: ProfessionalEarning) => {
    // Use the selected date and compare appointment dates based on the configured timezone
    const selectedDateStr = formatDateInTimezone(selectedDate, timezone);
    
    // Parse selected date for comparison
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const selectedDateLocal = new Date(year, month - 1, day);
    
    let start: Date;
    let end: Date;

    switch (selectedPeriod) {
      case "day":
        // For day: compare the appointment_date (YYYY-MM-DD) directly with selected date
        start = startOfDay(selectedDateLocal);
        end = endOfDay(selectedDateLocal);
        break;
      case "week":
        start = startOfWeek(selectedDateLocal, { locale: ptBR });
        end = endOfWeek(selectedDateLocal, { locale: ptBR });
        break;
      case "year":
        start = startOfYear(selectedDateLocal);
        end = endOfYear(selectedDateLocal);
        break;
      case "month":
      default:
        start = startOfMonth(selectedDateLocal);
        end = endOfMonth(selectedDateLocal);
        break;
    }

    const filteredAppointments = earning.appointments.filter(apt => {
      // apt.date is already in YYYY-MM-DD format from the database
      // Parse it as a local date (no timezone conversion needed)
      const [aptYear, aptMonth, aptDay] = apt.date.split('-').map(Number);
      const aptDate = new Date(aptYear, aptMonth - 1, aptDay);
      return isWithinInterval(aptDate, { start, end });
    });

    const periodEarnings = filteredAppointments.reduce((sum, apt) => sum + apt.amount, 0);

    return {
      appointments: filteredAppointments,
      periodEarnings,
    };
  };

  const openPaymentDialog = (professional: Professional) => {
    setSelectedProfessional(professional);
    setPaymentAmount("");
    setPaymentReason("");
    setPaymentDate(new Date());
    setPaymentNotes("");
    setPaymentProofFile(null);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedProfessional || !paymentAmount || !paymentReason) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmittingPayment(true);

    try {
      let proofUrl = null;

      // Upload proof if exists
      if (paymentProofFile) {
        const fileExt = paymentProofFile.name.split('.').pop();
        const fileName = `${companyId}/${selectedProfessional.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, paymentProofFile);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(fileName);

        proofUrl = publicUrl.publicUrl;
      }

      // Insert payment
      const { error } = await supabase
        .from("professional_payments")
        .insert({
          company_id: companyId,
          professional_id: selectedProfessional.id,
          amount: parseFloat(paymentAmount),
          payment_date: format(paymentDate, "yyyy-MM-dd"),
          payment_reason: paymentReason,
          proof_url: proofUrl,
          notes: paymentNotes || null,
        });

      if (error) throw error;

      toast.success("Pagamento registrado com sucesso!");
      setPaymentDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openProofViewer = (url: string) => {
    setSelectedProofUrl(url);
    setProofViewerOpen(true);
  };

  // Show password protection screen
  if (hasPassword && !isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                <Lock className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Acesso Protegido</CardTitle>
              <p className="text-muted-foreground mt-2">
                A área de Salários está protegida por senha de administrador.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Digite a senha de administrador"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="text-center"
                    autoFocus
                  />
                  {passwordError && (
                    <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={validatingPassword}
                >
                  {validatingPassword ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Validando...
                    </div>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Acessar Salários
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Controle de Salários
          </h1>
        </div>

        {/* Period Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={selectedPeriod === "day" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedPeriod("day")}
                >
                  Dia
                </Button>
                <Button 
                  variant={selectedPeriod === "week" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedPeriod("week")}
                >
                  Semana
                </Button>
                <Button 
                  variant={selectedPeriod === "month" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedPeriod("month")}
                >
                  Mês
                </Button>
                <Button 
                  variant={selectedPeriod === "year" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedPeriod("year")}
                >
                  Anual
                </Button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar 
                    mode="single" 
                    selected={selectedDate} 
                    onSelect={(date) => date && setSelectedDate(date)} 
                    initialFocus 
                    className="p-3 pointer-events-auto" 
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ganhos por Profissional
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Pagamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-4">
            {earnings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum profissional cadastrado</h3>
                  <p className="text-muted-foreground">Cadastre profissionais para visualizar os ganhos.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {earnings.map(earning => {
                  const { appointments, periodEarnings } = getFilteredEarnings(earning);
                  
                  return (
                    <Card key={earning.professional.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{earning.professional.name}</CardTitle>
                              {earning.professional.specialty && (
                                <p className="text-sm text-muted-foreground">{earning.professional.specialty}</p>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => openPaymentDialog(earning.professional)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Marcar como Pago
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                            <p className="text-sm text-muted-foreground">Ganhos no Período</p>
                            <p className="text-2xl font-bold text-blue-600">R$ {periodEarnings.toFixed(2)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                            <p className="text-sm text-muted-foreground">Total Pago</p>
                            <p className="text-2xl font-bold text-green-600">R$ {earning.totalPaid.toFixed(2)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                            <p className="text-sm text-muted-foreground">Saldo a Pagar (Total)</p>
                            <p className="text-2xl font-bold text-amber-600">R$ {earning.balance.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Appointments Table */}
                        {appointments.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Hora</TableHead>
                                  <TableHead>Cliente</TableHead>
                                  <TableHead>Serviço</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {appointments.slice(0, 5).map(apt => (
                                  <TableRow key={apt.id}>
                                    <TableCell>{(() => {
                                      const [y, m, d] = apt.date.split('-').map(Number);
                                      return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
                                    })()}</TableCell>
                                    <TableCell>{apt.time}</TableCell>
                                    <TableCell>{apt.client_name}</TableCell>
                                    <TableCell>{apt.service_name}</TableCell>
                                    <TableCell className="text-right font-medium">R$ {apt.amount.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {appointments.length > 5 && (
                              <p className="text-sm text-muted-foreground text-center mt-2">
                                E mais {appointments.length - 5} atendimentos...
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            Nenhum atendimento no período selecionado
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Pagamentos Realizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pagamento registrado ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Comprovante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell className="whitespace-nowrap">
                              {(() => {
                                const [y, m, d] = payment.payment_date.split('-').map(Number);
                                return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
                              })()}
                            </TableCell>
                            <TableCell>{payment.professional_name}</TableCell>
                            <TableCell>{payment.payment_reason}</TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {payment.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {payment.proof_url ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openProofViewer(payment.proof_url!)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                              ) : (
                                <Badge variant="secondary">Sem comprovante</Badge>
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
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Registrar Pagamento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProfessional && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Profissional</p>
                  <p className="font-medium">{selectedProfessional.name}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentReason">Motivo do Pagamento *</Label>
                <Input
                  id="paymentReason"
                  placeholder="Ex: Comissão semanal, Adiantamento..."
                  value={paymentReason}
                  onChange={(e) => setPaymentReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Valor Pago (R$) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(paymentDate, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => date && setPaymentDate(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Observações</Label>
                <Textarea
                  id="paymentNotes"
                  placeholder="Observações adicionais..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentProof">Comprovante (opcional)</Label>
                <Input
                  id="paymentProof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePaymentSubmit} disabled={submittingPayment}>
                {submittingPayment ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Pagamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Proof Viewer Dialog */}
        <Dialog open={proofViewerOpen} onOpenChange={setProofViewerOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comprovante de Pagamento
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {selectedProofUrl && (
                selectedProofUrl.toLowerCase().endsWith('.pdf') ? (
                  <a 
                    href={selectedProofUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Abrir PDF em nova aba
                  </a>
                ) : (
                  <img 
                    src={selectedProofUrl} 
                    alt="Comprovante" 
                    className="max-h-[60vh] object-contain rounded-lg"
                  />
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
