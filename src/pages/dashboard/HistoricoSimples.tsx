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
import { format } from "date-fns";
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
}

export default function HistoricoSimples() {
  const [servicos, setServicos] = useState<ServicoFinalizado[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<ServicoFinalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  // Filtros
  const [filtroData, setFiltroData] = useState<Date | undefined>(undefined);
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Estados para upload de comprovante
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  
  // Estados para visualização de comprovante
  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);
  const [selectedComprovanteUrl, setSelectedComprovanteUrl] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  useEffect(() => {
    carregarServicosFinalizados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [servicos, filtroData, filtroProfissional, filtroStatusPagamento, filtroStatus]);

  const carregarServicosFinalizados = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (companyError) throw companyError;
      if (!companies) {
        toast.error("Empresa não encontrada");
        return;
      }

      setCompanyId(companies.id);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
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
          clients!inner(name),
          services!inner(name),
          professionals!inner(name)
        `)
        .eq('company_id', companies.id)
        .order('appointment_date', { ascending: false });

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
        comprovante_url: apt.comprovante_url
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

    if (filtroStatus !== "todos") {
      if (filtroStatus === "pago") {
        servicosFiltrados = servicosFiltrados.filter(servico =>
          servico.status === 'completed' && servico.payment_status === 'paid'
        );
      } else if (filtroStatus === "pendente") {
        servicosFiltrados = servicosFiltrados.filter(servico =>
          servico.status === 'completed' && servico.payment_status !== 'paid'
        );
      } else if (filtroStatus === "agendado") {
        servicosFiltrados = servicosFiltrados.filter(servico =>
          servico.status === 'scheduled' || servico.status === 'confirmed'
        );
      }
    }

    if (filtroData) {
      const dataFormatada = format(filtroData, "yyyy-MM-dd");
      servicosFiltrados = servicosFiltrados.filter(servico =>
        servico.appointment_date === dataFormatada
      );
    }

    if (filtroProfissional !== "todos") {
      servicosFiltrados = servicosFiltrados.filter(servico =>
        servico.professional_name.toLowerCase().includes(filtroProfissional.toLowerCase())
      );
    }

    if (filtroStatusPagamento !== "todos") {
      servicosFiltrados = servicosFiltrados.filter(servico =>
        servico.payment_status === filtroStatusPagamento
      );
    }

    setServicosFiltrados(servicosFiltrados);
  };

  const limparFiltros = () => {
    setFiltroData(undefined);
    setFiltroProfissional("todos");
    setFiltroStatusPagamento("todos");
    setFiltroStatus("todos");
  };

  const concluirPagamento = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          payment_status: 'paid'
        })
        .eq('id', appointmentId);

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
        .from('appointments')
        .update({ comprovante_url: url })
        .eq('id', selectedAppointmentId)
        .then(({ error }) => {
          if (error) {
            toast.error("Erro ao salvar comprovante");
          } else {
            toast.success("Comprovante salvo com sucesso!");
            setUploadDialogOpen(false);
            setSelectedAppointmentId(null);
            carregarServicosFinalizados();
          }
        });
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
    if (status === 'completed') {
      if (paymentStatus === 'paid') {
        return <Badge variant="default" className="bg-green-500">Pago</Badge>;
      } else {
        return <Badge variant="destructive">Pendente</Badge>;
      }
    } else if (status === 'scheduled' || status === 'confirmed') {
      return <Badge variant="secondary">Agendado</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'no_local':
        return 'Pagamento Local';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando histórico...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ... seu código de filtros e lista permanece igual ... */}

        {/* Upload comprovante */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Comprovante de Pagamento</DialogTitle>
            </DialogHeader>
            <PaymentProofUpload
              onUploadComplete={handleComprovanteUpload}
              appointmentId={selectedAppointmentId}
            />
          </DialogContent>
        </Dialog>

        {/* Modal comprovante - CORRIGIDO */}
        <ComprovanteModal
          open={comprovanteModalOpen}   // <- CORREÇÃO: antes era isOpen
          onClose={() => setComprovanteModalOpen(false)}
          comprovanteUrl={selectedComprovanteUrl}
          clientName={selectedClientName}
        />
      </div>
    </DashboardLayout>
  );
}
