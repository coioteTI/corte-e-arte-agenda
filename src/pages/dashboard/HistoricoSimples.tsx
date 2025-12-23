import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardLayout from "@/components/DashboardLayout";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { ComprovanteModal } from "@/components/ComprovanteModal";
import { useAdminPassword } from "@/hooks/useAdminPassword";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon, User, Scissors, Clock, CreditCard, CheckCircle, Eye, Upload, Package, Check, Lock, ShieldAlert, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ServicoFinalizado {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  service_name: string;
  professional_name: string;
  payment_method: string;
  payment_status: string;
  total_price: number;
  created_at: string;
  status: string;
  comprovante_url?: string;
  pix_payment_proof?: string;
}

interface StockSale {
  id: string;
  product_name: string;
  client_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_status: string;
  payment_method: string | null;
  sold_at: string;
}

export default function HistoricoSimples() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState<ServicoFinalizado[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<ServicoFinalizado[]>([]);
  const [stockSales, setStockSales] = useState<StockSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("services");

  const [filtroData, setFiltroData] = useState<Date | undefined>(undefined);
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("pago");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);
  const [selectedComprovanteUrl, setSelectedComprovanteUrl] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  // Admin password protection states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [validatingPassword, setValidatingPassword] = useState(false);
  const { hasAdminPassword, validateAdminPassword } = useAdminPassword();

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
            // Password is required - don't load data yet
            setLoading(false);
          } else {
            // No password configured, allow access
            setIsAuthenticated(true);
            carregarDados();
          }
        }
      } catch (error) {
        console.error("Error checking admin password:", error);
        setIsAuthenticated(true);
        carregarDados();
      }
    };

    checkAdminPassword();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [servicos, filtroData, filtroProfissional, filtroStatus]);

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
      carregarDados();
    } else {
      setPasswordError("Senha incorreta. Acesso negado.");
      setPasswordInput("");
    }
    
    setValidatingPassword(false);
  };

  const carregarDados = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companies) {
        toast.error("Empresa não encontrada");
        return;
      }

      setCompanyId(companies.id);

      // Load appointments and stock sales in parallel
      const [appointmentsRes, stockSalesRes] = await Promise.all([
        supabase
          .from("appointments")
          .select(`
            id,
            appointment_date,
            appointment_time,
            payment_method,
            payment_status,
            total_price,
            created_at,
            status,
            comprovante_url,
            pix_payment_proof,
            clients(name),
            services(name),
            professionals(name)
          `)
          .eq("company_id", companies.id)
          .order("appointment_date", { ascending: false }),
        supabase
          .from("stock_sales")
          .select(`
            id,
            client_name,
            quantity,
            unit_price,
            total_price,
            payment_status,
            payment_method,
            sold_at,
            stock_products(name)
          `)
          .eq("company_id", companies.id)
          .order("sold_at", { ascending: false })
          .limit(100)
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;

      const servicosFormatados = appointmentsRes.data?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        client_name: (apt.clients as any)?.name || "Cliente removido",
        service_name: (apt.services as any)?.name || "Serviço removido",
        professional_name: (apt.professionals as any)?.name || "Profissional removido",
        payment_method: apt.payment_method,
        payment_status: apt.payment_status,
        total_price: apt.total_price,
        created_at: apt.created_at,
        status: apt.status,
        comprovante_url: apt.comprovante_url,
        pix_payment_proof: apt.pix_payment_proof,
      })) || [];

      setServicos(servicosFormatados);

      // Format stock sales
      if (stockSalesRes.data) {
        const salesFormatted = stockSalesRes.data.map(sale => ({
          id: sale.id,
          product_name: (sale.stock_products as any)?.name || "Produto removido",
          client_name: sale.client_name,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total_price: sale.total_price,
          payment_status: sale.payment_status,
          payment_method: sale.payment_method,
          sold_at: sale.sold_at,
        }));
        setStockSales(salesFormatted);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let servicosFiltrados = [...servicos];

    if (filtroStatus === "pago") {
      // Show all services marked as paid, regardless of appointment status
      servicosFiltrados = servicosFiltrados.filter(s => s.payment_status === "paid");
    } else if (filtroStatus === "pendente") {
      // Show completed services with pending payment
      servicosFiltrados = servicosFiltrados.filter(s => s.status === "completed" && s.payment_status !== "paid");
    } else if (filtroStatus === "agendado") {
      // Show scheduled/confirmed services that are NOT paid yet
      servicosFiltrados = servicosFiltrados.filter(s => 
        (s.status === "scheduled" || s.status === "confirmed") && s.payment_status !== "paid"
      );
    }

    if (filtroData) {
      const dataFormatada = format(filtroData, "yyyy-MM-dd");
      servicosFiltrados = servicosFiltrados.filter(s => {
        const dataServico = format(parseISO(s.appointment_date), "yyyy-MM-dd");
        return dataServico === dataFormatada;
      });
    }

    if (filtroProfissional !== "todos") {
      servicosFiltrados = servicosFiltrados.filter(s => s.professional_name === filtroProfissional);
    }

    setServicosFiltrados(servicosFiltrados);
  };

  const limparFiltros = () => {
    setFiltroData(undefined);
    setFiltroProfissional("todos");
    setFiltroStatus("pago");
  };

  const concluirPagamento = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed", payment_status: "paid" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast.success("Pagamento marcado como concluído!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao concluir pagamento:", error);
      toast.error("Erro ao concluir pagamento");
    }
  };

  const concluirAgendamento = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast.success("Agendamento concluído com sucesso!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao concluir agendamento:", error);
      toast.error("Erro ao concluir agendamento");
    }
  };

  const handleComprovanteUpload = (url: string) => {
    if (selectedAppointmentId) {
      supabase
        .from("appointments")
        .update({ comprovante_url: url })
        .eq("id", selectedAppointmentId)
        .then(({ error }) => {
          if (error) toast.error("Erro ao salvar comprovante");
          else {
            toast.success("Comprovante salvo com sucesso!");
            setUploadDialogOpen(false);
            setSelectedAppointmentId(null);
            carregarDados();
          }
        });
    }
  };

  const excluirComprovante = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ comprovante_url: null, pix_payment_proof: null })
        .eq("id", appointmentId);

      if (error) throw error;

      toast.success("Comprovante excluído com sucesso!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir comprovante:", error);
      toast.error("Erro ao excluir comprovante");
    }
  };

  const abrirUploadDialog = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setUploadDialogOpen(true);
  };

  const abrirComprovanteModal = (url: string, clientName: string) => {
    setSelectedComprovanteUrl(url);
    setSelectedClientName(clientName);
    setComprovanteModalOpen(true);
  };

  const handleUpdateStockSaleStatus = async (saleId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("stock_sales")
        .update({ payment_status: newStatus })
        .eq("id", saleId);

      if (error) throw error;
      toast.success("Status atualizado");
      carregarDados();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === "completed") return paymentStatus === "paid" ? <Badge className="bg-green-500">Pago</Badge> : <Badge variant="destructive">Pendente</Badge>;
    if (status === "scheduled" || status === "confirmed") return <Badge variant="secondary">Agendado</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPaymentMethodText = (method: string) => {
    if (!method) return "-";
    if (method === "pix") return "PIX";
    if (method === "no_local") return "Pagamento Local";
    if (method === "dinheiro") return "Dinheiro";
    if (method === "cartao_credito") return "Cartão de Crédito";
    if (method === "cartao_debito") return "Cartão de Débito";
    return method;
  };

  // Show password protection screen if password is configured and not authenticated
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
                O Histórico de Pagamentos está protegido por senha de administrador.
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
                      Acessar Histórico
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

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Histórico de Pagamentos</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Serviços
              <Badge variant="secondary" className="ml-1">{servicosFiltrados.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos do Estoque
              <Badge variant="secondary" className="ml-1">{stockSales.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {/* Filtros de status */}
            <Card>
              <CardContent className="pt-6 flex gap-2 flex-wrap">
                <Button variant={filtroStatus==="pago"?"default":"outline"} onClick={()=>setFiltroStatus("pago")} size="sm" className="bg-green-500 hover:bg-green-600 text-white">Pago</Button>
                <Button variant={filtroStatus==="pendente"?"default":"outline"} onClick={()=>setFiltroStatus("pendente")} size="sm" className="bg-red-500 hover:bg-red-600 text-white">Pendente</Button>
                <Button variant={filtroStatus==="agendado"?"default":"outline"} onClick={()=>setFiltroStatus("agendado")} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">Agendado/Em andamento</Button>
              </CardContent>
            </Card>

            {/* Filtros avançados */}
            <Card>
              <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por profissional" /></SelectTrigger>
                    <SelectContent className="z-[100] bg-background border">
                      <SelectItem value="todos">Todos os profissionais</SelectItem>
                      {Array.from(new Set(servicos.map(s=>s.professional_name))).map(name=><SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !filtroData && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filtroData ? format(filtroData,"PPP",{locale: ptBR}) : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar mode="single" selected={filtroData} onSelect={setFiltroData} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>

                  <Button variant="outline" onClick={limparFiltros}>Limpar Filtros</Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de serviços */}
            <div className="grid gap-4">
              {servicosFiltrados.length===0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                    <h3 className="text-lg font-medium mb-2">Nenhum serviço finalizado</h3>
                    <p className="text-muted-foreground">{servicos.length===0 ? "Ainda não há serviços finalizados para mostrar." : "Nenhum serviço encontrado com os filtros aplicados."}</p>
                  </CardContent>
                </Card>
              ) : (
                servicosFiltrados.map(s => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary"/> {s.client_name}</div>
                        <div className="flex items-center gap-2"><Scissors className="h-4 w-4 text-muted-foreground"/> {s.service_name}</div>
                        <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> Profissional: {s.professional_name}</div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/> {format(parseISO(s.appointment_date),"dd/MM/yyyy",{locale:ptBR})} às {s.appointment_time}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right font-bold text-lg">R$ {s.total_price?.toFixed(2) || '0.00'}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground"><CreditCard className="h-3 w-3"/> {getPaymentMethodText(s.payment_method)}</div>
                        {getStatusBadge(s.status,s.payment_status)}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {(s.status === "scheduled" || s.status === "confirmed") && (
                            <Button size="sm" onClick={()=>concluirAgendamento(s.id)} className="bg-blue-500 hover:bg-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1"/>Concluir
                            </Button>
                          )}

                          {(s.status === "completed" && s.payment_status !== "paid") && (
                            <Button size="sm" onClick={()=>concluirPagamento(s.id)} className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1"/>Concluir Pagamento
                            </Button>
                          )}
                          
                          {s.comprovante_url || s.pix_payment_proof ? (
                            <>
                              <Button size="sm" variant="outline" onClick={()=>abrirComprovanteModal(s.pix_payment_proof || s.comprovante_url!, s.client_name)}>
                                <Eye className="h-3 w-3 mr-1"/>Ver
                              </Button>
                              <Button size="sm" variant="destructive" onClick={()=>excluirComprovante(s.id)}>Excluir</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={()=>abrirUploadDialog(s.id)}>
                              <Upload className="h-3 w-3 mr-1"/>Adicionar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Vendas de Produtos do Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stockSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda de produto registrada ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(sale.sold_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{sale.product_name}</TableCell>
                            <TableCell>{sale.client_name}</TableCell>
                            <TableCell>{sale.quantity}</TableCell>
                            <TableCell className="font-medium">
                              R$ {sale.total_price.toFixed(2)}
                            </TableCell>
                            <TableCell>{getPaymentMethodText(sale.payment_method || "")}</TableCell>
                            <TableCell>
                              <Badge variant={sale.payment_status === "paid" ? "default" : "secondary"}>
                                {sale.payment_status === "paid" ? (
                                  <><Check className="h-3 w-3 mr-1" /> Pago</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {sale.payment_status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStockSaleStatus(sale.id, "paid")}
                                >
                                  Marcar pago
                                </Button>
                              )}
                              {sale.payment_status === "paid" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateStockSaleStatus(sale.id, "pending")}
                                >
                                  Pendente
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
          </TabsContent>
        </Tabs>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Comprovante de Pagamento</DialogTitle></DialogHeader>
            <PaymentProofUpload onUploadComplete={handleComprovanteUpload} appointmentId={selectedAppointmentId||undefined}/>
          </DialogContent>
        </Dialog>

        <ComprovanteModal open={comprovanteModalOpen} onOpenChange={setComprovanteModalOpen} comprovanteUrl={selectedComprovanteUrl} clientName={selectedClientName} />
      </div>
    </DashboardLayout>
  );
}
