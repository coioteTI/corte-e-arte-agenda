import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardLayout from "@/components/DashboardLayout";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { ComprovanteModal } from "@/components/ComprovanteModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon, User, Scissors, Clock, CreditCard, CheckCircle, Eye, Upload } from "lucide-react";

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

export default function HistoricoSimples() {
  const [servicos, setServicos] = useState<ServicoFinalizado[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<ServicoFinalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  const [filtroData, setFiltroData] = useState<Date | undefined>(undefined);
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("pago");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);
  const [selectedComprovanteUrl, setSelectedComprovanteUrl] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  useEffect(() => {
    carregarServicosFinalizados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [servicos, filtroData, filtroProfissional, filtroStatus]);

  const carregarServicosFinalizados = async () => {
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
        .single();

      if (companyError) throw companyError;
      if (!companies) {
        toast.error("Empresa não encontrada");
        return;
      }

      setCompanyId(companies.id);

      const { data: appointmentsData, error: appointmentsError } = await supabase
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
          clients!inner(name),
          services!inner(name),
          professionals!inner(name)
        `)
        .eq("company_id", companies.id)
        .order("appointment_date", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      const servicosFormatados = appointmentsData?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        client_name: apt.clients.name,
        service_name: apt.services.name,
        professional_name: apt.professionals.name,
        payment_method: apt.payment_method,
        payment_status: apt.payment_status,
        total_price: apt.total_price,
        created_at: apt.created_at,
        status: apt.status,
        comprovante_url: apt.comprovante_url,
        pix_payment_proof: apt.pix_payment_proof,
      })) || [];

      setServicos(servicosFormatados);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de serviços");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let servicosFiltrados = [...servicos];

    if (filtroStatus === "pago") {
      servicosFiltrados = servicosFiltrados.filter(s => s.status === "completed" && s.payment_status === "paid");
    } else if (filtroStatus === "pendente") {
      servicosFiltrados = servicosFiltrados.filter(s => s.status === "completed" && s.payment_status !== "paid");
    } else if (filtroStatus === "agendado") {
      servicosFiltrados = servicosFiltrados.filter(s => s.status === "scheduled" || s.status === "confirmed");
    }

    // Ajuste do calendário
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
      carregarServicosFinalizados();
    } catch (error) {
      console.error("Erro ao concluir pagamento:", error);
      toast.error("Erro ao concluir pagamento");
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
            carregarServicosFinalizados();
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
      carregarServicosFinalizados();
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

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === "completed") return paymentStatus === "paid" ? <Badge className="bg-green-500">Pago</Badge> : <Badge variant="destructive">Pendente</Badge>;
    if (status === "scheduled" || status === "confirmed") return <Badge variant="secondary">Agendado</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPaymentMethodText = (method: string) => method === "pix" ? "PIX" : method === "no_local" ? "Pagamento Local" : method;

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
          <Badge variant="outline" className="text-sm">{servicosFiltrados.length} serviço(s) finalizado(s)</Badge>
        </div>

        {/* Filtros de status */}
        <Card className="mb-4">
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
                <SelectContent>
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
                <PopoverContent className="w-auto p-0" align="start">
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
                      {s.status !== "completed" && (
                        <Button size="sm" onClick={()=>concluirPagamento(s.id)} className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1"/>Concluir
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
